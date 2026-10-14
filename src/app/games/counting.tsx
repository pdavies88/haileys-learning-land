import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn, ZoomOut, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { ADDITION, MISSIONS, say, type Mission } from '@/content/learning';
import { useRound } from '@/hooks/use-round';
import { pick, playSfx, speak } from '@/lib/audio';
import { randomInt, shuffle } from '@/lib/random';

type Question =
  | { kind: 'feed'; mission: Mission; target: number; items: number; key: number }
  | { kind: 'find'; target: number; choices: number[]; key: number }
  | { kind: 'add'; a: number; b: number; picture: string; choices: number[]; key: number };

function numberChoices(answer: number, count: number, max: number) {
  const options = new Set([answer]);
  while (options.size < count) {
    const n = Math.max(0, Math.min(max, answer + randomInt(-3, 3)));
    options.add(n);
  }
  return shuffle([...options]);
}

function newQuestion(level: number): Question {
  const key = Math.random();
  const kind = level === 0 ? 'feed' : level === 1 ? pick(['feed', 'feed', 'find'] as const) : level === 2 ? pick(['feed', 'find'] as const) : pick(['add', 'find', 'feed'] as const);
  if (kind === 'feed') {
    const target = level === 0 ? randomInt(1, 5) : randomInt(3, 10);
    return { kind, mission: pick(MISSIONS), target, items: Math.min(target + 3, 12), key };
  }
  if (kind === 'find') {
    const max = level >= 2 ? 20 : 10;
    const target = randomInt(0, max);
    return { kind, target, choices: numberChoices(target, level >= 2 ? 4 : 3, max), key };
  }
  const [a, b] = pick(ADDITION.filter(([x, y]) => x + y <= (level >= 3 ? 10 : 5)));
  return { kind: 'add', a, b, picture: pick(['apple', 'star', 'strawberry', 'cupcake', 'heart']), choices: numberChoices(a + b, 3, 10), key };
}

function promptFor(q: Question) {
  if (q.kind === 'feed') return say.mission(q.mission, q.target);
  if (q.kind === 'find') return say.findNumber(q.target);
  return say.addition(q.a, q.b);
}

/** The hungry animal: it bounces happily every time it gets a treat. */
function Animal({ name, size, fed }: { name: string; size: number; fed: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (fed > 0) scale.value = withSequence(withSpring(1.15), withSpring(1));
  }, [fed, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pic name={name} size={size} />
    </Animated.View>
  );
}

export default function Counting() {
  const { width, height } = useWindowDimensions();
  const round = useRound({ total: 5, maxLevel: 3 });
  const [question, setQuestion] = useState<Question>(() => newQuestion(0));
  const [eaten, setEaten] = useState<number[]>([]);
  const [wiggles, setWiggles] = useState<Record<number, number>>({});
  const [found, setFound] = useState(false);
  const [hint, setHint] = useState(false);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('countIntro'), promptFor(question));
    // Only on arrival; later questions announce themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => {
    const q = newQuestion(round.level);
    setQuestion(q);
    setEaten([]);
    setWiggles({});
    setFound(false);
    setHint(false);
    speak(promptFor(q));
  };

  const feed = async (item: number) => {
    if (question.kind !== 'feed' || found || eaten.includes(item)) return;
    const nowEaten = [...eaten, item];
    setEaten(nowEaten);
    playSfx('pop');
    if (nowEaten.length < question.target) {
      speak(say.number(nowEaten.length));
      return;
    }
    setFound(true);
    await speak(say.number(nowEaten.length));
    await round.success(celebrate);
    next();
  };

  const answer = async (n: number) => {
    if (question.kind === 'feed' || found) return;
    const right = question.kind === 'find' ? question.target : question.a + question.b;
    if (n === right) {
      setFound(true);
      playSfx('chime');
      await speak(say.number(n));
      await round.success(celebrate);
      next();
    } else {
      playSfx('bloop');
      setWiggles((w) => ({ ...w, [n]: (w[n] ?? 0) + 1 }));
      if (round.miss() >= 2) setHint(true);
      speak(say.line('tryAgain'), promptFor(question));
    }
  };

  const short = Math.min(width, height);
  let body;
  if (question.kind === 'feed') {
    const itemSize = Math.min(short * 0.16, 90);
    body = (
      <View style={[styles.feed, width > height && styles.feedWide]}>
        <View style={styles.animalSpot}>
          <Animal name={question.mission.animal} size={Math.min(short * 0.32, 220)} fed={eaten.length} />
          <View style={styles.counter}>
            <Txt size={34} weight="heavy" color={Colors.orange}>
              {eaten.length} / {question.target}
            </Txt>
          </View>
        </View>
        <View style={[styles.tray, { maxWidth: itemSize * 5 + Spacing.md * 6 }]}>
          {Array.from({ length: question.items }, (_, i) =>
            eaten.includes(i) ? (
              <View key={i} style={{ width: itemSize, height: itemSize }} />
            ) : (
              <Animated.View key={`${question.key}-${i}`} entering={ZoomIn.delay(i * 40)} exiting={ZoomOut}>
                <Bouncy accessibilityLabel={question.mission.foodOne} onPress={() => feed(i)} sound={false} style={{ padding: 4 }}>
                  <Pic name={question.mission.food} size={itemSize} />
                </Bouncy>
              </Animated.View>
            ),
          )}
        </View>
      </View>
    );
  } else {
    const cardSize = Math.min(short * 0.24, 150);
    body = (
      <View style={styles.numbers}>
        {question.kind === 'add' ? (
          <View style={styles.sum}>
            <View style={styles.group}>
              {Array.from({ length: question.a }, (_, i) => (
                <Pic key={i} name={question.picture} size={44} />
              ))}
            </View>
            <Txt size={48} weight="heavy" color={Colors.purpleDark}>
              +
            </Txt>
            <View style={styles.group}>
              {Array.from({ length: question.b }, (_, i) => (
                <Pic key={i} name={question.picture} size={44} />
              ))}
            </View>
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
                glow={found && n === (question.kind === 'find' ? question.target : question.a + question.b)}
                hint={hint && n === (question.kind === 'find' ? question.target : question.a + question.b)}
                style={{ width: cardSize, height: cardSize }}
                onPress={() => answer(n)}>
                <Txt size={cardSize * 0.5} weight="heavy" color={Colors.orange}>
                  {n}
                </Txt>
              </Choice>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <GameScreen title="Count & Collect" background="#FFEBDC" onRepeat={() => speak(promptFor(question))} progress={{ done: round.done, total: round.total }}>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  feed: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', padding: Spacing.md },
  feedWide: { flexDirection: 'row-reverse' },
  animalSpot: { alignItems: 'center', gap: Spacing.sm },
  counter: { backgroundColor: Colors.white, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: 4, ...cardShadow },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
  numbers: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, padding: Spacing.md },
  sum: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  group: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 150, gap: 4, justifyContent: 'center', backgroundColor: Colors.white, borderRadius: 20, padding: Spacing.sm, ...cardShadow },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
});
