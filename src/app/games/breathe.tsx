import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, speak } from '@/lib/audio';

const IN_MS = 4000; // a slow breath in fills the balloon
const OUT_MS = 4000;
const LONG_ENOUGH_MS = 2500; // a breath in shorter than this doesn't count yet
const BREATHS = 5;
const SMALL = 0.55;
const BIG = 1.25;

/**
 * Breathe with me: hold the balloon to breathe in while it fills, let go to breathe out while it
 * shrinks. Each slow breath puts a star in the jar; five fill it. A calm corner a child can come
 * back to whenever she needs to settle.
 */
export default function Breathe() {
  const [phase, setPhase] = useState<'ready' | 'in' | 'out'>('ready');
  const [stars, setStars] = useState(0);
  const pressedAt = useRef(0);
  const size = useSharedValue(SMALL);
  const { celebrate, overlay } = useCelebration();
  const balloon = useAnimatedStyle(() => ({ transform: [{ scale: size.value }] }));

  useEffect(() => {
    speak(say.line('brIntro'));
  }, []);

  const breatheIn = () => {
    pressedAt.current = Date.now();
    setPhase('in');
    speak(say.line('brIn'));
    // From wherever it is now, so letting go early and holding again carries on smoothly.
    size.set(withTiming(BIG, { duration: IN_MS * ((BIG - size.value) / (BIG - SMALL)), easing: Easing.inOut(Easing.sin) }));
  };

  const breatheOut = async () => {
    const held = Date.now() - pressedAt.current;
    setPhase('out');
    speak(say.line(held >= LONG_ENOUGH_MS ? 'brOut' : 'brSlow'));
    size.set(withTiming(SMALL, { duration: OUT_MS * ((size.value - SMALL) / (BIG - SMALL)), easing: Easing.inOut(Easing.sin) }));
    if (held < LONG_ENOUGH_MS) return;
    await pause(OUT_MS * 0.8);
    const next = stars + 1;
    setStars(next);
    setPhase('ready');
    if (next >= BREATHS) {
      await celebrate(true);
      await speak(say.line('brDone'));
      setStars(0);
    }
  };

  return (
    <GameScreen title="Breathe with me" background="#E3F0FF" onRepeat={() => speak(say.line('brIntro'))}>
      <View style={styles.body}>
        <Txt size={34} weight="heavy" color={Colors.purpleDark}>
          {phase === 'in' ? 'Breathe in…' : phase === 'out' ? 'Breathe out…' : 'Hold the balloon'}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Hold to breathe in" onPressIn={breatheIn} onPressOut={breatheOut} style={styles.balloonArea}>
          <Animated.View style={balloon}>
            <Pic name="balloon" size={300} />
          </Animated.View>
        </Pressable>
        <View style={styles.jar}>
          {Array.from({ length: BREATHS }, (_, i) =>
            i < stars ? (
              <Animated.View key={i} entering={ZoomIn.springify()}>
                <Pic name="star" size={48} />
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
  balloonArea: { width: 400, height: 400, alignItems: 'center', justifyContent: 'center' },
  jar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.75)', ...cardShadow },
  slot: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderStyle: 'dashed', borderColor: '#B9C9E8' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
