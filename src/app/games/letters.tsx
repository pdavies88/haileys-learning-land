/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { Canvas, DashPathEffect, Path, Skia, useFont, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { BounceIn, ZoomOut } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { LETTERS, say } from '@/content/learning';
import { playSfx, speak } from '@/lib/audio';

const RAINBOW = ['#FF5C8A', '#FF9F43', '#FFD23F', '#3CC47C', '#4D9DE0', '#9B6DE3'];
const DONE_AT = 0.8; // fraction of the letter she needs to cover

type Point = { x: number; y: number };

/** Points spread evenly inside the letter. Tracing "covers" the ones near her finger. */
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

export default function Letters() {
  // The finger handlers below only run on touches, but React Compiler can't tell that from a gesture
  // builder. This screen redraws on every move anyway, so it opts out of the compiler.
  'use no memo';
  const [index, setIndex] = useState(0);
  const [lower, setLower] = useState(false);
  const [size, setSize] = useState(0);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const portrait = screenHeight > screenWidth;
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [covered, setCovered] = useState(0);
  const [done, setDone] = useState(false);
  const coveredSet = useRef(new Set<number>());
  const nudged = useRef(false);
  const finished = useRef(false);
  const { celebrate, overlay } = useCelebration();
  const font = useFont(require('@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf'), size * 0.82 || 1);

  const letter = LETTERS[index];
  const character = lower ? letter.lower : letter.upper;
  const instruction = lower ? say.traceLower(letter) : say.traceUpper(letter);

  // The letter as a shape, centered in the drawing area, and the points she needs to cover.
  let glyph: SkPath | null = null;
  let targets: Point[] = [];
  if (font && size > 0) {
    const raw = Skia.Path.MakeFromText(character, 0, 0, font);
    if (raw) {
      const b = raw.computeTightBounds();
      glyph = Skia.PathBuilder.MakeFromPath(raw)
        .offset(size / 2 - (b.x + b.width / 2), size / 2 - (b.y + b.height / 2))
        .build();
      targets = samplePoints(glyph, size / 26);
    }
  }
  const radius = size / 13;

  useEffect(() => {
    speak(say.line('traceIntro'), instruction);
    // Only on arrival; each new letter announces itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = (nextIndex: number, nextLower: boolean) => {
    setIndex(nextIndex);
    setLower(nextLower);
    setStrokes([]);
    setCovered(0);
    setDone(false);
    coveredSet.current = new Set();
    nudged.current = false;
    finished.current = false;
    const l = LETTERS[nextIndex];
    speak(nextLower ? say.traceLower(l) : say.traceUpper(l));
  };

  const finish = async () => {
    if (finished.current) return;
    finished.current = true;
    setDone(true);
    playSfx('star');
    await speak(say.letterName(letter), say.letterSound(letter), say.letterIsFor(letter));
    await celebrate(lower);
  };

  const touch = (x: number, y: number, start: boolean) => {
    if (done) return;
    setStrokes((s) => (start ? [...s, [{ x, y }]] : [...s.slice(0, -1), [...(s[s.length - 1] ?? []), { x, y }]]));
    targets.forEach((p, i) => {
      if (!coveredSet.current.has(i) && (p.x - x) ** 2 + (p.y - y) ** 2 < radius * radius) coveredSet.current.add(i);
    });
    const fraction = targets.length ? coveredSet.current.size / targets.length : 0;
    setCovered(fraction);
    if (fraction >= DONE_AT) finish();
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => touch(e.x, e.y, true))
    .onUpdate((e) => touch(e.x, e.y, false))
    .onEnd(() => {
      if (!done && !nudged.current && covered > 0.25 && covered < DONE_AT) {
        nudged.current = true;
        speak(say.line('traceKeepGoing'));
      }
    });

  const next = () => (lower ? reset((index + 1) % LETTERS.length, false) : reset(index, true));
  const previous = () => reset((index + LETTERS.length - 1) % LETTERS.length, false);

  return (
    <GameScreen title="Magic Letters" background="#FFE8F3" onRepeat={() => speak(instruction)}>
      <View style={[styles.body, portrait && styles.bodyPortrait]}>
        <View style={[styles.side, portrait && styles.hidden]}>
          <Bouncy accessibilityLabel="Previous letter" style={styles.arrow} onPress={previous}>
            <Txt size={40} weight="heavy" color={Colors.pink}>
              ‹
            </Txt>
          </Bouncy>
        </View>

        <View
          style={styles.area}
          onLayout={(e: LayoutChangeEvent) => setSize(Math.floor(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height - 30)))}>
          {size > 0 && (
            <GestureDetector gesture={pan}>
              <View style={[styles.paper, { width: size, height: size }]}>
                <Canvas style={{ width: size, height: size }}>
                  {glyph && <Path path={glyph} color="#F7E3F7" />}
                  {glyph && (
                    <Path path={glyph} color="#C9A2E8" style="stroke" strokeWidth={4}>
                      <DashPathEffect intervals={[14, 10]} />
                    </Path>
                  )}
                  {strokes.map((stroke, i) => {
                    const builder = Skia.PathBuilder.Make();
                    stroke.forEach((p, j) => (j === 0 ? builder.moveTo(p.x, p.y) : builder.lineTo(p.x, p.y)));
                    if (stroke.length === 1) builder.lineTo(stroke[0].x + 0.1, stroke[0].y);
                    const path = builder.build();
                    return (
                      <Path
                        key={i}
                        path={path}
                        color={RAINBOW[i % RAINBOW.length]}
                        style="stroke"
                        strokeWidth={radius * 1.3}
                        strokeCap="round"
                        strokeJoin="round"
                        opacity={0.9}
                      />
                    );
                  })}
                </Canvas>
                {done && (
                  <Animated.View entering={BounceIn.duration(700)} exiting={ZoomOut} style={styles.reward} pointerEvents="none">
                    <Pic name={letter.word} size={size * 0.5} />
                    <Txt size={size * 0.09} weight="heavy" color={Colors.purpleDark}>
                      {letter.upper === 'X' ? 'X is in fox' : `${character} is for ${letter.word}`}
                    </Txt>
                  </Animated.View>
                )}
              </View>
            </GestureDetector>
          )}
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${Math.min(100, (covered / DONE_AT) * 100)}%` }]} />
          </View>
        </View>

        <View style={[styles.side, portrait && styles.sideRow]}>
          {portrait && (
            <Bouncy accessibilityLabel="Previous letter" style={styles.arrow} onPress={previous}>
              <Txt size={40} weight="heavy" color={Colors.pink}>
                ‹
              </Txt>
            </Bouncy>
          )}
          <Bouncy accessibilityLabel="Next letter" style={[styles.arrow, done && styles.arrowReady]} onPress={next}>
            <Txt size={40} weight="heavy" color={done ? Colors.white : Colors.pink}>
              ›
            </Txt>
          </Bouncy>
          <Bouncy accessibilityLabel="Start over" style={styles.small} onPress={() => reset(index, lower)}>
            <Pic name="eraser" size={34} />
          </Bouncy>
        </View>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  bodyPortrait: { flexDirection: 'column' },
  side: { gap: Spacing.md, alignItems: 'center' },
  sideRow: { flexDirection: 'row', gap: Spacing.lg },
  hidden: { display: 'none' },
  arrow: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  arrowReady: { backgroundColor: Colors.pink },
  small: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  area: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  paper: { backgroundColor: Colors.white, borderRadius: 32, overflow: 'hidden', ...cardShadow },
  reward: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.82)' },
  meter: { width: '70%', height: 14, borderRadius: 7, backgroundColor: 'rgba(155,109,227,0.18)', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 7, backgroundColor: Colors.purple },
});
