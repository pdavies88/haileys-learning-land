import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { GameScreen } from '@/components/game-screen';
import { HelpButton } from '@/components/help-button';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, raised } from '@/constants/theme';
import { LETTERS, SAFARI_LETTERS, SOUND_PICTURES, say } from '@/content/learning';
import { useHelp } from '@/hooks/use-help';
import { useLock } from '@/hooks/use-lock';
import { useRound } from '@/hooks/use-round';
import { pick, playSfx, speak } from '@/lib/audio';
import { sample, shuffle } from '@/lib/random';

// Level -> how many choices, and how often she picks the letter for a picture instead of the
// picture for a letter.
const LEVELS = [
  { choices: 3, letterPick: 0 },
  { choices: 4, letterPick: 0.3 },
  { choices: 3, letterPick: 0.6 },
  { choices: 4, letterPick: 0.7 },
];

type Question = { kind: 'picture' | 'letter'; letter: string; answer: string; pictures: string[]; letters: string[]; key: number };

function newQuestion(level: number, previous?: string): Question {
  const { choices, letterPick } = LEVELS[level];
  let letter = pick(SAFARI_LETTERS);
  if (letter === previous) letter = pick(SAFARI_LETTERS);
  const answer = pick(SOUND_PICTURES[letter]);
  const otherLetters = sample(
    SAFARI_LETTERS.filter((l) => l !== letter),
    choices - 1,
  );
  const others = otherLetters.map((l) => pick(SOUND_PICTURES[l]));
  return {
    kind: Math.random() < letterPick ? 'letter' : 'picture',
    letter,
    answer,
    pictures: shuffle([answer, ...others]),
    letters: shuffle([letter, ...otherLetters]),
    key: Math.random(),
  };
}

const letterInfo = (letter: string) => LETTERS.find((l) => l.lower === letter)!;

export default function Sounds() {
  const { width, height } = useWindowDimensions();
  const round = useRound({ total: 6, maxLevel: LEVELS.length - 1, start: 1 });
  const [question, setQuestion] = useState(() => newQuestion(1));
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  const [found, setFound] = useState(false);
  const { celebrate, overlay } = useCelebration();
  const lock = useLock();
  const help = useHelp<string>();

  const promptFor = (q: Question) =>
    q.kind === 'picture' ? [say.safariFind(q.letter)] : [say.picture(q.answer), say.line('whichLetter')];

  useEffect(() => {
    speak(say.line('safariIntro'), ...promptFor(question));
    // Only on arrival; later questions announce themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = async (choice: string) => {
    if (found) return;
    const target = question.kind === 'picture' ? question.answer : question.letter;
    if (choice === target) {
      if (!lock.take()) return;
      setFound(true);
      playSfx('chime');
      // Celebrate straight away; "Apple starts with A!" is said as part of the cheer.
      await round.success(celebrate);
      const next = newQuestion(round.level, question.letter);
      setQuestion(next);
      setWiggles({});
      setFound(false);
      help.reset();
      lock.release();
      speak(...promptFor(next));
    } else {
      playSfx('bloop');
      setWiggles((w) => ({ ...w, [choice]: (w[choice] ?? 0) + 1 }));
      const offer = help.miss(round.miss(), choice);
      const named = question.kind === 'picture' ? say.picture(choice) : say.letterName(letterInfo(choice));
      speak(named, say.line('tryAgain'), ...promptFor(question), ...offer);
    }
  };

  const info = letterInfo(question.letter);
  const choices = question.kind === 'picture' ? question.pictures : question.letters;
  const target = question.kind === 'picture' ? question.answer : question.letter;
  const count = question.kind === 'picture' ? question.pictures.length : question.letters.length;
  const size = Math.min((width - 80) / Math.min(count, 4), height * 0.26, 190);
  return (
    <GameScreen
      title="Sound safari"
      background="#FFEFC7"
      onRepeat={() => speak(...promptFor(question))}
      progress={{ done: round.done, total: round.total }}
      level={round.level}>
      <View style={styles.body}>
        {question.kind === 'picture' ? (
          <View style={styles.guide}>
            <Pic name="lion" size={72} />
            <Bouncy accessibilityLabel={`Letter ${info.upper}`} style={styles.letterTile} onPress={() => speak(...promptFor(question))} sound={false}>
              <Txt size={64} weight="heavy" color={Colors.orange}>
                {info.upper}
                {info.lower}
              </Txt>
            </Bouncy>
          </View>
        ) : (
          <Bouncy accessibilityLabel={question.answer} style={styles.pictureTile} onPress={() => speak(...promptFor(question))} sound={false}>
            <Pic name={question.answer} size={Math.min(height * 0.22, 170)} />
          </Bouncy>
        )}
        <View style={styles.pictures}>
          {question.kind === 'picture'
            ? question.pictures.map((picture, i) => (
                <Animated.View key={`${question.key}-${picture}-${i}`} entering={ZoomIn.delay(i * 90).springify()}>
                  <Choice
                    accessibilityLabel={picture}
                    wiggle={wiggles[picture] ?? 0}
                    glow={found && picture === question.answer}
                    gone={help.isGone(picture)}
                    style={{ width: size, height: size }}
                    onPress={() => choose(picture)}>
                    <Pic name={picture} size={size * 0.72} />
                  </Choice>
                </Animated.View>
              ))
            : question.letters.map((letter, i) => (
                <Animated.View key={`${question.key}-${letter}`} entering={ZoomIn.delay(i * 90).springify()}>
                  <Choice
                    accessibilityLabel={`Letter ${letter}`}
                    wiggle={wiggles[letter] ?? 0}
                    glow={found && letter === question.letter}
                    gone={help.isGone(letter)}
                    style={{ width: size * 0.8, height: size * 0.8 }}
                    onPress={() => choose(letter)}>
                    <Txt size={size * 0.4} weight="heavy" color={Colors.orange}>
                      {letter.toUpperCase()}
                      {letter}
                    </Txt>
                  </Choice>
                </Animated.View>
              ))}
        </View>
        <HelpButton
          visible={help.canHelp(choices, target)}
          onPress={() => help.help(choices, target)}
        />
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.md },
  guide: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  letterTile: { backgroundColor: Colors.white, borderRadius: 28, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, ...raised('#F2D58A') },
  pictureTile: { backgroundColor: Colors.white, borderRadius: 999, padding: Spacing.lg, ...raised('#F2D58A') },
  pictures: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
});
