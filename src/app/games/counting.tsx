import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { FeedTray } from '@/components/feed-tray';
import { GameScreen } from '@/components/game-screen';
import { HelpButton } from '@/components/help-button';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, cardShadow, raised } from '@/constants/theme';
import { ADDITION, MISSIONS, SUBTRACTION, say, type Mission } from '@/content/learning';
import { useHelp } from '@/hooks/use-help';
import { useLock } from '@/hooks/use-lock';
import { useRound } from '@/hooks/use-round';
import { pick, playSfx, speak } from '@/lib/audio';
import { randomInt, shuffle } from '@/lib/random';

type Question =
  | { kind: 'feed'; mission: Mission; target: number; items: number; key: number }
  | { kind: 'find'; target: number; choices: number[]; key: number }
  | { kind: 'add'; a: number; b: number; picture: string; choices: number[]; key: number }
  | { kind: 'sub'; a: number; b: number; picture: string; choices: number[]; key: number }
  | { kind: 'missing'; sequence: number[]; gap: number; choices: number[]; key: number }
  | { kind: 'compare'; more: boolean; groups: [number, number]; picture: string; key: number };

const PICTURES = ['apple', 'star', 'strawberry', 'cupcake', 'heart', 'butterfly', 'fish', 'flower'];

function numberChoices(answer: number, count: number, max: number) {
  const options = new Set([answer]);
  while (options.size < count) {
    const n = Math.max(0, Math.min(max, answer + randomInt(-3, 3)));
    options.add(n);
  }
  return shuffle([...options]);
}

// Which kinds of question each level asks. Feeding animals is the warm-up; later levels add
// sums, take-aways, number patterns and comparing groups.
const KINDS: Question['kind'][][] = [
  ['feed', 'find', 'missing'],
  ['missing', 'compare', 'add', 'find'],
  ['add', 'sub', 'missing', 'compare'],
  ['add', 'sub', 'sub', 'missing', 'compare'],
];

function newQuestion(level: number): Question {
  const key = Math.random();
  const kind = pick(KINDS[level]);
  if (kind === 'feed') {
    const target = randomInt(4, 10);
    return { kind, mission: pick(MISSIONS), target, items: Math.min(target + 3, 12), key };
  }
  if (kind === 'find') {
    const target = randomInt(level === 0 ? 5 : 10, 20);
    return { kind, target, choices: numberChoices(target, 4, 20), key };
  }
  if (kind === 'missing') {
    // Four numbers in a row with one hidden. At the top level the row can count down.
    const down = level >= 3 && Math.random() < 0.4;
    const start = randomInt(level === 0 ? 1 : 3, level === 0 ? 7 : 16);
    const sequence = Array.from({ length: 4 }, (_, i) => (down ? start + 3 - i : start + i));
    const gap = randomInt(1, 3);
    return { kind, sequence, gap, choices: numberChoices(sequence[gap], 3, 20), key };
  }
  if (kind === 'compare') {
    const big = randomInt(level >= 2 ? 6 : 4, 10);
    // The difference shrinks as she gets better, so she has to count rather than guess.
    const small = big - randomInt(1, level >= 2 ? 2 : 4);
    const groups: [number, number] = Math.random() < 0.5 ? [big, Math.max(1, small)] : [Math.max(1, small), big];
    return { kind, more: level < 3 ? Math.random() < 0.7 : Math.random() < 0.5, groups, picture: pick(PICTURES), key };
  }
  if (kind === 'sub') {
    const [a, b] = pick(SUBTRACTION.filter(([x]) => x <= (level >= 3 ? 10 : 6)));
    return { kind, a, b, picture: pick(PICTURES), choices: numberChoices(a - b, 3, 10), key };
  }
  const [a, b] = pick(ADDITION.filter(([x, y]) => x + y <= (level >= 2 ? 10 : 6)));
  return { kind: 'add', a, b, picture: pick(PICTURES), choices: numberChoices(a + b, 3, 10), key };
}

function promptFor(q: Question): string[] {
  if (q.kind === 'feed') return [say.mission(q.mission, q.target)];
  if (q.kind === 'find') return [say.findNumber(q.target)];
  if (q.kind === 'missing') return [say.line('missingNumber')];
  if (q.kind === 'compare') return [say.line(q.more ? 'whichMore' : 'whichFewer')];
  if (q.kind === 'sub') return [say.subtraction(q.a, q.b)];
  return [say.addition(q.a, q.b)];
}

function answerOf(q: Question): number {
  if (q.kind === 'find') return q.target;
  if (q.kind === 'add') return q.a + q.b;
  if (q.kind === 'sub') return q.a - q.b;
  if (q.kind === 'missing') return q.sequence[q.gap];
  if (q.kind === 'compare') return q.more === q.groups[0] > q.groups[1] ? 0 : 1;
  return q.target;
}

/** A card of pictures: `count` of them, with the last `crossed` faded out for take-aways. */
function Group({ picture, count, crossed = 0, size = 40 }: { picture: string; count: number; crossed?: number; size?: number }) {
  return (
    <View style={[styles.group, { maxWidth: size * 5 + 30 }]}>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} entering={ZoomIn.delay(i * 40)}>
          <Pic name={picture} size={size} style={i >= count - crossed ? styles.crossed : undefined} />
        </Animated.View>
      ))}
    </View>
  );
}

