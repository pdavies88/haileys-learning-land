import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing } from '@/constants/theme';
import { SIGHT_WORDS, SIGHT_WORDS_EASY, say } from '@/content/learning';
import { useRound } from '@/hooks/use-round';
import { pick, playSfx, speak } from '@/lib/audio';
import { sample, shuffle } from '@/lib/random';

// Level -> how many word cards, and which words.
const LEVELS = [
  { choices: 2, words: SIGHT_WORDS_EASY },
  { choices: 3, words: SIGHT_WORDS_EASY },
  { choices: 3, words: SIGHT_WORDS },
  { choices: 4, words: SIGHT_WORDS },
];

function newQuestion(level: number, previous?: string) {
  const { choices, words } = LEVELS[level];
  let target = pick(words);
  if (target === previous) target = pick(words);
  const others = sample(
    words.filter((w) => w !== target),
    choices - 1,
  );
  return { target, cards: shuffle([target, ...others]), key: Math.random() };
}

export default function SightWords() {
  const { width } = useWindowDimensions();
  const round = useRound({ total: 5, maxLevel: LEVELS.length - 1 });
  const [question, setQuestion] = useState(() => newQuestion(0));
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  const [found, setFound] = useState(false);
  const [hint, setHint] = useState(false);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('detectiveIntro'), say.findWord(question.target));
    // Only on arrival; later questions announce themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = async (word: string) => {
    if (found) return;
    if (word === question.target) {
      setFound(true);
      playSfx('chime');
      await speak(say.word(word));
      await round.success(celebrate);
      const next = newQuestion(round.level, question.target);
      setQuestion(next);
      setWiggles({});
      setFound(false);
      setHint(false);
      speak(say.findWord(next.target));
    } else {
      playSfx('bloop');
      setWiggles((w) => ({ ...w, [word]: (w[word] ?? 0) + 1 }));
      const misses = round.miss();
      if (misses >= 2) setHint(true);
      speak(say.word(word), say.line('tryAgain'), say.findWord(question.target));
    }
  };

  const cardWidth = Math.min(width * 0.38, 240);
  return (
    <GameScreen
      title="Word Detective"
      background="#E3F1FF"
      onRepeat={() => speak(say.findWord(question.target))}
      progress={{ done: round.done, total: round.total }}>
      <View style={styles.body}>
        <View style={styles.detective}>
          <Pic name="fox" size={86} />
          <Pic name="magnifier" size={56} style={styles.glass} />
        </View>
        <Txt size={20} weight="regular" color={Colors.textSoft}>
          Find the word you hear
        </Txt>
        <View style={styles.cards}>
          {question.cards.map((word, i) => (
            <Animated.View key={`${question.key}-${word}`} entering={ZoomIn.delay(i * 80).springify()}>
              <Choice
                accessibilityLabel={word}
                wiggle={wiggles[word] ?? 0}
                glow={found && word === question.target}
                hint={hint && word === question.target}
                style={{ width: cardWidth, height: cardWidth * 0.62 }}
                onPress={() => choose(word)}>
                <Txt size={Math.min(64, cardWidth * 0.3)} weight="heavy" color={Colors.purpleDark}>
                  {word}
                </Txt>
              </Choice>
            </Animated.View>
          ))}
        </View>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  detective: { flexDirection: 'row', alignItems: 'flex-end' },
  glass: { marginLeft: -18, transform: [{ rotate: '-20deg' }] },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, marginTop: Spacing.md },
});
