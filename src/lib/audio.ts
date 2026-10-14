import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { SFX_FILES, SPEECH_FILES, type SfxName } from '@/content/audio-files';

/**
 * One narrator and a handful of sound effects.
 *
 * The narrator speaks one line at a time. `speak` queues lines to play back to back, and a new
 * call replaces whatever was being said, so instructions never talk over each other. Sound
 * effects have their own players and can overlap the voice.
 */

let narrator: AudioPlayer | null = null;
let queue: string[] = [];
let finishQueue: (() => void) | null = null;
// If a line never starts playing (for example, a file that failed to load), skip it rather than
// leaving the game waiting forever.
let started = false;
let watchdog: ReturnType<typeof setTimeout> | null = null;
const START_TIMEOUT_MS = 4000;
const effects = new Map<SfxName, AudioPlayer>();

export async function setUpAudio() {
  // Play even when the phone's silent switch is on: this is a game, and the voice is essential.
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  narrator = createAudioPlayer(null, { updateInterval: 100 });
  narrator.addListener('playbackStatusUpdate', (status) => {
    if (status.playing) started = true;
    if (status.didJustFinish) playNext();
  });
  for (const name of Object.keys(SFX_FILES) as SfxName[]) {
    effects.set(name, createAudioPlayer(SFX_FILES[name]));
  }
}

function playNext() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  const next = queue.shift();
  if (!narrator) return;
  if (!next) {
    const done = finishQueue;
    finishQueue = null;
    done?.();
    return;
  }
  const source = SPEECH_FILES[next];
  if (source === undefined) {
    if (__DEV__) console.warn(`No spoken line "${next}"`);
    playNext();
    return;
  }
  narrator.replace(source);
  narrator.play();
  started = false;
  watchdog = setTimeout(() => {
    if (!started) playNext();
  }, START_TIMEOUT_MS);
}

/** Speaks the given lines in order. Resolves when they finish, or when something else interrupts. */
export function speak(...ids: string[]): Promise<void> {
  stopSpeaking();
  queue = [...ids];
  return new Promise((resolve) => {
    finishQueue = resolve;
    playNext();
  });
}

export function stopSpeaking() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  queue = [];
  narrator?.pause();
  const done = finishQueue;
  finishQueue = null;
  done?.();
}

export function playSfx(name: SfxName) {
  const player = effects.get(name);
  if (!player) return;
  player.seekTo(0).catch(() => undefined);
  player.play();
}

/** A random item, for varying praise and choices. */
export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
