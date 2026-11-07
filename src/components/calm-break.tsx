import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Txt } from '@/components/txt';
import { Colors, Spacing } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, speak } from '@/lib/audio';

// More touches than this within the window means fingers are mashing, not playing.
const MASH_TOUCHES = 16;
const MASH_WINDOW_MS = 3000;
const BREATH_MS = 3000; // in, then out
const BREAK_MS = BREATH_MS * 2;

function Bubble() {
  const size = useSharedValue(0.6);
  useEffect(() => {
    size.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [size]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: size.value }] }));
  return (
    <View style={styles.bubbleRoom}>
      <Animated.View style={[styles.bubble, style]} />
    </View>
  );
}

/**
 * Notices when fingers mash the screen and offers a short breathing break: a bubble grows and
 * shrinks with "Let's take a slow breath", and taps rest until it's over. Helps a child who races
 * ahead slow down and come back to the game calmer. Wraps each game's content.
 */
export function CalmBreak({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const touches = useRef<number[]>([]);
  const [resting, setResting] = useState(false);

  const count = () => {
    if (!enabled || resting) return;
    const now = Date.now();
    touches.current = [...touches.current.filter((at) => now - at < MASH_WINDOW_MS), now];
    if (touches.current.length < MASH_TOUCHES) return;
    touches.current = [];
    setResting(true);
    speak(say.line('calmBreath'));
    pause(BREAK_MS).then(() => setResting(false));
  };

  return (
    <View style={styles.wrap} onTouchStart={count}>
      {children}
      {resting && (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(400)} style={styles.scrim}>
          <Bubble />
          <Txt size={30} weight="heavy" color={Colors.purpleDark}>
            Breathe in… and out
          </Txt>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, backgroundColor: 'rgba(246,243,255,0.92)' },
  // Room for the bubble at its biggest, so it never covers the words.
  bubbleRoom: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  bubble: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#B9A5F5', borderWidth: 10, borderColor: '#D9CCFB' },
});
