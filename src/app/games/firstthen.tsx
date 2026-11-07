import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { GAMES, say, type GameId } from '@/content/learning';
import { speak } from '@/lib/audio';

type Step = 'pickFirst' | 'pickThen' | 'ready' | 'doingFirst' | 'readyThen' | 'doingThen' | 'done';
type Game = (typeof GAMES)[number];

const CHOICES = GAMES.filter((g) => g.id !== 'firstthen');
const game = (id: GameId | null) => GAMES.find((g) => g.id === id);

function PlanCard({ g, label, now, done }: { g: Game | undefined; label: string; now: boolean; done: boolean }) {
  return (
    <View style={[styles.planCard, now && styles.planNow, done && styles.planDone]}>
      <Txt size={22} weight="heavy" color={now ? Colors.white : Colors.textSoft}>
        {label}
      </Txt>
      {g ? <Pic name={g.picture} size={110} /> : <View style={styles.planEmpty} />}
      <Txt size={20} weight="heavy" color={now ? Colors.white : Colors.text} style={styles.center}>
        {g ? g.title : '?'}
      </Txt>
      {done && <Pic name="check" size={44} style={styles.check} />}
    </View>
  );
}

/**
 * First, then: a two-step plan. Pick what to play first and what comes next; the plan shows both,
 * opens the first game, and when she comes back it's time for the next one. Helps with moving from
 * one thing to another, which can be hard to do.
 */
export default function FirstThen() {
  const [step, setStep] = useState<Step>('pickFirst');
  const [first, setFirst] = useState<GameId | null>(null);
  const [then, setThen] = useState<GameId | null>(null);
  const stepRef = useRef<Step>('pickFirst');
  const { celebrate, overlay } = useCelebration();

  const go = (next: Step) => {
    stepRef.current = next;
    setStep(next);
  };

  useEffect(() => {
    speak(say.line('ftFirst'));
  }, []);

  // Coming back from a game moves the plan on.
  useFocusEffect(
    useCallback(() => {
      if (stepRef.current === 'doingFirst') {
        go('readyThen');
        speak(say.line('ftNext'));
      } else if (stepRef.current === 'doingThen') {
        go('done');
        celebrate(true);
        speak(say.line('ftDone'));
      }
      // celebrate is stable enough for this; only focus changes matter.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const pick = (id: GameId) => {
    if (step === 'pickFirst') {
      setFirst(id);
      go('pickThen');
      speak(say.line('ftThen'));
    } else {
      setThen(id);
      go('ready');
      speak(say.line('ftReady'));
    }
  };

  const start = () => {
    const id = step === 'ready' ? first : then;
    go(step === 'ready' ? 'doingFirst' : 'doingThen');
    router.push(`/games/${id}` as Href);
  };

  const reset = () => {
    setFirst(null);
    setThen(null);
    go('pickFirst');
    speak(say.line('ftFirst'));
  };

  const picking = step === 'pickFirst' || step === 'pickThen';
  const firstDone = step === 'readyThen' || step === 'doingThen' || step === 'done';

  return (
    <GameScreen title="First, then" background="#F1EAFE" onRepeat={() => speak(say.line(picking ? (step === 'pickFirst' ? 'ftFirst' : 'ftThen') : 'ftReady'))}>
      <View style={styles.body}>
        <View style={styles.plan}>
          <PlanCard g={game(first)} label="First" now={step === 'pickFirst' || step === 'ready'} done={firstDone} />
          <Txt size={48} weight="heavy" color={Colors.purple}>
            →
          </Txt>
          <PlanCard g={game(then)} label="Then" now={step === 'pickThen' || step === 'readyThen'} done={step === 'done'} />
        </View>

        {picking ? (
          <ScrollView contentContainerStyle={styles.grid}>
            {CHOICES.filter((g) => g.id !== first).map((g) => (
              <Bouncy key={g.id} accessibilityLabel={g.title} style={styles.choice} onPress={() => pick(g.id)}>
                <Pic name={g.picture} size={56} />
                <Txt size={15} weight="heavy" style={styles.center} numberOfLines={2}>
                  {g.title}
                </Txt>
              </Bouncy>
            ))}
          </ScrollView>
        ) : step === 'done' ? (
          <Bouncy accessibilityLabel="Make a new plan" style={[styles.button, { backgroundColor: Colors.purple }]} onPress={reset}>
            <Txt size={26} weight="heavy" color={Colors.white}>
              New plan
            </Txt>
          </Bouncy>
        ) : (
          <Bouncy accessibilityLabel="Start" style={[styles.button, { backgroundColor: Colors.green }]} onPress={start}>
            <Txt size={26} weight="heavy" color={Colors.white}>
              {step === 'ready' ? `Start ${game(first)?.title}` : `Now ${game(then)?.title}`}
            </Txt>
          </Bouncy>
        )}
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.lg },
  plan: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planCard: { width: 210, minHeight: 230, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: 30, backgroundColor: Colors.white, ...cardShadow },
  planNow: { backgroundColor: Colors.purple },
  planDone: { opacity: 0.75 },
  planEmpty: { width: 110, height: 110, borderRadius: 24, borderWidth: 4, borderStyle: 'dashed', borderColor: '#D5C9F2' },
  check: { position: 'absolute', top: 10, right: 10 },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, paddingBottom: Spacing.md },
  choice: { width: 130, height: 120, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 22, backgroundColor: Colors.white, ...cardShadow },
  button: { paddingHorizontal: Spacing.xl, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', ...cardShadow },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
