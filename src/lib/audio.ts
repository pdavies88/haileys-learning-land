import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';

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
 */

let queue: string[] = [];
let waiters: ((finished: boolean) => void)[] = [];
// Loaded line players, least recently used first.
const lines = new Map<string, AudioPlayer>();
const MAX_LOADED = 24;
let current: AudioPlayer | null = null;
// Each line played gets a number. Status events only count once the current line has started.
let clip = 0;
let startedClip = -1;
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

export async function setUpAudio() {
  // Play even when the phone's silent switch is on: this is a game, and the voice is essential.
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  for (const name of Object.keys(SFX_FILES) as SfxName[]) {
    const count = INSTRUMENTS.test(name) ? 4 : 2;
    effects.set(
      name,
      Array.from({ length: count }, () => makeVoice(SFX_FILES[name])),
    );
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
  const player = createAudioPlayer(source, { updateInterval: 100 });
  player.addListener('playbackStatusUpdate', (status) => {
    if (player === current) onStatus(status);
  });
  lines.set(id, player);
  // Unload the least recently used lines, but never one that is playing or waiting to play.
  for (const [oldId, old] of lines) {
    if (lines.size <= MAX_LOADED) break;
    if (old === current || queue.includes(oldId)) continue;
    old.remove();
    lines.delete(oldId);
  }
  return player;
}

/** Loads lines ahead of time, so they start the moment they're spoken. */
export function prepare(...ids: string[]) {
  ids.forEach(playerFor);
}

function onStatus(status: AudioStatus) {
  if (status.playing && startedClip !== clip) {
    // It started: cancel the "never started" timer.
    startedClip = clip;
  }
  if (startedClip !== clip) return;
  position = status.currentTime;
  if (status.didJustFinish) {
    playNext();
    return;
  }
  // If the player never reports the end of this line, move on shortly after it should have ended.
  // Re-armed on every update, so a line that is still playing is never cut off.
  if (status.playing && status.duration > 0) armWatchdog((status.duration - status.currentTime) * 1000 + 1500);
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
  const done = waiters;
  waiters = [];
  done.forEach((resolve) => resolve(finished));
}

function playNext() {
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
  stopSpeaking();
  queue = [...ids];
  prepare(...ids.slice(1));
  return new Promise((resolve) => {
    waiters.push(resolve);
    playNext();
  });
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

function makeVoice(source: number): Voice {
  const voice: Voice = { player: createAudioPlayer(source, { updateInterval: 50 }), ready: true, usedAt: 0 };
  voice.player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) rewind(voice);
  });
  return voice;
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
export function playSfx(name: SfxName) {
  const pool = effects.get(name);
  if (!pool) return;
  const ready = pool.find((v) => v.ready);
  if (ready) {
    ready.ready = false;
    ready.usedAt = Date.now();
    ready.player.play();
    return;
  }
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
