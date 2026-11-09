/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers, not during render. */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, speak } from '@/lib/audio';

const COUNT_MS = 1000;
const COUNTS = 4;
const BREATHS = 4; // breaths to fill the stars
const SMALL = 0.55;
const BIG = 1.15;
const IN_COLOR = Colors.blue;
const OUT_COLOR = Colors.green;

type Phase = 'ready' | 'in' | 'full' | 'out';

/**
 * Breathe with me: hold the balloon and breathe in while it fills, one, two, three, four. Let go
 * and breathe out while it shrinks, one, two, three, four. The narrator counts both. Four dots
 * show the count and four stars fill as she goes, so nothing needs reading. A calm corner to come
 * back to whenever she needs it.
 */
export default function Breathe() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(0);
  const [stars, setStars] = useState(0);
  const live = useRef({ run: 0, holding: false, phase: 'ready' as Phase, reached: false });
  const size = useSharedValue(SMALL);
  const nudge = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const { celebrate, overlay } = useCelebration();

  const to = (p: Phase) => {
    live.current.phase = p;
    setPhase(p);
  };

  useEffect(() => {
    speak(say.line('brIntro'));
    const s = live.current;
    return () => {
      s.run += 1;
    };
  }, []);

  // The pointing hand bobs while the balloon waits to be held.
  useEffect(() => {
    if (phase !== 'ready' || reduceMotion) {
      cancelAnimation(nudge);
      nudge.set(0);
      return;
    }
    nudge.set(withRepeat(withSequence(withTiming(-10, { duration: 600 }), withTiming(0, { duration: 600 })), -1));
  }, [phase, reduceMotion, nudge]);

  /** Counts one to four with the narrator; the first count is the step's name. */
  const countFour = async (id: number, first: 'brIn' | 'brOut') => {
    for (let c = 1; c <= COUNTS; c++) {
      if (live.current.run !== id) return false;
      setCount(c);
      speak(c === 1 ? say.line(first) : say.number(c));
      await pause(COUNT_MS);
    }
    return live.current.run === id;
  };

  const breatheIn = async () => {
    const s = live.current;
    if (s.phase !== 'ready') return;
    const id = ++s.run;
    s.reached = false;
    to('in');
    size.set(withTiming(BIG, { duration: COUNT_MS * COUNTS, easing: Easing.inOut(Easing.sin) }));
    if (!(await countFour(id, 'brIn'))) return;
    s.reached = true;
    to('full');
    // Still holding a moment after four? Remind her to let go.
    await pause(1200);
    if (s.run === id && (s.phase as Phase) === 'full' && s.holding) speak(say.line('brLetGo'));
  };

  const breatheOut = async () => {
    const s = live.current;
    if (s.phase !== 'in' && s.phase !== 'full') return;
    const id = ++s.run;
    const counted = s.reached;
    to('out');
    size.set(withTiming(SMALL, { duration: COUNT_MS * COUNTS, easing: Easing.inOut(Easing.sin) }));
    if (!(await countFour(id, 'brOut'))) return;
    setCount(0);
    if (!counted) {
      to('ready');
      return;
    }
    const done = stars + 1;
    setStars(done);
    if (done < BREATHS) {
      to('ready');
      return;
    }
    await celebrate(true);
    await speak(say.line('brDone'));
    if (s.run !== id) return;
    setStars(0);
    to('ready');
  };

  const hold = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin(() => {
      live.current.holding = true;
      breatheIn();
    })
    .onFinalize(() => {
      live.current.holding = false;
      breatheOut();
    });

  const balloon = useAnimatedStyle(() => ({ transform: [{ scale: size.value }] }));
  const hand = useAnimatedStyle(() => ({ transform: [{ translateY: nudge.value }] }));
  const color = phase === 'out' ? OUT_COLOR : IN_COLOR;

  return (
    <GameScreen title="Breathe with me" background="#E3F0FF" onRepeat={() => speak(say.line('brIntro'))}>
      <View style={styles.body}>
        <View style={styles.counter}>
          {count > 0 ? (
            <Animated.View key={`${phase}-${count}`} entering={ZoomIn.duration(200)}>
              <Txt size={64} weight="heavy" color={color}>
                {count}
              </Txt>
            </Animated.View>
          ) : null}
        </View>

        <GestureDetector gesture={hold}>
          <View accessible accessibilityRole="button" accessibilityLabel="Hold to breathe in. Let go to breathe out." style={styles.pad}>
            <Animated.View style={balloon}>
              <Pic name="balloon" size={220} />
            </Animated.View>
          </View>
        </GestureDetector>

        <View style={styles.under}>
          {phase === 'ready' ? (
            <Animated.View style={hand} pointerEvents="none">
              <Pic name="point up" size={64} />
            </Animated.View>
          ) : (
            <View style={styles.dots}>
              {Array.from({ length: COUNTS }, (_, i) => (
                <View key={i} style={[styles.dot, { borderColor: color }, i < count && { backgroundColor: color }]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.jar}>
          {Array.from({ length: BREATHS }, (_, i) =>
            i < stars ? (
              <Animated.View key={i} entering={ZoomIn.springify()}>
                <Pic name="star" size={44} />
              </Animated.View>
            ) : (
              <View key={i} style={styles.slot} />
            ),
          )}
        </View>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-around', padding: Spacing.md },
  counter: { height: 84, justifyContent: 'center' },
  pad: { width: 300, height: 300, borderRadius: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' },
  under: { height: 72, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: Spacing.md },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 4, backgroundColor: 'transparent' },
  jar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.75)', ...cardShadow },
  slot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderStyle: 'dashed', borderColor: '#B9C9E8' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
