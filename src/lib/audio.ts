import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { useSyncExternalStore } from 'react';

import { SFX_FILES, SPEECH_FILES, type SfxName } from '@/content/audio-files';

/**
 * One narrator and a handful of sound effects.
 *
 * The narrator speaks one line at a time. `speak` replaces whatever was being said with new lines,
 * so instructions never talk over each other. `speakAfter` adds lines to the end instead, for
 * counting out loud while a child taps quickly. Sound effects have their own players and can
 * overlap the voice.
 *
 * Each line gets its own player, kept loaded for a while (most recently used first). Lines that
 * are queued, or `prepare`d ahead, load while the line before them plays, so they start the moment
 * it ends. Swapping files in and out of one shared player made lines start late, cut off or stay
 * silent when children tapped quickly.
 *
 * Children tap fast and leave screens mid-sentence, so the queue is defensive: only the current
 * line's player is listened to, a line that never starts or never reports finishing is skipped by
 * a timer, and `abandonSpeech` (called when a game screen closes) drops pending promises so nothing
 * waiting on them runs after the child has left.
 *
 * Players are kept to a small budget on every platform. Android gives each one its own media
 * session and caps how many an app may hold, so 170 players made it refuse new ones (silent voice,
 * games crashing as they opened). On iOS the same 170 players each sent their status to JavaScript
 * many times a second, which swamped it until the app froze. So: a few lines stay loaded, each
 * sound effect has one or two players, instrument notes load only when a game asks for them
 * (`prepareSfx`), the least recently used players switch to new sounds, and sound effects report
 * their status only a few times a second. A player that can't be created is skipped rather than
 * crashing the game.
 */

let queue: string[] = [];
let waiters: ((finished: boolean) => void)[] = [];
// The lines of the latest `speak`, so mashing the button that said them doesn't start them over.
let spoken: string[] = [];
// Loaded line players, least recently used first.
const lines = new Map<string, AudioPlayer>();
const MAX_LOADED = 10;
let current: AudioPlayer | null = null;
// Each line played gets a number. Status events only count once the current line has started.
let clip = 0;
let startedClip = -1;
// The line being spoken and when it started, to catch lines that end before they could be heard.
let currentId = '';
// Story Shelf books are read a little slower than everything else, for young listeners.
const BOOK_RATE = 0.95;
let rate = 1;
let startedAt = 0;
// How far into the current line the narrator is, in seconds, for following along word by word.
let position = 0;
let watchdog: ReturnType<typeof setTimeout> | null = null;
// Goes up each time a game screen closes, so pauses started on that screen never finish.
let screen = 0;
const START_TIMEOUT_MS = 4000;
// Each sound effect has a few players, so the same sound can play again before it has finished
// (a child mashing a drum). A player rewinds itself as soon as it finishes, ready for the next tap.
type Voice = { player: AudioPlayer; ready: boolean; usedAt: number };
const effects = new Map<SfxName, Voice[]>();
const INSTRUMENTS = /^(xylo\d+|piano\d+|string\d|drum|kick|snare|hihat|tomhi|tomlo|crash|clap|shaker|bell|strum)$/;
const MAX_EFFECT_PLAYERS = 28;
// Sound effects only need to hear that they finished, so they report a few times a second.
const EFFECT_UPDATE_MS = 250;
let effectPlayers = 0;
// Mashed taps fire interface sounds faster than anyone can hear them. A repeat of the same sound
// within a moment, or a fourth sound in half a second, is dropped so they don't pile up into noise.
// Instruments always play, so fast drumming still works.
const lastEffect = new Map<SfxName, number>();
let recentEffects: number[] = [];
const SAME_EFFECT_MS = 150;
const EFFECT_BURST = { count: 3, ms: 500 };

// Whether the narrator is talking. Answer cards rest until a question has been asked, so a child
// listens before she taps. Screens read it with `useTalking`.
let talking = false;
const talkListeners = new Set<() => void>();
function setTalking(next: boolean) {
  if (talking === next) return;
  talking = next;
  talkListeners.forEach((listener) => listener());
}
const subscribeTalking = (listener: () => void) => {
  talkListeners.add(listener);
  return () => {
    talkListeners.delete(listener);
  };
};
/** True while the narrator is speaking. */
export const useTalking = () => useSyncExternalStore(subscribeTalking, () => talking);

/** How many players a sound effect gets, so it can overlap itself. */
const voicesFor = (name: SfxName) => (INSTRUMENTS.test(name) ? 2 : 1);

export async function setUpAudio() {
  // Play even when the phone's silent switch is on: this is a game, and the voice is essential.
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  for (const name of Object.keys(SFX_FILES) as SfxName[]) {
    effects.set(name, []);
    // Only the interface sounds load up front, one player each. Instruments load with their game.
    if (!INSTRUMENTS.test(name)) addVoice(name);
  }
}

