/* eslint-disable react-hooks/refs, react-hooks/purity -- the flagged code runs in finger handlers handed
 to a gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { Canvas, DashPathEffect, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';

type Point = { x: number; y: number };

// Winding paths in a 100 x 60 box, gentlest first.
const TRAILS = [
  'M6 48 C 26 48, 30 14, 50 14 S 74 48, 94 20',
  'M6 14 C 24 14, 20 48, 38 48 S 52 14, 66 14 S 78 48, 94 46',
  'M6 30 C 16 6, 30 6, 34 30 S 52 54, 58 30 S 76 6, 82 30 S 92 50, 95 44',
];
const NEAR = 8; // how far from the path her finger may be, in box units
const AHEAD = 10; // how far along the path one finger move may reach
// Faster than this (box units per second, over the last moment) and the snail hides in its shell.
const TOO_FAST = 30;
const HIDE_MS = 1800;

/** Points along a path, one box unit apart. */
function measure(d: string): Point[] {
  const points: Point[] = [];
  const path = Skia.Path.MakeFromSVGString(d);
  const contours = path ? Skia.ContourMeasureIter(path, false, 1) : null;
  for (let c = contours?.next(); c; c = contours?.next()) {
    for (let at = 0; at <= c.length(); at += 1) {
      const [pos] = c.getPosTan(at);
      points.push({ x: pos.x, y: pos.y });
    }
  }
  return points;
}

function line(points: Point[], to = points.length): SkPath {
  const b = Skia.PathBuilder.Make();
  points.slice(0, Math.max(1, to)).forEach((p, i) => (i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y)));
  return b.build();
}

/**
 * Snail trail: guide the snail along a winding path to its house. Rushing makes it hide in its
 * shell, so slow, steady movement is the only way home. Practises careful, paced movement.
 */
export default function Snail() {
  'use no memo';
  const [trail, setTrail] = useState(0);
  const [at, setAt] = useState(0);
  const [hiding, setHiding] = useState(false);
  const [home, setHome] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const dragging = useRef(false);
  const recent = useRef<{ at: number; t: number }[]>([]);
  const { celebrate, overlay } = useCelebration();

  const points = useMemo(() => measure(TRAILS[trail % TRAILS.length]), [trail]);
  const scale = Math.min(area.width / 100, area.height / 60) * 0.94;
  const ox = (area.width - 100 * scale) / 2;
  const oy = (area.height - 60 * scale) / 2;
  const screen = useMemo(() => points.map((p) => ({ x: ox + p.x * scale, y: oy + p.y * scale })), [points, ox, oy, scale]);

  useEffect(() => {
    speak(say.line('snIntro'));
  }, []);

  const hide = async () => {
    dragging.current = false;
    setHiding(true);
    playSfx('bloop');
    speak(say.line('snFast'));
    await pause(HIDE_MS);
    setHiding(false);
  };

  const reachHome = async () => {
    dragging.current = false;
    setHome(true);
    await celebrate(true);
    await speak(say.line('snHome'));
    await pause(600);
    setHome(false);
    setAt(0);
    setTrail((t) => t + 1);
  };

  const toBox = (x: number, y: number) => ({ x: (x - ox) / scale, y: (y - oy) / scale });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .maxPointers(1)
    .onBegin((e) => {
      if (hiding || home) return;
      const finger = toBox(e.x, e.y);
      if (Math.hypot(finger.x - points[at].x, finger.y - points[at].y) > NEAR * 1.5) return;
      dragging.current = true;
      recent.current = [{ at, t: Date.now() }];
    })
    .onUpdate((e) => {
      if (!dragging.current) return;
      const finger = toBox(e.x, e.y);
      let best = at;
      let bestDistance = Infinity;
      for (let i = at; i <= Math.min(points.length - 1, at + AHEAD); i++) {
        const d = Math.hypot(finger.x - points[i].x, finger.y - points[i].y);
        if (d < bestDistance) {
          best = i;
          bestDistance = d;
        }
      }
      if (bestDistance > NEAR * 1.6) {
        dragging.current = false;
        return;
      }
      if (best <= at || bestDistance > NEAR) return;
      // How fast the snail has been going over the last half second.
      const now = Date.now();
      recent.current = [...recent.current.filter((r) => now - r.t < 500), { at: best, t: now }];
      const first = recent.current[0];
      const speed = now > first.t + 120 ? ((best - first.at) / (now - first.t)) * 1000 : 0;
      if (speed > TOO_FAST) {
        hide();
        return;
      }
      setAt(best);
      if (best >= points.length - 2) reachHome();
    })
    .onFinalize(() => {
      dragging.current = false;
    });

  const snailSize = Math.max(56, scale * 11);
  const snail = screen[at];
  const end = screen[screen.length - 1];

  return (
    <GameScreen title="Snail trail" background="#EAF7E4" onRepeat={() => speak(say.line('snIntro'))}>
      <View style={styles.body}>
        <Txt size={26} weight="heavy" color={hiding ? Colors.pink : Colors.purpleDark}>
          {hiding ? 'Too fast! Slow and steady.' : 'Slow and steady wins!'}
        </Txt>
        <GestureDetector gesture={pan}>
          <View style={styles.field} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
            {area.width > 0 && snail && (
              <>
                <Canvas style={StyleSheet.absoluteFill}>
                  <Path path={line(screen)} color="#CDE8BE" style="stroke" strokeWidth={NEAR * 2 * scale} strokeCap="round" strokeJoin="round" />
                  <Path path={line(screen)} color="#9CCB86" style="stroke" strokeWidth={3}>
                    <DashPathEffect intervals={[12, 10]} />
                  </Path>
                  {at > 0 && <Path path={line(screen, at + 1)} color="rgba(155,109,227,0.45)" style="stroke" strokeWidth={snailSize * 0.25} strokeCap="round" strokeJoin="round" />}
                </Canvas>
                <View pointerEvents="none" style={[styles.at, { left: end.x - snailSize * 0.6, top: end.y - snailSize * 1.1 }]}>
                  <Pic name="house" size={snailSize * 1.2} />
                </View>
                {/* The snail picture faces left; mirrored, it crawls forward along the path. */}
                <View pointerEvents="none" style={[styles.at, { left: snail.x - snailSize / 2, top: snail.y - snailSize * 0.75, opacity: hiding ? 0.35 : 1, transform: [{ scale: hiding ? 0.7 : 1 }, { scaleX: -1 }] }]}>
                  <Pic name="snail" size={snailSize} />
                </View>
              </>
            )}
          </View>
        </GestureDetector>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  field: { flex: 1, alignSelf: 'stretch', borderRadius: 32, backgroundColor: '#F7FCF3', overflow: 'hidden', ...cardShadow },
  at: { position: 'absolute' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
