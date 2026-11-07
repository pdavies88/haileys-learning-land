import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Shape } from '@/components/shape';
import { TouchPad } from '@/components/touch-pad';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow, shade } from '@/constants/theme';
import type { SfxName } from '@/content/audio-files';
import { say, type ShapeName } from '@/content/learning';
import { pause, playSfx, prepareSfx, speak } from '@/lib/audio';
import { randomInt } from '@/lib/random';

type Mode = 'colors' | 'shapes';
type Pad = { color: string; note: SfxName; shape?: ShapeName };

// Each pad has its own note, so the pattern can be remembered by ear as well as by eye.
const COLOR_PADS: Pad[] = [
  { color: '#F2545B', note: 'xylo0' },
  { color: '#3B8EF0', note: 'xylo2' },
  { color: '#FFC93C', note: 'xylo4' },
  { color: '#22C17A', note: 'xylo7' },
];
const SHAPE_PADS: Pad[] = [
  { color: '#F2545B', note: 'xylo0', shape: 'heart' },
  { color: '#3B8EF0', note: 'xylo2', shape: 'circle' },
  { color: '#FFC93C', note: 'xylo4', shape: 'star' },
  { color: '#22C17A', note: 'xylo5', shape: 'triangle' },
  { color: '#9B6DE3', note: 'xylo6', shape: 'diamond' },
  { color: '#FF8A3D', note: 'xylo7', shape: 'square' },
];

const START = 2; // steps in the first pattern, right for a five-year-old
const LONGEST = 9;
const LIT_MS = 520;
const GAP_MS = 230;

/** The pads in play: four colors, or shapes (six once the patterns get long). */
const padsFor = (mode: Mode, length: number) => (mode === 'colors' ? COLOR_PADS : SHAPE_PADS.slice(0, length >= 5 ? 6 : 4));

/**
 * Follow me: the pads light up in a pattern, each with its own note, and she taps them back in the
 * same order. Every right answer adds one more step. A wrong tap plays the same pattern again, and
 * two misses on one pattern make the next one a step shorter, so it never stops being playable.
 */
