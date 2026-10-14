import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { LETTERS, SAFARI_LETTERS, SOUND_PICTURES, say } from '@/content/learning';
import { useRound } from '@/hooks/use-round';
import { pick, playSfx, speak } from '@/lib/audio';
import { sample, shuffle } from '@/lib/random';

const CHOICES_BY_LEVEL = [2, 3, 3, 4];

function newQuestion(level: number, previous?: string) {
  let letter = pick(SAFARI_LETTERS);
  if (letter === previous) letter = pick(SAFARI_LETTERS);
  const answer = pick(SOUND_PICTURES[letter]);
  const otherLetters = sample(
    SAFARI_LETTERS.filter((l) => l !== letter),
    CHOICES_BY_LEVEL[level] - 1,
  );
  const others = otherLetters.map((l) => pick(SOUND_PICTURES[l]));
  return { letter, answer, pictures: shuffle([answer, ...others]), key: Math.random() };
}

const letterInfo = (letter: string) => LETTERS.find((l) => l.lower === letter)!;

export default function Sounds() {
  const { width, height } = useWindowDimensions();
  const round = useRound({ total: 5, maxLevel: CHOICES_BY_LEVEL.length - 1 });
  const [question, setQuestion] = useState(() => newQuestion(0));
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  const [found, setFound] = useState(false);
  const [hint, setHint] = useState(false);
  const { celebrate, overlay } = useCelebration();

  const ask = (letter: string) => speak(say.safariFind(letter), say.letterSound(letterInfo(letter)));

  useEffect(() => {
    speak(say.line('safariIntro'), say.safariFind(question.letter), say.letterSound(letterInfo(question.letter)));
    // Only on arrival; later questions announce themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = async (picture: string) => {
    if (found) return;
    if (picture === question.answer) {
      setFound(true);
      playSfx('chime');
      await speak(say.startsWith(picture, question.letter));
      await round.success(celebrate);
      const next = newQuestion(round.level, question.letter);
      setQuestion(next);
      setWiggles({});
      setFound(false);
      setHint(false);
      ask(next.letter);
    } else {
      playSfx('bloop');
      setWiggles((w) => ({ ...w, [picture]: (w[picture] ?? 0) + 1 }));
      if (round.miss() >= 2) setHint(true);
      speak(say.picture(picture), say.line('tryAgain'), say.safariFind(question.letter), say.letterSound(letterInfo(question.letter)));
    }
  };

  const size = Math.min((width - 80) / Math.min(question.pictures.length, 4), height * 0.28, 200);
  const info = letterInfo(question.letter);
  return (
    <GameScreen title="Sound Safari" background="#FFF4D6" onRepeat={() => ask(question.letter)} progress={{ done: round.done, total: round.total }}>
      <View style={styles.body}>
        <View style={styles.guide}>
          <Pic name="lion" size={72} />
          <Bouncy accessibilityLabel={`Letter ${info.upper}`} style={styles.letterTile} onPress={() => ask(question.letter)} sound={false}>
            <Txt size={64} weight="heavy" color={Colors.orange}>
              {info.upper}
              {info.lower}
            </Txt>
          </Bouncy>
        </View>
        <View style={styles.pictures}>
          {question.pictures.map((picture, i) => (
            <Animated.View key={`${question.key}-${picture}-${i}`} entering={ZoomIn.delay(i * 90).springify()}>
              <Choice
                accessibilityLabel={picture}
                wiggle={wiggles[picture] ?? 0}
                glow={found && picture === question.answer}
                hint={hint && picture === question.answer}
                style={{ width: size, height: size }}
                onPress={() => choose(picture)}>
                <Pic name={picture} size={size * 0.72} />
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
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.md },
  guide: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  letterTile: { backgroundColor: Colors.white, borderRadius: 28, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, ...cardShadow },
  pictures: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
});
