/* eslint-disable react-hooks/refs, react-hooks/purity -- the flagged code runs in finger handlers handed
 to a gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { Canvas, Circle, DashPathEffect, Line, Path, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { BASELINE, MIDDLE, TAIL, TOP, glyphFor } from '@/content/strokes';
import { pause, playSfx, speak } from '@/lib/audio';

const RAINBOW = ['#FF5C8A', '#FF9F43', '#FFD23F', '#3CC47C', '#4D9DE0', '#9B6DE3'];
const GAP = 24; // between the letters of a word, in grid units
const SAMPLE = 1; // grid units between the points measured along each stroke
const NEAR = 15; // how far from the line her finger may stray, in grid units
const AHEAD = 30; // how far along the line one finger move may jump, in grid units
const DEMO_SPEED = 110; // grid units per second when showing how to write it
const NEXT_AFTER_MS = 1500;
const HINT_EVERY_MS = 4000;

type Kind = 'upper' | 'lower' | 'number' | 'word';
type Point = { x: number; y: number };
/** One stroke, measured into points in grid units. A dot has a single point. */
type Stroke = { points: Point[]; dot: boolean };

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

/**
 * The strokes of a letter, number or word in writing order, laid out side by side in grid units,
 * with the width they take and whether anything hangs below the baseline.
 */