export default function Counting() {
  const { width, height } = useWindowDimensions();
  const round = useRound({ total: 6, maxLevel: KINDS.length - 1 });
  const [question, setQuestion] = useState<Question>(() => newQuestion(0));
  const [wiggles, setWiggles] = useState<Record<number, number>>({});
  const [found, setFound] = useState(false);
  const { celebrate, overlay } = useCelebration();
  const lock = useLock();
  const help = useHelp<number>();

  useEffect(() => {
    speak(say.line('countIntro'), ...promptFor(question));
    // Only on arrival; later questions announce themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    const q = newQuestion(round.level);
    setQuestion(q);
    setWiggles({});
    setFound(false);
    help.reset();
    lock.release();
    speak(...promptFor(q));
  };

  const answer = async (n: number) => {
    if (question.kind === 'feed' || found) return;
    if (n === answerOf(question)) {
      if (!lock.take()) return;
      setFound(true);
      playSfx('chime');
      // Celebrate straight away; the number is said as part of the cheer.
      await round.success(celebrate);
      next();
    } else {
      playSfx('bloop');
      setWiggles((w) => ({ ...w, [n]: (w[n] ?? 0) + 1 }));
      const offer = question.kind === 'compare' ? [] : help.miss(round.miss(), n);
      if (question.kind === 'compare') round.miss();
      speak(say.line('tryAgain'), ...promptFor(question), ...offer);
    }
  };

  const short = Math.min(width, height);
  let body;
  if (question.kind === 'feed') {
    body = (
      <FeedTray
        key={question.key}
        mission={question.mission}
        target={question.target}
        onDone={async () => {
          if (!lock.take()) return;
          setFound(true);
          await round.success(celebrate);
          next();
        }}
      />
    );
  } else if (question.kind === 'compare') {
    const size = Math.min(short * 0.075, 46);
    body = (
      <View style={styles.numbers}>
        <Pic name="owl" size={80} />
        <View style={styles.choiceRow}>
          {question.groups.map((count, i) => (
            <Animated.View key={`${question.key}-${i}`} entering={ZoomIn.delay(i * 120).springify()}>
              <Choice
                accessibilityLabel={`Group ${i + 1}`}
                wiggle={wiggles[i] ?? 0}
                glow={found && i === answerOf(question)}
                style={styles.compareCard}
                onPress={() => answer(i)}>
                <Group picture={question.picture} count={count} size={size} />
              </Choice>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  } else {
    const cardSize = Math.min(short * 0.22, 140);
    const right = answerOf(question);
    body = (
      <View style={styles.numbers}>
        {question.kind === 'add' ? (
          <View style={styles.sum}>
            <Group picture={question.picture} count={question.a} />
            <Txt size={48} weight="heavy" color={Colors.purpleDark}>
              +
            </Txt>
            <Group picture={question.picture} count={question.b} />
          </View>
        ) : question.kind === 'sub' ? (
          <View style={styles.sum}>
            <Group picture={question.picture} count={question.a} crossed={question.b} />
            <Txt size={30} weight="heavy" color={Colors.purpleDark}>
              {question.a} − {question.b} = ?
            </Txt>
          </View>
        ) : question.kind === 'missing' ? (
          <View style={styles.sequence}>
            {question.sequence.map((n, i) => (
              <View key={i} style={[styles.seqCard, i === question.gap && styles.seqGap]}>
                <Txt size={44} weight="heavy" color={i === question.gap ? Colors.orange : Colors.purpleDark}>
                  {i === question.gap ? (found ? n : '?') : n}
                </Txt>
              </View>
            ))}
          </View>
        ) : (
          <Pic name="owl" size={96} />
        )}
        <View style={styles.choiceRow}>
          {question.choices.map((n, i) => (
            <Animated.View key={`${question.key}-${n}`} entering={ZoomIn.delay(i * 80).springify()}>
              <Choice
                accessibilityLabel={String(n)}
                wiggle={wiggles[n] ?? 0}
                glow={found && n === right}
                gone={help.isGone(n)}
                style={{ width: cardSize, height: cardSize }}
                onPress={() => answer(n)}>
                <Txt size={cardSize * 0.5} weight="heavy" color={Colors.orange}>
                  {n}
                </Txt>
              </Choice>
            </Animated.View>
          ))}
        </View>
        <HelpButton visible={help.canHelp(question.choices, right)} onPress={() => help.help(question.choices, right)} />
      </View>
    );
  }

  return (
    <GameScreen
      title="Count & collect"
      background="#FFE4D1"
      onRepeat={() => speak(...promptFor(question))}
      progress={{ done: round.done, total: round.total }}
      level={round.level}>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  numbers: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, padding: Spacing.md },
  sum: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center', backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.sm, ...cardShadow },
  crossed: { opacity: 0.22, transform: [{ scale: 0.8 }, { rotate: '-12deg' }] },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
  compareCard: { padding: Spacing.sm, minWidth: 140, minHeight: 140 },
  sequence: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  seqCard: { width: 76, height: 86, borderRadius: Radius.md, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...raised('#F1D3BD', 5) },
  seqGap: { borderWidth: 3, borderColor: Colors.orange, borderStyle: 'dashed' },
});
