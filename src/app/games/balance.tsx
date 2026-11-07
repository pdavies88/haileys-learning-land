import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';

const PEGS = 4; // on each side; the far peg is four times as far from the middle as the near one
const WEIGHTS = [1, 2, 3] as const; // small, medium and big frogs
const MAX_TILT = 18; // degrees
type Side = 'left' | 'right';
type Board = Record<Side, (number | null)[]>; // the weight of the frog on each peg, nearest first

/** A new puzzle: one frog fixed on the left; she balances it on the right. */
function challenge(): { board: Board; fixed: number } {
  const left = Array<number | null>(PEGS).fill(null);
  const at = Math.floor(Math.random() * PEGS);
  left[at] = WEIGHTS[Math.floor(Math.random() * WEIGHTS.length)];
  return { board: { left, right: Array(PEGS).fill(null) }, fixed: at };
}

const turning = (side: (number | null)[]) => side.reduce<number>((sum, w, i) => sum + (w ?? 0) * (i + 1), 0);

/**
 * Frog balance, after the seesaw toy used in occupational therapy. A frog sits on the left of the
 * board; she puts frogs on the right to make it level. Heavier frogs and frogs further out tip it
 * more, and the board swings to show it. Nothing to get wrong: keep moving frogs until it's level.
 */
export default function Balance() {
  const { width } = useWindowDimensions();
  const [{ board, fixed }, setPuzzle] = useState(challenge);
  const [holding, setHolding] = useState<number>(1);
  const [level, setLevel] = useState(false);
  const tilt = useSharedValue(0);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('balIntro'));
  }, []);

  const torque = turning(board.right) - turning(board.left);
  useEffect(() => {
    tilt.set(withTiming(Math.max(-MAX_TILT, Math.min(MAX_TILT, torque * 3)), { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [torque, tilt]);

  const place = async (i: number) => {
    if (level) return;
    const right = [...board.right];
    right[i] = right[i] === holding ? null : holding;
    const next = { left: board.left, right };
    setPuzzle({ board: next, fixed });
    playSfx('pop');
    if (turning(next.right) !== turning(next.left)) return;
    setLevel(true);
    await pause(650);
    playSfx('chime');
    await speak(say.line('balWin'));
    await celebrate(true);
    setLevel(false);
    setPuzzle(challenge());
  };

  const boardWidth = Math.min(width - Spacing.md * 2, 900);
  const gap = (boardWidth / 2 - 40) / PEGS;
  const frogSize = (w: number) => 44 + w * 16;
  const swing = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));

  const frogsOn = (side: Side) =>
    board[side].map((w, i) => {
      const x = boardWidth / 2 + (side === 'right' ? 1 : -1) * (40 + gap * (i + 0.5));
      return (
        // A plain box places the spot on the board; the button inside fills it.
        <View key={`${side}${i}`} style={[styles.peg, { left: x - gap / 2, width: gap }]}>
          <Bouncy accessibilityLabel={`${side} peg ${i + 1}`} sound={false} disabled={side === 'left'} onPress={() => place(i)} style={styles.pegButton}>
            {w ? <Pic name="frog" size={frogSize(w)} style={side === 'left' && i === fixed ? styles.fixed : undefined} /> : <View style={styles.spot} />}
          </Bouncy>
        </View>
      );
    });

  return (
    <GameScreen title="Frog balance" background="#E8F7E4" onRepeat={() => speak(say.line('balIntro'))}>
      <View style={styles.body}>
        <Txt size={30} weight="heavy" color={level ? Colors.green : Colors.purpleDark}>
          {level ? 'Level!' : 'Make it level'}
        </Txt>
        <View style={styles.stage}>
          <Animated.View style={[styles.swing, { width: boardWidth }, swing]}>
            {frogsOn('left')}
            {frogsOn('right')}
            <View style={[styles.board, level && styles.boardLevel]} />
          </Animated.View>
          <View style={styles.pivot}>
            <Pic name="frog" size={110} />
          </View>
        </View>
        <View style={styles.tray}>
          {WEIGHTS.map((w) => (
            <Bouncy key={w} accessibilityLabel={['Small', 'Medium', 'Big'][w - 1] + ' frog'} style={[styles.pick, holding === w && styles.pickOn]} onPress={() => setHolding(w)}>
              <Pic name="frog" size={frogSize(w)} />
            </Bouncy>
          ))}
        </View>
        <Txt size={17} color={Colors.textSoft}>
          Pick a frog, then tap a spot on the right
        </Txt>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-around', padding: Spacing.md },
  stage: { alignItems: 'center', marginTop: Spacing.lg },
  // The board turns about its middle; frogs stand on top of it, so the row is twice their height.
  swing: { height: 220, justifyContent: 'center' },
  board: { position: 'absolute', left: 0, right: 0, top: 104, height: 18, borderRadius: 9, backgroundColor: '#C98A4B', borderWidth: 3, borderColor: '#8A5A2B' },
  boardLevel: { backgroundColor: '#7BD389', borderColor: '#3E9E54' },
  peg: { position: 'absolute', top: 0, height: 104 },
  pegButton: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  spot: { width: 30, height: 12, borderRadius: 6, backgroundColor: 'rgba(138,90,43,0.35)', marginBottom: 2 },
  fixed: { opacity: 0.95 },
  pivot: { marginTop: -100 },
  tray: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.lg, padding: Spacing.md, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.75)', ...cardShadow },
  pick: { padding: 8, borderRadius: 20, borderWidth: 4, borderColor: 'transparent' },
  pickOn: { borderColor: Colors.yellow, backgroundColor: '#FFF6CC' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
