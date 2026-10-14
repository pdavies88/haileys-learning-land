import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Colors, cardShadow } from '@/constants/theme';
import { MEMORY_SETS, say } from '@/content/learning';
import { playSfx, speak } from '@/lib/audio';
import { sample, shuffle } from '@/lib/random';

const LEVELS = [3, 4, 6, 8]; // pairs per board
const COLUMNS: Record<number, number> = { 6: 3, 8: 4, 12: 4, 16: 4 };

type Card = { id: number; picture: string };

function deal(pairs: number, setIndex: number): Card[] {
  const pictures = sample(MEMORY_SETS[setIndex % MEMORY_SETS.length].pictures, pairs);
  return shuffle([...pictures, ...pictures]).map((picture, id) => ({ id, picture }));
}

function FlipCard({ card, faceUp, matched, size, onPress }: { card: Card; faceUp: boolean; matched: boolean; size: number; onPress: () => void }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(faceUp ? 1 : 0, { duration: 320 });
  }, [faceUp, turn]);
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(turn.value, [0, 1], [0, 180])}deg` }],
    opacity: turn.value < 0.5 ? 1 : 0,
  }));
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${interpolate(turn.value, [0, 1], [-180, 0])}deg` }],
    opacity: turn.value >= 0.5 ? 1 : 0,
  }));
  return (
    <Bouncy accessibilityLabel={faceUp ? card.picture : 'Hidden card'} onPress={onPress} sound={false} disabled={faceUp}>
      <View style={{ width: size, height: size * 1.2 }}>
        <Animated.View style={[styles.face, styles.back, back]}>
          <Pic name="star" size={size * 0.4} style={{ opacity: 0.9 }} />
        </Animated.View>
        <Animated.View style={[styles.face, styles.front, matched && styles.matched, front]}>
          <Pic name={card.picture} size={size * 0.7} />
        </Animated.View>
      </View>
    </Bouncy>
  );
}

export default function Memory() {
  const [level, setLevel] = useState(0);
  const [setIndex, setSetIndex] = useState(() => Math.floor(Math.random() * MEMORY_SETS.length));
  const [cards, setCards] = useState(() => deal(LEVELS[0], setIndex));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [area, setArea] = useState({ width: 0, height: 0 });
  const busy = useRef(false);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('memoryIntro'));
  }, []);

  const pairs = LEVELS[level];
  const columns = COLUMNS[pairs * 2];
  const rows = (pairs * 2) / columns;
  const gap = 12;
  const size = Math.max(
    60,
    Math.min((area.width - gap * (columns + 1)) / columns, (area.height - gap * (rows + 1)) / rows / 1.2, 170),
  );

  const flip = async (card: Card) => {
    if (busy.current || open.includes(card.id) || matched.has(card.id)) return;
    playSfx('flip');
    const nowOpen = [...open, card.id];
    setOpen(nowOpen);
    if (nowOpen.length < 2) {
      speak(say.picture(card.picture));
      return;
    }
    busy.current = true;
    const [a, b] = nowOpen.map((id) => cards[id]);
    if (a.picture === b.picture) {
      const nowMatched = new Set(matched).add(a.id).add(b.id);
      setMatched(nowMatched);
      setOpen([]);
      playSfx('chime');
      if (nowMatched.size === cards.length) {
        await speak(say.picture(a.picture), say.line('memoryMatch'));
        await celebrate(true);
        const nextLevel = Math.min(level + 1, LEVELS.length - 1);
        const nextSet = setIndex + 1;
        setLevel(nextLevel);
        setSetIndex(nextSet);
        setCards(deal(LEVELS[nextLevel], nextSet));
        setMatched(new Set());
      } else {
        speak(say.picture(a.picture), say.line('memoryMatch'));
      }
      busy.current = false;
    } else {
      speak(say.picture(b.picture));
      setTimeout(() => {
        playSfx('whoosh');
        setOpen([]);
        busy.current = false;
      }, 1100);
    }
  };

  return (
    <GameScreen
      title="Flip & Find"
      background="#E5FBEF"
      onRepeat={() => speak(say.line('memoryIntro'))}
      progress={{ done: matched.size / 2, total: pairs }}>
      <View
        style={styles.board}
        onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {area.width > 0 && (
          <View style={[styles.grid, { width: columns * size + (columns - 1) * gap, gap }]}>
            {cards.map((card) => (
              <FlipCard
                key={`${level}-${setIndex}-${card.id}`}
                card={card}
                size={size}
                faceUp={open.includes(card.id) || matched.has(card.id)}
                matched={matched.has(card.id)}
                onPress={() => flip(card)}
              />
            ))}
          </View>
        )}
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    ...cardShadow,
  },
  back: { backgroundColor: Colors.green },
  front: { backgroundColor: Colors.white },
  matched: { backgroundColor: '#FFF8D6' },
});
