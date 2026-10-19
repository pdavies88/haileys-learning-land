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
 * Children tap fast and leave screens mid-sentence, so the queue is defensive: events left over
 * from the previous clip are ignored, a clip that never starts or never reports finishing is
 * skipped by a timer, and `abandonSpeech` (called when a game screen closes) drops pending
 * promises so nothing waiting on them runs after the child has left.
 */

let narrator: AudioPlayer | null = null;
let queue: string[] = [];
let waiters: ((finished: boolean) => void)[] = [];
// Each clip gets a number. Status events only count once the current clip has started playing.
let clip = 0;
let startedClip = -1;
let endTimerClip = -1;
// How far into the current clip the narrator is, in seconds, for following along word by word.
let position = 0;
let replacedAt = 0;
let watchdog: ReturnType<typeof setTimeout> | null = null;
const START_TIMEOUT_MS = 4000;
// Events within this long after switching clips can belong to the clip that was just replaced.
const STALE_EVENT_MS = 150;
// Each sound effect has a few players, so the same sound can play again before it has finished
// (a child mashing a drum). A player rewinds itself as soon as it finishes, ready for the next tap.
type Voice = { player: AudioPlayer; ready: boolean; usedAt: number };
const effects = new Map<SfxName, Voice[]>();
const INSTRUMENTS = /^(xylo\d|drum|clap|shaker|bell|strum)$/;

export async function setUpAudio() {
  // Play even when the phone's silent switch is on: this is a game, and the voice is essential.
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  narrator = createAudioPlayer(null, { updateInterval: 100 });
  narrator.addListener('playbackStatusUpdate', onStatus);
  for (const name of Object.keys(SFX_FILES) as SfxName[]) {
    const count = INSTRUMENTS.test(name) ? 4 : 2;
    effects.set(
      name,
      Array.from({ length: count }, () => makeVoice(SFX_FILES[name])),
    );
  }
}

function onStatus(status: AudioStatus) {
  if (Date.now() - replacedAt < STALE_EVENT_MS) return;
  if (status.playing && startedClip !== clip) {
    // It started: cancel the "never started" timer.
    startedClip = clip;
    if (watchdog) clearTimeout(watchdog);
    watchdog = null;
  }
  // If the player never reports the end of this clip, move on shortly after it should have ended.
  if (startedClip === clip && endTimerClip !== clip && status.duration > 0) {
    endTimerClip = clip;
    armWatchdog((status.duration - status.currentTime) * 1000 + 1200);
  }
  if (startedClip === clip) position = status.currentTime;
  if (status.didJustFinish && startedClip === clip) playNext();
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
  clip += 1;
  position = 0;
  const next = queue.shift();
  if (!narrator) return;
  if (!next) {
    finish(true);
    return;
  }
  const source = SPEECH_FILES[next];
  if (source === undefined) {
    if (__DEV__) console.warn(`No spoken line "${next}"`);
    playNext();
    return;
  }
  replacedAt = Date.now();
  narrator.replace(source);
  narrator.play();
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
  return new Promise((resolve) => {
    waiters.push(resolve);
    playNext();
  });
}

/** Adds lines after whatever is being said. Resolves when everything queued has been spoken. */
export function speakAfter(...ids: string[]): Promise<boolean> {
  if (!speaking()) return speak(...ids);
  queue.push(...ids);
  return new Promise((resolve) => waiters.push(resolve));
}

export function stopSpeaking() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  clip += 1;
  queue = [];
  narrator?.pause();
  finish(false);
}

/**
 * Stops speaking and drops everything waiting on the voice without resolving it, so code that was
 * waiting to celebrate or ask the next question never runs. Called when a game screen closes.
 */
export function abandonSpeech() {
  waiters = [];
  stopSpeaking();
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
