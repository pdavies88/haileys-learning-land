import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, gradient, raised } from '@/constants/theme';
import { LETTERS, MEMORY_SETS, say } from '@/content/learning';
import { playSfx, speak } from '@/lib/audio';
import { sample, shuffle } from '@/lib/random';

const LEVELS = [4, 6, 8, 10]; // pairs per board
const COLUMNS: Record<number, number> = { 8: 4, 12: 4, 16: 4, 20: 5 };

/**
 * A card shows a picture, or a letter. Two cards match when they share a `pair`: the same picture,
 * or a big letter and its little letter.
 */
type Card = { id: number; pair: string; picture?: string; text?: string };

/** Every third board matches big letters to little letters instead of pictures. */
const isLetterBoard = (setIndex: number) => setIndex % 3 === 2;

function deal(pairs: number, setIndex: number): Card[] {
  if (isLetterBoard(setIndex)) {
    const letters = sample(LETTERS, pairs);
    const faces = letters.flatMap((l) => [
      { pair: l.lower, text: l.upper },
      { pair: l.lower, text: l.lower },
    ]);
    return shuffle(faces).map((face, id) => ({ id, ...face }));
  }
  const pictures = sample(MEMORY_SETS[setIndex % MEMORY_SETS.length].pictures, pairs);
  return shuffle([...pictures, ...pictures]).map((picture, id) => ({ id, pair: picture, picture }));
}

/** What the narrator says when a card turns over. */
const sayCard = (card: Card) => (card.picture ? say.picture(card.picture) : say.letterName(LETTERS.find((l) => l.lower === card.pair)!));

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
    <Bouncy accessibilityLabel={faceUp ? (card.picture ?? card.text ?? '') : 'Hidden card'} onPress={onPress} sound={false} disabled={faceUp}>
      <View style={{ width: size, height: size * 1.2 }}>
        <Animated.View style={[styles.face, styles.back, back]}>
          <Pic name="star" size={size * 0.4} style={{ opacity: 0.9 }} />
        </Animated.View>
        <Animated.View style={[styles.face, styles.front, matched && styles.matched, front]}>
          {card.picture ? (
            <Pic name={card.picture} size={size * 0.7} />
          ) : (
            <Txt size={size * 0.62} weight="heavy" color={Colors.purpleDark}>
              {card.text}
            </Txt>
          )}
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
    speak(say.line(isLetterBoard(setIndex) ? 'memoryLetters' : 'memoryIntro'));
    // Only on arrival; each new board announces itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      speak(sayCard(card));
      return;
    }
    busy.current = true;
    const [a, b] = nowOpen.map((id) => cards[id]);
    if (a.pair === b.pair) {
      const nowMatched = new Set(matched).add(a.id).add(b.id);
      setMatched(nowMatched);
      setOpen([]);
      playSfx('chime');
      if (nowMatched.size === cards.length) {
        await speak(sayCard(b), say.line('memoryMatch'));
        await celebrate(true);
        const nextLevel = Math.min(level + 1, LEVELS.length - 1);
        const nextSet = setIndex + 1;
        setLevel(nextLevel);
        setSetIndex(nextSet);
        setCards(deal(LEVELS[nextLevel], nextSet));
        setMatched(new Set());
        speak(say.line(isLetterBoard(nextSet) ? 'memoryLetters' : 'memoryIntro'));
      } else {
        speak(sayCard(b), say.line('memoryMatch'));
      }
      busy.current = false;
    } else {
      speak(sayCard(b));
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
      background="#D5F7E4"
      onRepeat={() => speak(say.line(isLetterBoard(setIndex) ? 'memoryLetters' : 'memoryIntro'))}
      level={level}
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
    ...raised('rgba(20, 110, 70, 0.35)', 4),
  },
  back: { ...gradient('#34D399', '#16A06A', 150), borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  front: { backgroundColor: Colors.white },
  matched: { backgroundColor: '#FFF8D6' },
});
