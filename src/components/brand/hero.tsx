import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, gradient } from '@/constants/theme';

export const HERO_HEIGHT = 236;

// A few pictures that float around the app icon. Positions are fractions of the art area.
const FLOATERS = [
  { name: 'star', size: 34, x: 0.02, y: 0.06, delay: 0 },
  { name: 'books', size: 38, x: 1.0, y: 0.02, delay: 600 },
  { name: 'paint', size: 36, x: 1.02, y: 0.94, delay: 1200 },
  { name: 'sparkles', size: 30, x: 0.0, y: 0.92, delay: 300 },
];

/** Bobs gently up and down, forever, unless the device asks for reduced motion. */
function Float({ children, delay, distance = 6, duration = 2400 }: { children: ReactNode; delay: number; distance?: number; duration?: number }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-distance, { duration, easing: Easing.inOut(Easing.sin) }),
            withTiming(distance, { duration, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      ),
    );
    return () => cancelAnimation(y);
  }, [reduceMotion, delay, distance, duration, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * The top of the home screen: a greeting on a sky-blue-to-violet card, with the app icon floating
 * among a few pictures. `width` is the width of the page content.
 */
export function Hero({ width }: { width: number }) {
  const compact = width < 520;
  const art = compact ? 120 : 190;
  const icon = compact ? 84 : 132;
  return (
    // The shadow sits on the outer frame; the inner card clips the light shapes to its corners.
    <View style={[styles.frame, { width, height: compact ? 210 : HERO_HEIGHT }]}>
      <View style={[styles.card, gradient('#5B8DF6', '#9B5CF6', 135)]}>
      {/* Soft light shapes for depth. */}
      <View style={[styles.glow, { width: art * 2.2, height: art * 2.2, borderRadius: art * 1.1, right: -art * 0.6, top: -art * 0.7 }]} />
      <View style={[styles.glowSmall, { width: art, height: art, borderRadius: art / 2, left: -art * 0.3, bottom: -art * 0.5 }]} />

      <View style={styles.text}>
        <Txt size={15} weight="bold" color="rgba(255,255,255,0.85)">
          Hailey&apos;s Learning Land
        </Txt>
        <Txt size={compact ? 32 : 46} weight="heavy" color={Colors.white}>
          Hi there!
        </Txt>
        <Txt size={compact ? 15 : 19} weight="regular" color="rgba(255,255,255,0.9)">
          What shall we make, read or solve today?
        </Txt>
      </View>

      <View style={[styles.art, { width: art, height: art }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {FLOATERS.map((f) => (
          <View key={f.name} style={[styles.floater, { left: f.x * art - f.size / 2, top: f.y * art - f.size / 2 }]}>
            <Float delay={f.delay} distance={4} duration={2000 + f.delay}>
              <Pic name={f.name} size={compact ? f.size * 0.7 : f.size} />
            </Float>
          </View>
        ))}
        <Float delay={0}>
          <View style={[styles.iconFrame, { width: icon, height: icon, borderRadius: icon * 0.26 }]}>
            <Image source={require('@/assets/images/splash-icon.png')} style={{ width: icon, height: icon }} contentFit="cover" />
          </View>
          </Float>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.xl, boxShadow: '0 16px 40px rgba(91, 80, 220, 0.35)' },
  card: {
    flex: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  glow: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.14)' },
  glowSmall: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.1)' },
  text: { flex: 1, gap: 4 },
  art: { alignItems: 'center', justifyContent: 'center' },
  floater: { position: 'absolute' },
  iconFrame: {
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.65)',
    boxShadow: '0 12px 28px rgba(40, 20, 120, 0.35)',
  },
});
