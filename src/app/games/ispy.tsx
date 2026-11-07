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

// Busy, colourful things to hide the one target among, including look-alikes (a sun near a star,
// apples near a strawberry). Whatever is being looked for is left out.
const DECOYS = ['flower', 'apple', 'bee', 'butterfly', 'cat', 'dog', 'ball', 'gift', 'leaf', 'cloud', 'sun', 'balloon', 'house', 'snail', 'star', 'heart', 'ladybug', 'strawberry', 'fish', 'cherries', 'lemon', 'rose', 'frog', 'crab'];

type Item = { id: number; name: string; target: boolean; col: number; row: number; dx: number; dy: number; turn: number; size: number };

/**
 * A busy picture, every cell of a loose grid filled and overlapping its neighbours, with the one
 * target hidden somewhere among the rest.
 */
function scene(round: number, cols: number, rows: number): Item[] {
  const target = SPY_TARGETS[round % SPY_TARGETS.length].name;
  const decoys = DECOYS.filter((d) => d !== target);
  const cells = cols * rows;
  const hideAt = Math.floor(Math.random() * cells);
  return Array.from({ length: cells }, (_, i) => ({
    id: i,
    name: i === hideAt ? target : decoys[Math.floor(Math.random() * decoys.length)],
    target: i === hideAt,
    col: i % cols,
    row: Math.floor(i / cols),
    dx: Math.random() - 0.5,
    dy: Math.random() - 0.5,
    turn: (Math.random() - 0.5) * 60,
    // Things overlap a little; the target is no bigger than anything else.
    size: i === hideAt ? 1 : 0.95 + Math.random() * 0.4,
  }));
}

/**
 * I spy: like Where's Waldo, find the one star (or heart, or ladybug) hidden in a busy, crowded
 * picture. Picking something else just wiggles it. Each round the crowd gets bigger, building
 * careful, steady looking.
 */
export default function ISpy() {
  const [round, setRound] = useState(0);
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const { celebrate, overlay } = useCelebration();

  // The crowd grows each round.
  const grow = Math.min(round, 4);
  const cols = (area.width > area.height ? 11 : 7) + grow;
  const rows = (area.width > area.height ? 7 : 11) + grow;
  const items = useMemo(() => scene(round, cols, rows), [round, cols, rows]);
  const target = SPY_TARGETS[round % SPY_TARGETS.length];

  useEffect(() => {
    speak(say.spy(target.name));
  }, [target.name]);

  const pick = async (item: Item) => {
    if (found.length > 0) return;
    if (!item.target) {
      setWrong(item.id);
      playSfx('bloop');
      return;
    }
    setFound([item.id]);
    playSfx('chime');
    await celebrate(true);
    await speak(say.line('spyDone'));
    await pause(500);
    setFound([]);
    setRound((r) => r + 1);
  };

  const cellW = area.width / cols;
  const cellH = area.height / rows;
  const base = Math.min(cellW, cellH) * 1.05;

  return (
    <GameScreen title="I spy" background="#FFF4DD" level={round} onRepeat={() => speak(say.spy(target.name))}>
      <View style={styles.body}>
        <View style={styles.ask}>
          <Txt size={26} weight="heavy">
            Can you find the {target.name}?
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
                    left: item.col * cellW + (cellW - size) / 2 + item.dx * cellW * 0.5,
                    top: item.row * cellH + (cellH - size) / 2 + item.dy * cellH * 0.5,
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
