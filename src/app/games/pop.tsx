/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers, not during render. */
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GameScreen } from '@/components/game-screen';
import { Spacing } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';

const SHEETS = ['#8FD3FF', '#FFB8D9', '#B9F3C9', '#FFE48A', '#D7C4FF'];
const SIZE = 84; // roughly how big each bubble is

/**
 * Bubble wrap: swipe a finger across the sheet to pop every bubble it passes over, with a pop and a
 * little buzz each time. A tap pops one bubble, and several fingers work at once. Nothing to win
 * or lose, just squishing; a full sheet is followed by a fresh one in a new colour. A calm-down
 * game, so fast popping is welcome here.
 */
export default function Pop() {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [sheet, setSheet] = useState(0);
  const [popped, setPopped] = useState<Set<number>>(new Set());
  // The finger handlers read these between renders, so a fast swipe never pops a bubble twice.
  const live = useRef({ popped: new Set<number>(), sheet: 0, last: new Map<number, [number, number]>() });

  useEffect(() => {
    speak(say.line('popIntro'));
  }, []);

  const cols = Math.max(4, Math.floor(area.width / SIZE));
  const rows = Math.max(4, Math.floor(area.height / SIZE));
  const total = cols * rows;
  const cellW = area.width / cols;
  const cellH = area.height / rows;
  const bubble = Math.min(cellW, cellH) * 0.86;

  const pop = (i: number) => {
    const s = live.current;
    if (s.popped.has(i)) return;
    s.popped.add(i);
    setPopped(new Set(s.popped));
    playSfx(i % 3 === 0 ? 'snap' : 'pop', { always: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (s.popped.size < total) return;
    const on = s.sheet;
    pause(600).then(() => {
      if (on !== s.sheet) return;
      speak(say.line('popMore'));
      s.popped = new Set();
      s.sheet += 1;
      setPopped(new Set());
      setSheet(s.sheet);
    });
  };

  /** Pops the bubble under (x, y), if the finger is over a bubble and not the gap between them. */
  const popAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= area.width || y >= area.height) return;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    const dx = x - (col + 0.5) * cellW;
    const dy = y - (row + 0.5) * cellH;
    // A little bigger than the bubble, so a finger brushing its edge still pops it.
    if (dx * dx + dy * dy <= (bubble * 0.6) ** 2) pop(row * cols + col);
  };

  /** Pops every bubble along a finger's path, so a quick swipe doesn't skip any. */
  const sweep = (from: [number, number], to: [number, number]) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / (bubble / 4)));
    for (let k = 1; k <= steps; k++) popAt(from[0] + ((to[0] - from[0]) * k) / steps, from[1] + ((to[1] - from[1]) * k) / steps);
  };

  // A manual gesture follows every finger on the sheet, each on its own path.
  const fingers = Gesture.Manual()
    .runOnJS(true)
    .onTouchesDown((e) => {
      for (const t of e.changedTouches) {
        live.current.last.set(t.id, [t.x, t.y]);
        popAt(t.x, t.y);
      }
    })
    .onTouchesMove((e) => {
      for (const t of e.changedTouches) {
        const from = live.current.last.get(t.id) ?? [t.x, t.y];
        live.current.last.set(t.id, [t.x, t.y]);
        sweep(from, [t.x, t.y]);
      }
    })
    .onTouchesUp((e) => {
      for (const t of e.changedTouches) live.current.last.delete(t.id);
    })
    .onTouchesCancelled((e) => {
      for (const t of e.changedTouches) live.current.last.delete(t.id);
    });

  const color = SHEETS[sheet % SHEETS.length];
  return (
    <GameScreen title="Bubble wrap" background="#EAF6FF" calm={false} onRepeat={() => speak(say.line('popIntro'))}>
      <View style={styles.body}>
        <GestureDetector gesture={fingers}>
          {/* A steady view holds the gesture; the sheet inside is swapped for a fresh one each time. */}
          <View style={styles.sheet} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          <Animated.View key={sheet} entering={FadeIn.duration(400)} style={[StyleSheet.absoluteFill, { backgroundColor: color + '55' }]}>
            {area.width > 0 &&
              Array.from({ length: total }, (_, i) => {
                const flat = popped.has(i);
                return (
                  <View
                    key={i}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Bubble"
                    onAccessibilityTap={() => pop(i)}
                    pointerEvents="none"
                    style={[
                      styles.bubble,
                      {
                        left: (i % cols) * cellW + (cellW - bubble) / 2,
                        top: Math.floor(i / cols) * cellH + (cellH - bubble) / 2,
                        width: bubble,
                        height: bubble,
                        borderRadius: bubble / 2,
                      },
                      flat ? styles.flat : { backgroundColor: color, borderColor: '#FFFFFFAA' },
                    ]}>
                    {!flat && <View style={[styles.shine, { width: bubble * 0.28, height: bubble * 0.18, borderRadius: bubble }]} />}
                  </View>
                );
              })}
          </Animated.View>
          </View>
        </GestureDetector>
      </View>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: Spacing.md },
  sheet: { flex: 1, borderRadius: 28, overflow: 'hidden' },
  bubble: { position: 'absolute', borderWidth: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  flat: { backgroundColor: 'rgba(255,255,255,0.35)', borderColor: 'rgba(0,0,0,0.06)', shadowOpacity: 0, transform: [{ scale: 0.82 }] },
  shine: { position: 'absolute', top: '18%', left: '22%', backgroundColor: 'rgba(255,255,255,0.75)', transform: [{ rotate: '-25deg' }] },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