/** A player, or null if the system won't make another one. */
function newPlayer(source: number, updateInterval: number): AudioPlayer | null {
  try {
    return createAudioPlayer(source, { updateInterval });
  } catch (error) {
    if (__DEV__) console.warn('Could not load a sound', error);
    return null;
  }
}

/** The player for a line, loading it if needed. Returns null for a line the app doesn't have. */
function playerFor(id: string): AudioPlayer | null {
  const loaded = lines.get(id);
  if (loaded) {
    lines.delete(id);
    lines.set(id, loaded);
    return loaded;
  }
  const source = SPEECH_FILES[id];
  if (source === undefined) {
    if (__DEV__) console.warn(`No spoken line "${id}"`);
    return null;
  }
  // Once enough lines are loaded, the least recently used player (never one playing or waiting to
  // play) takes the new line instead. Android frees a removed player only when JavaScript gets
  // round to garbage-collecting it, so removing old players and making new ones piled them up.
  let player: AudioPlayer | null = null;
  if (lines.size >= MAX_LOADED) {
    for (const [oldId, old] of lines) {
      if (old === current || queue.includes(oldId)) continue;
      lines.delete(oldId);
      old.replace(source);
      player = old;
      break;
    }
  }
  if (!player) {
    const created = newPlayer(source, 100);
    if (!created) return null;
    created.addListener('playbackStatusUpdate', (status) => {
      if (created === current) onStatus(status);
    });
    player = created;
  }
  lines.set(id, player);
  return player;
}

/** Loads lines ahead of time, so they start the moment they're spoken. */
export function prepare(...ids: string[]) {
  ids.forEach(playerFor);
}

function onStatus(status: AudioStatus) {
  // A reused player can still report the end of the line it played last. The new line only counts
  // as started once the player is playing near its beginning, so that stale report can't skip it.
  const fresh = !status.didJustFinish && status.currentTime < Math.max(0.5, status.duration - 0.25);
  if (status.playing && startedClip !== clip && fresh) {
    // It started: cancel the "never started" timer.
    startedClip = clip;
    startedAt = Date.now();
  }
  if (startedClip !== clip) return;
  position = status.currentTime;
  if (status.didJustFinish) {
    playNext();
    return;
  }
  // If the player never reports the end of this line, move on shortly after it should have ended.
  // Re-armed on every update, so a line that is still playing is never cut off.
  if (status.playing && status.duration > 0) armWatchdog(((status.duration - status.currentTime) * 1000) / rate + 1500);
}

/** Seconds into the line being spoken right now (0 before it starts). */
export function speechPosition() {
  return startedClip === clip ? position : 0;
}

function armWatchdog(ms: number) {
  if (watchdog) clearTimeout(watchdog);
  const forClip = clip;
  watchdog = setTimeout(() => {
    if (clip === forClip) playNext();
  }, ms);
}

function finish(finished: boolean) {
  setTalking(false);
  const done = waiters;
  waiters = [];
  done.forEach((resolve) => resolve(finished));
}

function playNext() {
  if (__DEV__ && current && startedClip === clip && Date.now() - startedAt < 250) {
    console.warn(`Spoken line "${currentId}" ended after ${Date.now() - startedAt}ms`);
  }
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  current?.pause();
  current = null;
  clip += 1;
  position = 0;
  const next = queue.shift();
  if (!next) {
    finish(true);
    return;
  }
  const player = playerFor(next);
  if (!player) {
    playNext();
    return;
  }
  current = player;
  currentId = next;
  // Players are reused, so every line sets its speed.
  rate = next.startsWith('book-') ? BOOK_RATE : 1;
  player.shouldCorrectPitch = true;
  player.setPlaybackRate(rate, 'high');
  setTalking(true);
  const forClip = clip;
  if (player.currentTime > 0.05) {
    // Played before: rewind first.
    player
      .seekTo(0)
      .catch(() => undefined)
      .finally(() => {
        if (clip === forClip) player.play();
      });
  } else {
    player.play();
  }
  // A line that never starts playing (for example, a file that failed to load) is skipped.
  armWatchdog(START_TIMEOUT_MS);
}

const speaking = () => waiters.length > 0 || queue.length > 0;

/**
 * Speaks the given lines in order, replacing anything already being said. Resolves `true` when
 * they finish, or `false` if something else interrupts them.
 */
export function speak(...ids: string[]): Promise<boolean> {
  // Mashing the button that said these lines would start them over and over: while they are still
  // being said, wait for them instead.
  if (current && ids.length === spoken.length && ids.every((id, i) => id === spoken[i])) {
    return new Promise((resolve) => waiters.push(resolve));
  }
  stopSpeaking();
  spoken = ids;
  queue = [...ids];
  prepare(...ids.slice(1));
  return new Promise((resolve) => {
    waiters.push(resolve);
    playNext();
  });
}