export default function Follow() {
  const [mode, setMode] = useState<Mode>('colors');
  const [pattern, setPattern] = useState<number[]>([]);
  const [entered, setEntered] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [showing, setShowing] = useState(true);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const misses = useRef(0);
  // Goes up whenever a new pattern starts, so a pattern still playing stops.
  const run = useRef(0);
  const { celebrate, overlay } = useCelebration();

  const pads = padsFor(mode, pattern.length);

  const flash = (pad: number, ms: number) => {
    setLit(pad);
    playSfx(pads[pad]?.note ?? 'pop');
    setTimeout(() => setLit((current) => (current === pad ? null : current)), ms);
  };

  /** Plays the pattern, lighting each pad in turn, then hands over to her. */
  const show = async (steps: number[], nextMode: Mode, intro?: Parameters<typeof say.line>[0]) => {
    run.current += 1;
    const on = run.current;
    setShowing(true);
    setEntered(0);
    setPattern(steps);
    if (intro && !(await speak(say.line(intro)))) return;
    await pause(400);
    const playing = padsFor(nextMode, steps.length);
    for (const pad of steps) {
      if (run.current !== on) return;
      setLit(pad);
      playSfx(playing[pad].note);
      await pause(LIT_MS);
      setLit(null);
      await pause(GAP_MS);
    }
    if (run.current !== on) return;
    setShowing(false);
    speak(say.line('followYourTurn'));
  };

  /** A new pattern: one step longer than the last (or a fresh one of the given length). */
  const nextPattern = (from: number[], length: number, nextMode: Mode) => {
    const count = padsFor(nextMode, length).length;
    const steps = from.slice(0, length);
    while (steps.length < length) steps.push(randomInt(0, count - 1));
    return steps;
  };

  const start = (nextMode: Mode) => {
    setMode(nextMode);
    misses.current = 0;
    prepareSfx(...SHAPE_PADS.map((p) => p.note));
    show(nextPattern([], START, nextMode), nextMode, nextMode === 'colors' ? 'followIntro' : 'followShapes');
  };

  useEffect(() => {
    prepareSfx(...SHAPE_PADS.map((p) => p.note));
    speak(say.line('followIntro')).then((spoke) => {
      if (spoke) show(nextPattern([], START, 'colors'), 'colors');
    });
    // Only on arrival.
  }, []);

  const tap = async (pad: number) => {
    if (showing) return;
    flash(pad, 300);
    if (pad !== pattern[entered]) {
      // Wrong: show the same pattern again, or a shorter one after two misses.
      setShowing(true);
      misses.current += 1;
      const length = misses.current >= 2 ? Math.max(START, pattern.length - 1) : pattern.length;
      if (misses.current >= 2) misses.current = 0;
      await speak(say.line('tryAgain'));
      show(length === pattern.length ? pattern : nextPattern([], length, mode), mode);
      return;
    }
    if (entered + 1 < pattern.length) {
      setEntered(entered + 1);
      return;
    }
    // The whole pattern, in order.
    setEntered(pattern.length);
    setShowing(true);
    misses.current = 0;
    await pause(300);
    await celebrate(pattern.length >= 5);
    const length = Math.min(LONGEST, pattern.length + 1);
    show(nextPattern(pattern, length, mode), mode);
  };

  // Pads in a grid as big as the screen allows: two rows of two, or two rows of three.
  const columns = pads.length === 6 ? 3 : 2;
  const rows = 2;
  const padSize = Math.max(80, Math.min((area.width - Spacing.md * (columns + 1)) / columns, (area.height - Spacing.md * (rows + 1)) / rows, 260));

  return (
    <GameScreen
      title="Follow me"
      background="#E4F1FF"
      level={Math.max(0, pattern.length - START)}
      onRepeat={() => !showing && show(pattern, mode)}>
      <View style={styles.body}>
        <View style={styles.modes}>
          {(['colors', 'shapes'] as const).map((m) => (
            <Bouncy key={m} accessibilityLabel={m === 'colors' ? 'Colors' : 'Shapes'} style={[styles.mode, mode === m && styles.modeOn]} onPress={() => mode !== m && start(m)}>
              <Pic name={m === 'colors' ? 'rainbow' : 'star'} size={30} />
              <Txt size={20} weight="heavy" color={mode === m ? Colors.white : Colors.text}>
                {m === 'colors' ? 'Colors' : 'Shapes'}
              </Txt>
            </Bouncy>
          ))}
        </View>

        <View style={styles.steps}>
          {pattern.map((_, i) => (
            <View key={i} style={[styles.step, i < entered && styles.stepDone]} />
          ))}
        </View>

        <View style={styles.area} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {area.width > 0 && (
            <View style={[styles.grid, { width: columns * padSize + (columns - 1) * Spacing.md }]}>
              {pads.map((pad, i) => {
                const on = lit === i;
                return (
                  <TouchPad
                    key={i}
                    label={pad.shape ?? `Pad ${i + 1}`}
                    onTouch={() => tap(i)}
                    style={[
                      styles.pad,
                      { width: padSize, height: padSize, borderRadius: padSize * 0.22 },
                      mode === 'colors'
                        ? { backgroundColor: on ? shade(pad.color, 0.45) : pad.color, borderColor: shade(pad.color, -0.25) }
                        : { backgroundColor: on ? shade(pad.color, 0.7) : Colors.white, borderColor: on ? pad.color : '#E6E1F2' },
                      on && styles.padOn,
                    ]}>
                    {pad.shape ? <Shape shape={pad.shape} color={pad.color} size={padSize * 0.6} /> : <View style={[styles.shine, on && styles.shineOn]} />}
                  </TouchPad>
                );
              })}
            </View>
          )}
        </View>

        <Txt size={20} color={Colors.textSoft}>
          {showing ? 'Watch…' : 'Your turn!'}
        </Txt>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  modes: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.6)', padding: 6, borderRadius: 999 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 56, paddingHorizontal: Spacing.md, borderRadius: 28 },
  modeOn: { backgroundColor: Colors.blue },
  steps: { flexDirection: 'row', gap: 8, minHeight: 18 },
  step: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(59,142,240,0.2)' },
  stepDone: { backgroundColor: Colors.blue },
  area: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center' },
  pad: { alignItems: 'center', justifyContent: 'center', borderWidth: 6, ...cardShadow },
  padOn: { shadowOpacity: 0.35, shadowRadius: 18 },
  shine: { width: '40%', height: '40%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  shineOn: { backgroundColor: 'rgba(255,255,255,0.8)' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
