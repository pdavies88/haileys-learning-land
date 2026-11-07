/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers and
 the game loop, not during render. */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing } from '@/constants/theme';
import { say } from '@/content/learning';
import { playSfx, speak } from '@/lib/audio';

const FRUIT = ['apple', 'strawberry', 'cherries', 'lemon', 'pear', 'peach', 'orange'];
const GOAL = 10;
const FRAME_MS = 33;
const ITEM = 64;
const BOWL = 120;

type Falling = { id: number; name: string; x: number; y: number };

/**
 * Catch: fruit falls from the sky; slide the bowl along the bottom (drag anywhere) to catch it.
 * Ten catches fill the round and the next one falls a little faster. Missing one doesn't matter,
 * it just rolls away. Practises keeping eyes on a moving target.
 */
export default function Catch() {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [items, setItems] = useState<Falling[]>([]);
  const [bowlX, setBowlX] = useState(0);
  const [caught, setCaught] = useState(0);
  const [level, setLevel] = useState(0);
  const state = useRef({ items: [] as Falling[], bowlX: 0, caught: 0, level: 0, nextId: 1, sinceSpawn: 0, paused: false });
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('catchIntro'));
  }, []);

  useEffect(() => {
    if (area.width === 0) return;
    const s = state.current;
    s.bowlX = area.width / 2;
    setBowlX(s.bowlX);
    const id = setInterval(() => {
      if (s.paused) return;
      const speed = (2.2 + s.level * 0.6) * (area.height / 600);
      s.sinceSpawn += FRAME_MS;
      if (s.sinceSpawn > Math.max(700, 1500 - s.level * 150)) {
        s.sinceSpawn = 0;
        s.items.push({ id: s.nextId++, name: FRUIT[Math.floor(Math.random() * FRUIT.length)], x: ITEM / 2 + Math.random() * (area.width - ITEM), y: -ITEM });
      }
      const catchY = area.height - BOWL * 0.75;
      const kept: Falling[] = [];
      for (const it of s.items) {
        it.y += speed;
        if (it.y >= catchY && it.y - speed < catchY && Math.abs(it.x - s.bowlX) < BOWL * 0.6) {
          s.caught += 1;
          playSfx('chime');
          continue;
        }
        if (it.y < area.height + ITEM) kept.push(it);
      }
      s.items = kept;
      setItems([...kept]);
      setCaught(s.caught);
      if (s.caught >= GOAL) {
        s.paused = true;
        s.items = [];
        setItems([]);
        celebrate(true).then(async () => {
          await speak(say.line('catchWin'));
          s.caught = 0;
          s.level = Math.min(s.level + 1, 6);
          setLevel(s.level);
          setCaught(0);
          s.paused = false;
        });
      }
    }, FRAME_MS);
    return () => clearInterval(id);
    // The loop reads everything else from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.width, area.height]);

  const move = (x: number) => {
    const clamped = Math.max(BOWL / 2, Math.min(area.width - BOWL / 2, x));
    state.current.bowlX = clamped;
    setBowlX(clamped);
  };
  const drag = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => move(e.x))
    .onUpdate((e) => move(e.x));

  return (
    <GameScreen title="Catch" background="#E7F7FF" level={level} onRepeat={() => speak(say.line('catchIntro'))}>
      <View style={styles.body}>
        <View style={styles.count}>
          {Array.from({ length: GOAL }, (_, i) => (
            <View key={i} style={[styles.dot, i < caught && styles.dotOn]} />
          ))}
        </View>
        <GestureDetector gesture={drag}>
          <View style={styles.sky} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
            {items.map((it) => (
              <View key={it.id} pointerEvents="none" style={[styles.at, { left: it.x - ITEM / 2, top: it.y - ITEM / 2 }]}>
                <Pic name={it.name} size={ITEM} />
              </View>
            ))}
            {area.width > 0 && (
              <View pointerEvents="none" style={[styles.at, { left: bowlX - BOWL / 2, top: area.height - BOWL }]}>
                <Pic name="bowl" size={BOWL} />
              </View>
            )}
          </View>
        </GestureDetector>
        <Txt size={18} color={Colors.textSoft}>
          Slide the bowl to catch the fruit
        </Txt>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  count: { flexDirection: 'row', gap: 6 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(59,142,240,0.2)' },
  dotOn: { backgroundColor: Colors.blue },
  sky: { flex: 1, alignSelf: 'stretch', borderRadius: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.55)' },
  at: { position: 'absolute' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
