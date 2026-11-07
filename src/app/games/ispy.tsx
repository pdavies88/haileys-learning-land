import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { TouchPad } from '@/components/touch-pad';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { SPY_TARGETS, say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';

const DECOYS = ['flower', 'apple', 'bee', 'butterfly', 'cat', 'dog', 'ball', 'gift', 'leaf', 'cloud', 'sun', 'balloon', 'house', 'snail'];

type Item = { id: number; name: string; target: boolean; col: number; row: number; dx: number; dy: number; turn: number; size: number };

/** A busy picture: the targets hidden among other things, each in its own cell of a loose grid. */
function scene(round: number, cols: number, rows: number): Item[] {
  const target = SPY_TARGETS[round % SPY_TARGETS.length].name;
  const targets = Math.min(3 + round, 6);
  const decoys = Math.min(12 + round * 2, cols * rows - targets);
  const cells = Array.from({ length: cols * rows }, (_, i) => i).sort(() => Math.random() - 0.5);
  const names = [
    ...Array.from({ length: targets }, () => target),
    ...Array.from({ length: decoys }, () => DECOYS[Math.floor(Math.random() * DECOYS.length)]),
  ];
  return names.map((name, i) => ({
    id: i,
    name,
    target: i < targets,
    col: cells[i] % cols,
    row: Math.floor(cells[i] / cols),
    dx: Math.random() - 0.5,
    dy: Math.random() - 0.5,
    turn: (Math.random() - 0.5) * 40,
    size: 0.75 + Math.random() * 0.35,
  }));
}

/**
 * I spy: find every star (or heart, or ladybug) hidden in a busy picture. Picking something else
 * just wiggles it. Each round hides a few more among more things, building steady attention.
 */
export default function ISpy() {
  const [round, setRound] = useState(0);
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const { celebrate, overlay } = useCelebration();

  const cols = area.width > area.height ? 7 : 5;
  const rows = area.width > area.height ? 4 : 6;
  const items = useMemo(() => scene(round, cols, rows), [round, cols, rows]);
  const target = SPY_TARGETS[round % SPY_TARGETS.length];
  const total = items.filter((i) => i.target).length;

  useEffect(() => {
    speak(say.spy(target.name));
  }, [target.name]);

  const pick = async (item: Item) => {
    if (found.includes(item.id) || found.length >= total) return;
    if (!item.target) {
      setWrong(item.id);
      playSfx('bloop');
      return;
    }
    const now = [...found, item.id];
    setFound(now);
    playSfx('chime');
    if (now.length < total) return;
    await celebrate(true);
    await speak(say.line('spyDone'));
    await pause(500);
    setFound([]);
    setRound((r) => r + 1);
  };

  const cellW = area.width / cols;
  const cellH = area.height / rows;
  const base = Math.min(cellW, cellH) * 0.62;

  return (
    <GameScreen title="I spy" background="#FFF4DD" progress={{ done: found.length, total }} onRepeat={() => speak(say.spy(target.name))}>
      <View style={styles.body}>
        <View style={styles.ask}>
          <Txt size={26} weight="heavy">
            Find all the {target.plural}
          </Txt>
          <Pic name={target.name} size={44} />
        </View>
        <View style={styles.field} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {area.width > 0 &&
            items.map((item) => {
              const size = base * item.size;
              const done = found.includes(item.id);
              return (
                <TouchPad
                  key={`${round}-${item.id}`}
                  label={item.name}
                  onTouch={() => pick(item)}
                  style={{
                    position: 'absolute',
                    left: item.col * cellW + (cellW - size) / 2 + item.dx * (cellW - size) * 0.8,
                    top: item.row * cellH + (cellH - size) / 2 + item.dy * (cellH - size) * 0.8,
                    width: size,
                    height: size,
                    transform: [{ rotate: `${wrong === item.id ? 0 : item.turn}deg` }],
                  }}>
                  {done && <Animated.View entering={ZoomIn} style={[styles.ring, { borderRadius: size }]} />}
                  <Pic name={item.name} size={size} />
                </TouchPad>
              );
            })}
        </View>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  ask: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  field: { flex: 1, alignSelf: 'stretch', borderRadius: 32, backgroundColor: Colors.white, overflow: 'hidden', ...cardShadow },
  ring: { ...StyleSheet.absoluteFill, borderWidth: 6, borderColor: Colors.green, backgroundColor: 'rgba(34,193,122,0.15)', margin: -6 },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
