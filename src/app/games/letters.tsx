/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { Canvas, DashPathEffect, Path, Skia, useFont, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { BounceIn, FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, cardShadow } from '@/constants/theme';
import { LETTERS, LINES, TRACE_NUMBERS, TRACE_WORDS, say } from '@/content/learning';
import { pause, speak } from '@/lib/audio';

const RAINBOW = ['#FF5C8A', '#FF9F43', '#FFD23F', '#3CC47C', '#4D9DE0', '#9B6DE3'];
const DONE_AT = 0.9; // fraction of the shape that must be painted over
// Every part must be painted too, so a small piece (the bar of an A) can't be skipped: the shape is
// split into squares of this size and each square needs most of its points covered.
const PART = 0.2; // of the font size
const PART_DONE_AT = 0.6;
// The marker is a little wider than the strokes of the font, so one line along a stroke paints it.
const MARKER = 0.17; // of the font size
const NEXT_AFTER_MS = 1500;

type Kind = 'upper' | 'lower' | 'number' | 'word';
type Point = { x: number; y: number };

const KINDS: { id: Kind; label: string; pick: keyof typeof LINES }[] = [
  { id: 'upper', label: 'ABC', pick: 'tracePickLetter' },
  { id: 'lower', label: 'abc', pick: 'tracePickLetter' },
  { id: 'number', label: '123', pick: 'tracePickNumber' },
  { id: 'word', label: 'Words', pick: 'tracePickWord' },
];

const count = (kind: Kind) => (kind === 'number' ? TRACE_NUMBERS.length : kind === 'word' ? TRACE_WORDS.length : LETTERS.length);

/** What to trace: the text, what to say first, and what to say once it's done. */
function item(kind: Kind, index: number) {
  if (kind === 'number') {
    const n = TRACE_NUMBERS[index];
    return { text: String(n), intro: say.traceNumber(n), done: say.number(n) };
  }
  if (kind === 'word') {
    const w = TRACE_WORDS[index];
    return { text: w, intro: say.traceWord(w), done: say.word(w) };
  }
  const l = LETTERS[index];
  return kind === 'upper'
    ? { text: l.upper, intro: say.traceUpper(l), done: say.letterIsFor(l) }
    : { text: l.lower, intro: say.traceLower(l), done: say.letterIsFor(l) };
}

/** Points spread evenly inside the shape. Tracing "covers" the ones near her finger. */
function samplePoints(path: SkPath, step: number): Point[] {
  const bounds = path.computeTightBounds();
  const points: Point[] = [];
  for (let y = bounds.y + step / 2; y < bounds.y + bounds.height; y += step) {
    for (let x = bounds.x + step / 2; x < bounds.x + bounds.width; x += step) {
      if (path.contains(x, y)) points.push({ x, y });
    }
  }
  return points;
}

/**
 * Magic letters: trace uppercase and lowercase letters, the numbers 1 to 20 and short sight words.
 * The four buttons along the top each open a grid to pick from. A shape is finished when nearly
 * all of it is painted and the finger lifts; it then comes alive and the next one follows.
 */
export default function Letters() {
  // The finger handlers below only run on touches, but React Compiler can't tell that from a gesture
  // builder. This screen redraws on every move anyway, so it opts out of the compiler.
  'use no memo';
  const [kind, setKind] = useState<Kind>('upper');
  const [index, setIndex] = useState(0);
  const [picking, setPicking] = useState<Kind | null>(null);
  const [size, setSize] = useState(0);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [covered, setCovered] = useState(0);
  const [done, setDone] = useState(false);
  const coveredSet = useRef(new Set<number>());
  const fractionRef = useRef(0);
  const lastPoint = useRef<Point | null>(null);
  const nudged = useRef(false);
  const finished = useRef(false);
  // Goes up whenever a new shape is chosen, so a pending "next one" doesn't jump over her choice.
  const turn = useRef(0);
  const { celebrate, overlay } = useCelebration();
  const base = size * 0.8 || 1;
  // Regular weight: its strokes are thin enough for one finger-wide line to cover them.
  const font = useFont(require('@expo-google-fonts/fredoka/400Regular/Fredoka_400Regular.ttf'), base);

  const current = item(kind, index);

  // The shape, scaled to fit and centered in the drawing area, and the points she needs to cover.
  let glyph: SkPath | null = null;
  let targets: Point[] = [];
  let fontSize = base;
  if (font && size > 0) {
    const raw = Skia.Path.MakeFromText(current.text, 0, 0, font);
    if (raw) {
      const b = raw.computeTightBounds();
      // Long words shrink to fit; single letters keep the full size.
      const k = Math.min(1, (size * 0.86) / b.width, (size * 0.8) / b.height);
      fontSize = base * k;
      const tx = size / 2 - (b.x + b.width / 2) * k;
      const ty = size / 2 - (b.y + b.height / 2) * k;
      glyph = Skia.PathBuilder.MakeFromPath(raw).transform([k, 0, tx, 0, k, ty, 0, 0, 1]).build();
      targets = samplePoints(glyph, fontSize / 30);
    }
  }
  // The marker's width. A point counts as traced once the finger passes close enough to it,
  // a little beyond the visible ink to allow for wobbly lines.
  const strokeWidth = fontSize * MARKER;
  const radius = strokeWidth * 0.62;

  useEffect(() => {
    speak(say.line('traceIntro'), current.intro);
    // Only on arrival; each new shape announces itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (nextKind: Kind, nextIndex: number) => {
    turn.current += 1;
    setKind(nextKind);
    setIndex(nextIndex);
    setPicking(null);
    setStrokes([]);
    setCovered(0);
    setDone(false);
    coveredSet.current = new Set();
    fractionRef.current = 0;
    nudged.current = false;
    finished.current = false;
    speak(item(nextKind, nextIndex).intro);
  };

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    setDone(true);
    const on = turn.current;
    celebrate(false);
    await speak(current.done);
    await pause(NEXT_AFTER_MS);
    if (turn.current === on) choose(kind, (index + 1) % count(kind));
  };

  /** True when every part of the shape has most of its points covered. */
  const allParts = () => {
    const cell = fontSize * PART;
    const parts = new Map<string, { all: number; hit: number }>();
    targets.forEach((p, i) => {
      const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
      const part = parts.get(key) ?? { all: 0, hit: 0 };
      part.all += 1;
      if (coveredSet.current.has(i)) part.hit += 1;
      parts.set(key, part);
    });
    return [...parts.values()].every((part) => part.all < 4 || part.hit / part.all >= PART_DONE_AT);
  };

  const cover = (x: number, y: number) => {
    targets.forEach((p, i) => {
      if (!coveredSet.current.has(i) && (p.x - x) ** 2 + (p.y - y) ** 2 < radius * radius) coveredSet.current.add(i);
    });
  };

  const touch = (x: number, y: number, start: boolean) => {
    if (done) return;
    setStrokes((s) => (start ? [...s, [{ x, y }]] : [...s.slice(0, -1), [...(s[s.length - 1] ?? []), { x, y }]]));
    // Fill in between touch points, so a quick swipe counts everywhere the line is drawn.
    const from = start ? null : lastPoint.current;
    const steps = from ? Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (radius * 0.5))) : 1;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      cover(from ? from.x + (x - from.x) * t : x, from ? from.y + (y - from.y) * t : y);
    }
    lastPoint.current = { x, y };
    fractionRef.current = targets.length ? coveredSet.current.size / targets.length : 0;
    setCovered(fractionRef.current);
  };

  // The shape is finished only when the finger lifts with nearly all of it painted, never mid-stroke.
  const lift = () => {
    lastPoint.current = null;
    if (done) return;
    if (fractionRef.current >= DONE_AT && allParts()) {
      finish();
    } else if (!nudged.current && fractionRef.current > 0.25) {
      nudged.current = true;
      speak(say.line('traceKeepGoing'));
    }
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => touch(e.x, e.y, true))
    .onUpdate((e) => touch(e.x, e.y, false))
    .onFinalize(() => lift());

  const open = (k: Kind) => {
    setPicking(k);
    speak(say.line(KINDS.find((x) => x.id === k)!.pick));
  };

  const letter = LETTERS[index];
  let reward = null;
  if (done) {
    reward =
      kind === 'number' ? (
        <>
          <Txt size={size * 0.26} weight="heavy" color={Colors.purpleDark}>
            {current.text}
          </Txt>
          <View style={[styles.stars, { maxWidth: size * 0.8 }]}>
            {Array.from({ length: Number(current.text) }, (_, i) => (
              <Animated.View key={i} entering={ZoomIn.delay(i * 40)}>
                <Pic name="star" size={Math.min(size * 0.08, 40)} />
              </Animated.View>
            ))}
          </View>
        </>
      ) : kind === 'word' ? (
        <>
          <Pic name="sparkles" size={size * 0.22} />
          <Txt size={size * 0.2} weight="heavy" color={Colors.purpleDark}>
            {current.text}
          </Txt>
        </>
      ) : (
        <>
          <Pic name={letter.word} size={size * 0.5} />
          <Txt size={size * 0.09} weight="heavy" color={Colors.purpleDark}>
            {letter.upper === 'X' ? `${current.text} is in fox` : `${current.text} is for ${letter.word}`}
          </Txt>
        </>
      );
  }

  return (
    <GameScreen title="Magic letters" background="#FFE8F3" onRepeat={() => speak(picking ? say.line(KINDS.find((x) => x.id === picking)!.pick) : current.intro)}>
      <View style={styles.body}>
        <View style={styles.kinds}>
          {KINDS.map((k) => (
            <Bouncy key={k.id} accessibilityLabel={k.id === 'upper' ? 'Uppercase letters' : k.id === 'lower' ? 'Lowercase letters' : k.id === 'number' ? 'Numbers' : 'Words'} style={[styles.kind, kind === k.id && styles.kindOn]} onPress={() => open(k.id)}>
              <Txt size={22} weight="heavy" color={kind === k.id ? Colors.white : Colors.pink}>
                {k.label}
              </Txt>
            </Bouncy>
          ))}
        </View>

        <View style={styles.area} onLayout={(e: LayoutChangeEvent) => setSize(Math.floor(Math.min(e.nativeEvent.layout.width - Spacing.md * 2, e.nativeEvent.layout.height - 40)))}>
          {size > 0 && (
            <GestureDetector gesture={pan}>
              <View style={[styles.paper, { width: size, height: size }]}>
                <Canvas style={{ width: size, height: size }}>
                  {glyph && <Path path={glyph} color="#F7E3F7" />}
                  {glyph && (
                    <Path path={glyph} color="#C9A2E8" style="stroke" strokeWidth={3}>
                      <DashPathEffect intervals={[12, 9]} />
                    </Path>
                  )}
                  {strokes.map((stroke, i) => {
                    const builder = Skia.PathBuilder.Make();
                    stroke.forEach((p, j) => (j === 0 ? builder.moveTo(p.x, p.y) : builder.lineTo(p.x, p.y)));
                    if (stroke.length === 1) builder.lineTo(stroke[0].x + 0.1, stroke[0].y);
                    return (
                      <Path
                        key={i}
                        path={builder.build()}
                        color={RAINBOW[i % RAINBOW.length]}
                        style="stroke"
                        strokeWidth={strokeWidth}
                        strokeCap="round"
                        strokeJoin="round"
                        opacity={0.9}
                      />
                    );
                  })}
                </Canvas>
                {reward && (
                  <Animated.View entering={BounceIn.duration(700)} exiting={ZoomOut} style={styles.reward} pointerEvents="none">
                    {reward}
                  </Animated.View>
                )}
              </View>
            </GestureDetector>
          )}
          <View style={styles.footer}>
            <View style={styles.meter}>
              <View style={[styles.meterFill, { width: `${Math.min(allParts() ? 100 : 90, (covered / DONE_AT) * 100)}%` }]} />
            </View>
            <Bouncy accessibilityLabel="Start over" style={styles.small} onPress={() => choose(kind, index)}>
              <Pic name="eraser" size={30} />
            </Bouncy>
          </View>
        </View>
      </View>

      {picking && (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.pickerScrim}>
          <View style={styles.picker}>
            <View style={styles.pickerTop}>
              <Txt size={22} weight="heavy" color={Colors.purpleDark}>
                {picking === 'number' ? 'Pick a number' : picking === 'word' ? 'Pick a word' : 'Pick a letter'}
              </Txt>
              <Bouncy accessibilityLabel="Close" style={styles.close} onPress={() => setPicking(null)}>
                <Txt size={22} weight="heavy" color={Colors.textSoft}>
                  ✕
                </Txt>
              </Bouncy>
            </View>
            <ScrollView contentContainerStyle={styles.grid}>
              {Array.from({ length: count(picking) }, (_, i) => {
                const text = item(picking, i).text;
                const on = picking === kind && i === index;
                return (
                  <Bouncy key={i} accessibilityLabel={`Trace ${text}`} style={[styles.tile, picking === 'word' && styles.tileWide, on && styles.tileOn]} onPress={() => choose(picking, i)}>
                    <Txt size={picking === 'word' ? 26 : 32} weight="heavy" color={on ? Colors.white : Colors.text}>
                      {text}
                    </Txt>
                  </Bouncy>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>
      )}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  kinds: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.6)', padding: 6, borderRadius: 999 },
  kind: { minWidth: 76, height: 56, paddingHorizontal: Spacing.md, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  kindOn: { backgroundColor: Colors.pink },
  area: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  paper: { backgroundColor: Colors.white, borderRadius: 32, overflow: 'hidden', ...cardShadow },
  reward: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.85)' },
  stars: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, width: '80%' },
  meter: { flex: 1, height: 14, borderRadius: 7, backgroundColor: 'rgba(155,109,227,0.18)', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 7, backgroundColor: Colors.purple },
  small: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  pickerScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(60,30,80,0.35)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  picker: { backgroundColor: '#FFF7FB', borderRadius: Radius.lg, padding: Spacing.md, width: '100%', maxWidth: 720, maxHeight: '88%', gap: Spacing.sm, ...cardShadow },
  pickerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, paddingBottom: Spacing.sm },
  tile: { width: 68, height: 68, borderRadius: 20, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  tileWide: { width: 92 },
  tileOn: { backgroundColor: Colors.pink },
});