/**
 * For sound boards: lets the line being said finish, then says this one. Only the newest tap waits,
 * so quick taps never chop words in half and a toddler mashing tiles never builds up a long queue.
 */
export function speakNext(id: string): Promise<boolean> {
  if (!current) return speak(id);
  queue = [id];
  prepare(id);
  return new Promise((resolve) => waiters.push(resolve));
}

/** Adds lines after whatever is being said. Resolves when everything queued has been spoken. */
export function speakAfter(...ids: string[]): Promise<boolean> {
  if (!speaking()) return speak(...ids);
  queue.push(...ids);
  prepare(...ids);
  return new Promise((resolve) => waiters.push(resolve));
}

export function stopSpeaking() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  clip += 1;
  queue = [];
  current?.pause();
  current = null;
  finish(false);
}

/**
 * Stops speaking and drops everything waiting on the voice without resolving it, so code that was
 * waiting to celebrate or ask the next question never runs. Called when a game screen closes.
 */
export function abandonSpeech() {
  waiters = [];
  screen += 1;
  stopSpeaking();
}

/**
 * Waits `ms` milliseconds. Like the voice, it never resolves if the game screen closes first, so
 * code waiting on it (the next question, the next page) can't run after the child has left.
 */
export function pause(ms: number): Promise<void> {
  const on = screen;
  return new Promise((resolve) => {
    setTimeout(() => {
      if (screen === on) resolve();
    }, ms);
  });
}

/**
 * Adds a player for a sound effect. Once the budget is full, the least recently used idle player of
 * another sound switches to this one, so the number of players never grows (see `playerFor`).
 */
function addVoice(name: SfxName): Voice | null {
  const voice = effectPlayers < MAX_EFFECT_PLAYERS ? newVoice(name) : reuseIdleVoice(name);
  if (voice) effects.get(name)?.push(voice);
  return voice;
}

function newVoice(name: SfxName): Voice | null {
  const player = newPlayer(SFX_FILES[name], EFFECT_UPDATE_MS);
  if (!player) return null;
  const voice: Voice = { player, ready: true, usedAt: 0 };
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) rewind(voice);
  });
  effectPlayers += 1;
  return voice;
}

function reuseIdleVoice(name: SfxName): Voice | null {
  let oldest: { pool: Voice[]; voice: Voice } | null = null;
  for (const [other, pool] of effects) {
    if (other === name) continue;
    for (const voice of pool) {
      if (voice.ready && (!oldest || voice.usedAt < oldest.voice.usedAt)) oldest = { pool, voice };
    }
  }
  if (!oldest) return null;
  const { pool, voice } = oldest;
  pool.splice(pool.indexOf(voice), 1);
  voice.player.replace(SFX_FILES[name]);
  voice.usedAt = 0;
  return voice;
}

/** Loads sound effects ahead of time, so they play the moment they're touched (instrument notes). */
export function prepareSfx(...names: SfxName[]) {
  for (const name of names) if (!effects.get(name)?.length) addVoice(name);
}

function rewind(voice: Voice) {
  voice.ready = false;
  voice.player.pause();
  voice.player
    .seekTo(0)
    .catch(() => undefined)
    .finally(() => {
      voice.ready = true;
    });
}

/** Plays a sound effect at once, even if the same sound is still playing. */
export function playSfx(name: SfxName, { always = false } = {}) {
  const pool = effects.get(name);
  if (!pool) return;
  // `always` skips the mash filter, for games where fast tapping is the point (bubble wrap).
  if (!always && !INSTRUMENTS.test(name)) {
    const now = Date.now();
    recentEffects = recentEffects.filter((at) => now - at < EFFECT_BURST.ms);
    if (now - (lastEffect.get(name) ?? 0) < SAME_EFFECT_MS || recentEffects.length >= EFFECT_BURST.count) return;
    lastEffect.set(name, now);
    recentEffects.push(now);
  }
  const ready = pool.find((v) => v.ready) ?? (pool.length < voicesFor(name) ? addVoice(name) : null);
  if (ready) {
    ready.ready = false;
    ready.usedAt = Date.now();
    ready.player.play();
    // Ready again the moment it ends. Waiting for the next status report (a few times a second)
    // left fast taps finding every player busy, and the restart that follows plays a beat late.
    const ms = (ready.player.duration || 1) * 1000 + 30;
    const playedAt = ready.usedAt;
    setTimeout(() => {
      // Only if nothing has played on it since; a restarted note mustn't be cut off.
      if (!ready.ready && ready.usedAt === playedAt) rewind(ready);
    }, ms);
    return;
  }
  if (pool.length === 0) return;
  // Every player is busy: restart the one that started longest ago.
  const oldest = pool.reduce((a, b) => (a.usedAt <= b.usedAt ? a : b));
  oldest.usedAt = Date.now();
  oldest.player
    .seekTo(0)
    .catch(() => undefined)
    .finally(() => oldest.player.play());
}

/** A random item, for varying praise and choices. */
export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