function layout(text: string) {
  const strokes: Stroke[] = [];
  let x = 0;
  let tail = false;
  for (const char of text) {
    const glyph = glyphFor(char);
    if (!glyph) continue;
    for (const d of glyph.strokes) {
      const points: Point[] = [];
      const path = Skia.Path.MakeFromSVGString(d);
      const contours = path ? Skia.ContourMeasureIter(path, false, 1) : null;
      for (let contour = contours?.next(); contour; contour = contours?.next()) {
        const length = contour.length();
        for (let at = 0; at < length + SAMPLE; at += SAMPLE) {
          const [pos] = contour.getPosTan(Math.min(at, length));
          points.push({ x: pos.x + x, y: pos.y });
        }
      }
      if (points.length === 0) {
        // Only a starting point: a dot.
        const [, sx, sy] = d.match(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/) ?? [];
        points.push({ x: Number(sx) + x, y: Number(sy) });
      }
      if (points.some((p) => p.y > BASELINE + 5)) tail = true;
      strokes.push({ points, dot: points.length === 1 });
    }
    x += glyph.w + GAP;
  }
  return { strokes, width: Math.max(1, x - GAP), tail };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** A line through the first `to` points, for drawing. */
function polyline(points: Point[], to = points.length): SkPath {
  const builder = Skia.PathBuilder.Make();
  points.slice(0, Math.max(1, to)).forEach((p, i) => (i === 0 ? builder.moveTo(p.x, p.y) : builder.lineTo(p.x, p.y)));
  if (to <= 1) builder.lineTo(points[0].x + 0.1, points[0].y);
  return builder.build();
}

/**
 * Magic letters: learn to write uppercase and lowercase letters, the numbers 1 to 20 and short
 * sight words, stroke by stroke. Each one starts with a demonstration: a pen draws every stroke in
 * order. Then it's her turn. A green dot marks where the next stroke starts and an arrow shows the
 * way. Her line only counts while it follows the stroke forward from the dot, so scribbling doesn't
 * finish it; straying off the line stops the stroke at the dot, and she carries on from there.
 */
export default function Letters() {
  // The finger handlers below only run on touches, but React Compiler can't tell that from a gesture
  // builder. This screen redraws on every move anyway, so it opts out of the compiler.
  'use no memo';
  const [kind, setKind] = useState<Kind>('upper');
  const [index, setIndex] = useState(0);
  const [picking, setPicking] = useState<Kind | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // Which stroke she is on, and how far along it (an index into its points).
  const [stroke, setStroke] = useState(0);
  const [progress, setProgress] = useState(0);
  // The demonstration: the stroke being drawn and how far, or null when it's her turn.
  const [demo, setDemo] = useState<{ stroke: number; progress: number } | null>({ stroke: 0, progress: 0 });
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState(0);
  const tracing = useRef(false);
  const lastHint = useRef(0);
  // Goes up whenever a new shape is chosen, so a pending demonstration or "next one" stops.
  const turn = useRef(0);
  const { celebrate, overlay } = useCelebration();

  const current = item(kind, index);
  const shape = useMemo(() => layout(current.text), [current.text]);
  const strokes = shape.strokes;

  // Fit the shape and its handwriting lines in the drawing area.
  const top = TOP - 12;
  const bottom = (shape.tail ? TAIL : BASELINE) + 12;
  const scale = area.width > 0 ? Math.min((area.width * 0.86) / Math.max(shape.width, 100), (area.height * 0.84) / (bottom - top)) : 1;
  const offsetX = area.width / 2 - (shape.width / 2) * scale;
  const offsetY = area.height / 2 - ((top + bottom) / 2) * scale;
  const toGrid = (x: number, y: number): Point => ({ x: (x - offsetX) / scale, y: (y - offsetY) / scale });
  const screenStrokes = useMemo(
    () => strokes.map((s) => s.points.map((p) => ({ x: offsetX + p.x * scale, y: offsetY + p.y * scale }))),
    [strokes, scale, offsetX, offsetY],
  );
  const ink = Math.max(10, 11 * scale);

  /** Shows how to write it: a pen draws each stroke in order. Then it's her turn. */
  const showMe = async (on: number, demoStrokes: Stroke[]) => {
    await speak(say.line('traceWatch'));
    for (let s = 0; s < demoStrokes.length; s++) {
      const points = demoStrokes[s].points;
      const ms = Math.max(250, ((points.length * SAMPLE) / DEMO_SPEED) * 1000);
      const started = Date.now();
      while (turn.current === on) {
        const t = Math.min(1, (Date.now() - started) / ms);
        setDemo({ stroke: s, progress: Math.round(t * (points.length - 1)) });
        if (t >= 1) break;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      if (turn.current !== on) return;
      await pause(300);
    }
    if (turn.current !== on) return;
    setDemo(null);
    speak(say.line('traceYourTurn'));
  };

  /** Says what to trace, then shows how. */
  const introduce = async (on: number, next: ReturnType<typeof item>, intro: boolean) => {
    const spoke = await speak(...(intro ? [say.line('traceIntro')] : []), next.intro);
    if (spoke && turn.current === on) showMe(on, layout(next.text).strokes);
  };

  const begin = (nextKind: Kind, nextIndex: number) => {
    turn.current += 1;
    setKind(nextKind);
    setIndex(nextIndex);
    setPicking(null);
    setStroke(0);
    setProgress(0);
    setDone(false);
    setDemo({ stroke: 0, progress: 0 });
    tracing.current = false;
    introduce(turn.current, item(nextKind, nextIndex), false);
  };

  useEffect(() => {
    introduce(turn.current, item('upper', 0), true);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    setDone(true);
    const on = turn.current;
    celebrate(false);
    await speak(current.done);
    await pause(NEXT_AFTER_MS);
    if (turn.current === on) begin(kind, (index + 1) % count(kind));
  };

  const nextStroke = () => {
    tracing.current = false;
    playSfx('pop');
    if (stroke + 1 >= strokes.length) {
      setStroke(strokes.length);
      finish();
    } else {
      setStroke(stroke + 1);
      setProgress(0);
    }
  };

  /** Points at the green dot, with a word now and then. */
  const nudge = (line: 'traceStartDot' | 'traceFollow') => {
    setHint((h) => h + 1);
    if (Date.now() - lastHint.current > HINT_EVERY_MS) {
      lastHint.current = Date.now();
      speak(say.line(line));
    }
  };

  const down = (x: number, y: number) => {
    if (done || stroke >= strokes.length) return;
    if (demo) {
      // A touch during the demonstration skips it.
      turn.current += 1;
      setDemo(null);
      return;
    }
    const s = strokes[stroke];
    if (distance(toGrid(x, y), s.points[progress]) > NEAR * 1.4) {
      nudge('traceStartDot');
      return;
    }
    if (s.dot) {
      nextStroke();
      return;
    }
    tracing.current = true;
  };

  const move = (x: number, y: number) => {
    if (!tracing.current) return;
    const points = strokes[stroke].points;
    const finger = toGrid(x, y);
    // The closest point a little way ahead along the line. Looking only ahead, never anywhere on
    // the shape, means she has to follow the stroke in the right direction.
    let best = progress;
    let bestDistance = Infinity;
    const end = Math.min(points.length - 1, progress + Math.round(AHEAD / SAMPLE));
    for (let i = progress; i <= end; i++) {
      const d = distance(finger, points[i]);
      if (d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    }
    if (bestDistance > NEAR * 1.6) {
      tracing.current = false;
      nudge('traceFollow');
      return;
    }
    if (bestDistance <= NEAR && best > progress) {
      setProgress(best);
      if (best >= points.length - 1 - Math.round(4 / SAMPLE)) nextStroke();
    }
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => down(e.x, e.y))
    .onUpdate((e) => move(e.x, e.y))
    .onFinalize(() => {
      tracing.current = false;
    });

  const open = (k: Kind) => {
    setPicking(k);
    speak(say.line(KINDS.find((x) => x.id === k)!.pick));
  };

  const watchAgain = () => {
    if (done) return;
    turn.current += 1;
    setStroke(0);
    setProgress(0);
    setDemo({ stroke: 0, progress: 0 });
    tracing.current = false;
    showMe(turn.current, strokes);
  };

  const letter = LETTERS[index];
  const size = Math.min(area.width, area.height);
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

  // What the canvas shows: handwriting lines, the road to follow, finished strokes in rainbow
  // colors, the stroke in progress, and the dot and arrow that show where to go next.
  const lineY = (y: number) => offsetY + y * scale;
  const lineFrom = Math.max(8, offsetX - 40 * scale);
  const lineTo = Math.min(area.width - 8, offsetX + (shape.width + 40) * scale);
  const showing = demo ?? { stroke, progress };
  const active = screenStrokes[showing.stroke];
  // The arrow sits a little way ahead of the dot, pointing along the stroke.
  const arrowAt = active ? Math.min(active.length - 1, showing.progress + Math.round(18 / SAMPLE)) : 0;
  const canvas = area.width > 0 && (
    <Canvas style={{ width: area.width, height: area.height }}>
      <Line p1={vec(lineFrom, lineY(TOP))} p2={vec(lineTo, lineY(TOP))} color="#D8C8EC" strokeWidth={2} />
      <Line p1={vec(lineFrom, lineY(MIDDLE))} p2={vec(lineTo, lineY(MIDDLE))} color="#E3D6F2" strokeWidth={2}>
        <DashPathEffect intervals={[14, 10]} />
      </Line>
      <Line p1={vec(lineFrom, lineY(BASELINE))} p2={vec(lineTo, lineY(BASELINE))} color="#C9B3E6" strokeWidth={3} />
      {shape.tail && (
        <Line p1={vec(lineFrom, lineY(TAIL))} p2={vec(lineTo, lineY(TAIL))} color="#EEE5F8" strokeWidth={2}>
          <DashPathEffect intervals={[6, 10]} />
        </Line>
      )}

      {screenStrokes.map((points, i) =>
        strokes[i].dot ? (
          <Circle key={`road${i}`} cx={points[0].x} cy={points[0].y} r={ink * 0.9} color="#F7E3F7" />
        ) : (
          <Path key={`road${i}`} path={polyline(points)} color="#F7E3F7" style="stroke" strokeWidth={ink * 2.4} strokeCap="round" strokeJoin="round" />
        ),
      )}

      {screenStrokes.map((points, i) => {
        if (i >= showing.stroke) return null;
        const color = demo ? Colors.purple : RAINBOW[i % RAINBOW.length];
        return strokes[i].dot ? (
          <Circle key={`ink${i}`} cx={points[0].x} cy={points[0].y} r={ink * 0.7} color={color} />
        ) : (
          <Path key={`ink${i}`} path={polyline(points)} color={color} style="stroke" strokeWidth={ink} strokeCap="round" strokeJoin="round" />
        );
      })}

      {active && !done && (
        <>
          {!strokes[showing.stroke].dot && (
            <Path path={polyline(active)} color="#C9A2E8" style="stroke" strokeWidth={3}>
              <DashPathEffect intervals={[10, 8]} />
            </Path>
          )}
          {showing.progress > 0 && (
            <Path
              path={polyline(active, showing.progress + 1)}
              color={demo ? Colors.purple : RAINBOW[showing.stroke % RAINBOW.length]}
              style="stroke"
              strokeWidth={ink}
              strokeCap="round"
              strokeJoin="round"
            />
          )}
          {!demo && arrowAt > showing.progress && <Arrow from={active[Math.max(0, arrowAt - 4)]} to={active[arrowAt]} size={ink * 1.1} />}
          <Circle
            cx={active[showing.progress].x}
            cy={active[showing.progress].y}
            r={demo ? ink * 0.75 : ink * (hint % 2 ? 1.25 : 1)}
            color={demo ? Colors.pink : Colors.green}
          />
          <Circle cx={active[showing.progress].x} cy={active[showing.progress].y} r={ink * 0.35} color={Colors.white} />
        </>
      )}
    </Canvas>
  );

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

        <GestureDetector gesture={pan}>
          <View style={styles.paper} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
            {canvas}
            {reward && (
              <Animated.View entering={BounceIn.duration(700)} exiting={ZoomOut} style={styles.reward} pointerEvents="none">
                {reward}
              </Animated.View>
            )}
          </View>
        </GestureDetector>

        <View style={styles.footer}>
          <Bouncy accessibilityLabel="Show me how" style={styles.small} onPress={watchAgain}>
            <Pic name="wand" size={30} />
          </Bouncy>
          <View style={styles.steps}>
            {strokes.map((_, i) => (
              <View key={i} style={[styles.step, i < stroke && { backgroundColor: RAINBOW[i % RAINBOW.length] }, i === stroke && !demo && styles.stepNow]} />
            ))}
          </View>
          <Bouncy accessibilityLabel="Start over" style={styles.small} onPress={() => begin(kind, index)}>
            <Pic name="eraser" size={30} />
          </Bouncy>
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
                  <Bouncy key={i} accessibilityLabel={`Trace ${text}`} style={[styles.tile, picking === 'word' && styles.tileWide, on && styles.tileOn]} onPress={() => begin(picking, i)}>
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

/** An arrowhead at `to`, pointing the way from `from`. */
function Arrow({ from, to, size }: { from: Point; to: Point; size: number }) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const corner = (turn: number) => ({ x: to.x - Math.cos(angle + turn) * size, y: to.y - Math.sin(angle + turn) * size });
  const a = corner(0.55);
  const b = corner(-0.55);
  const path = Skia.PathBuilder.Make().moveTo(to.x, to.y).lineTo(a.x, a.y).lineTo(b.x, b.y).close().build();
  return <Path path={path} color={Colors.purple} />;
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  kinds: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.6)', padding: 6, borderRadius: 999 },
  kind: { minWidth: 76, height: 56, paddingHorizontal: Spacing.md, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  kindOn: { backgroundColor: Colors.pink },
  paper: { flex: 1, alignSelf: 'stretch', backgroundColor: Colors.white, borderRadius: 32, overflow: 'hidden', ...cardShadow },
  reward: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.85)' },
  stars: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  steps: { flexDirection: 'row', gap: 8, minWidth: 120, justifyContent: 'center' },
  step: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(155,109,227,0.18)' },
  stepNow: { backgroundColor: Colors.green, transform: [{ scale: 1.2 }] },
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

export { GameError as ErrorBoundary } from '@/components/game-error';
