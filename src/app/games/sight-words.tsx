import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { SpellWord } from '@/components/spell-word';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, raised } from '@/constants/theme';
import { RHYMES, SIGHT_WORDS, SIGHT_WORDS_EASY, SPELL_WORDS, say } from '@/content/learning';
import { useRound } from '@/hooks/use-round';
import { pick, playSfx, speak } from '@/lib/audio';
import { sample, shuffle } from '@/lib/random';

/**
 * Word Detective has four kinds of question, and each level mixes in harder ones:
 * find the word you hear, read a word and pick its picture, spell a word, and find a rhyme.
 */
type Question =
  | { kind: 'find'; target: string; cards: string[]; key: number }
  | { kind: 'read'; target: string; cards: string[]; key: number }
  | { kind: 'spell'; target: string; decoys: number; key: number }
  | { kind: 'rhyme'; prompt: string; target: string; cards: string[]; key: number };

const KINDS: Question['kind'][][] = [
  ['find', 'find', 'read'],
  ['find', 'read', 'spell'],
  ['read', 'spell', 'rhyme', 'find'],
  ['spell', 'rhyme', 'read', 'find'],
  ['spell', 'spell', 'rhyme', 'find'],
];

function newQuestion(level: number, previous?: string): Question {
  const key = Math.random();
  const kind = pick(KINDS[level]);
  const fresh = (words: readonly string[]) => {
    const choices = words.filter((w) => w !== previous);
    return pick(choices.length ? choices : words);
  };
  if (kind === 'find') {
    const words = level < 2 ? SIGHT_WORDS_EASY : SIGHT_WORDS;
    const target = fresh(words);
    const count = level === 0 ? 3 : 4;
    return { kind, target, cards: shuffle([target, ...sample(words.filter((w) => w !== target), count - 1)]), key };
  }
  if (kind === 'read') {
    const words = level < 3 ? SPELL_WORDS[0] : [...SPELL_WORDS[0], ...SPELL_WORDS[1]];
    const target = fresh(words);
    return { kind, target, cards: shuffle([target, ...sample(words.filter((w) => w !== target), 2)]), key };
  }
  if (kind === 'spell') {
    const words = SPELL_WORDS[level <= 2 ? 0 : level === 3 ? 1 : pick([1, 2])];
    return { kind, target: fresh(words), decoys: level <= 2 ? 2 : 3, key };
  }
  const group = pick(RHYMES);
  const [prompt, target] = sample(group, 2);
  const others = sample(
    RHYMES.filter((g) => g !== group).map((g) => pick(g)),
    level >= 4 ? 3 : 2,
  );
  return { kind, prompt, target, cards: shuffle([target, ...others]), key };
}

function promptFor(q: Question): string[] {
  if (q.kind === 'find') return [say.findWord(q.target)];
  if (q.kind === 'read') return [say.line('readPicture')];
  if (q.kind === 'spell') return [say.spell(q.target), say.line('spellIt')];
  return [say.rhyme(q.prompt)];
}

export default function SightWords() {
  const { width, height } = useWindowDimensions();
  const round = useRound({ total: 6, maxLevel: KINDS.length - 1, start: 1 });
  const [question, setQuestion] = useState(() => newQuestion(1));
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  const [found, setFound] = useState(false);
  const [hint, setHint] = useState(false);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('detectiveIntro'), ...promptFor(question));
    // Only on arrival; later questions announce themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    const q = newQuestion(round.level, 'target' in question ? question.target : undefined);
    setQuestion(q);
    setWiggles({});
    setFound(false);
    setHint(false);
    speak(...promptFor(q));
  };

  const right = async (spoken: string) => {
    setFound(true);
    playSfx('chime');
    await speak(spoken);
    await round.success(celebrate);
    next();
  };

  const wrong = (card: string, spoken: string) => {
    playSfx('bloop');
    setWiggles((w) => ({ ...w, [card]: (w[card] ?? 0) + 1 }));
    if (round.miss() >= 2) setHint(true);
    speak(spoken, say.line('tryAgain'), ...promptFor(question));
  };

  const choose = (card: string) => {
    if (found || question.kind === 'spell') return;
    const spoken = question.kind === 'find' ? say.word(card) : say.picture(card);
    if (card === question.target) right(spoken);
    else wrong(card, spoken);
  };

  let body;
  if (question.kind === 'spell') {
    body = (
      <SpellWord
        key={question.key}
        word={question.target}
        decoys={question.decoys}
        onMiss={() => round.miss()}
        onDone={async () => {
          await speak(say.picture(question.target));
          await round.success(celebrate);
          next();
        }}
      />
    );
  } else if (question.kind === 'find') {
    const cardWidth = Math.min(width * 0.4, 230);
    body = (
      <View style={styles.body}>
        <View style={styles.detective}>
          <Pic name="fox" size={80} />
          <Pic name="magnifier" size={52} style={styles.glass} />
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
                style={{ width: cardWidth, height: cardWidth * 0.58 }}
                onPress={() => choose(word)}>
                <Txt size={Math.min(60, cardWidth * 0.28)} weight="heavy" color={Colors.purpleDark}>
                  {word}
                </Txt>
              </Choice>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  } else {
    // Pictures to choose from: read the word, or find what rhymes with the picture at the top.
    const size = Math.min((width - 80) / question.cards.length, height * 0.24, 180);
    body = (
      <View style={styles.body}>
        {question.kind === 'read' ? (
          <View style={styles.wordCard}>
            <Txt size={Math.min(84, width * 0.16)} weight="heavy" color={Colors.purpleDark} style={styles.reading}>
              {question.target}
            </Txt>
          </View>
        ) : (
          <View style={styles.rhymeCard}>
            <Pic name={question.prompt} size={Math.min(120, height * 0.16)} />
            <Txt size={20} weight="regular" color={Colors.textSoft}>
              What rhymes with {question.prompt}?
            </Txt>
          </View>
        )}
        <View style={styles.cards}>
          {question.cards.map((picture, i) => (
            <Animated.View key={`${question.key}-${picture}`} entering={ZoomIn.delay(i * 80).springify()}>
              <Choice
                accessibilityLabel={picture}
                wiggle={wiggles[picture] ?? 0}
                glow={found && picture === question.target}
                hint={hint && picture === question.target}
                style={{ width: size, height: size }}
                onPress={() => choose(picture)}>
                <Pic name={picture} size={size * 0.7} />
              </Choice>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <GameScreen
      title="Word Detective"
      background="#DCEBFF"
      onRepeat={() => speak(...promptFor(question))}
      progress={{ done: round.done, total: round.total }}
      level={round.level}>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  detective: { flexDirection: 'row', alignItems: 'flex-end' },
  glass: { marginLeft: -18, transform: [{ rotate: '-20deg' }] },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, marginTop: Spacing.md },
  wordCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...raised('#C9D9F5'),
  },
  reading: { letterSpacing: 6 },
  rhymeCard: { alignItems: 'center', gap: Spacing.sm },
});
