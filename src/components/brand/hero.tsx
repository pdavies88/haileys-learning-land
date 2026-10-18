import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pic } from '@/components/pic';
import { Colors, gradient } from '@/constants/theme';

const CELL = 64;
const ICON_SIZE = 40;
const ICONS_PER_ROW = 10;
const ROW_WIDTH = CELL * ICONS_PER_ROW;
const ROW_COUNT = 7;
export const HERO_HEIGHT = 250;
const PICTURES = ['rocket', 'rainbow', 'dinosaur', 'star', 'butterfly', 'ball', 'unicorn', 'robot', 'balloon', 'car', 'sparkles', 'turtle'];

/** The top of the home screen: friendly pictures drifting by behind the app icon. */
export function Hero() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, gradient('#C9EBFF', '#DCD2FF', 150), { height: HERO_HEIGHT + insets.top }]}>
      <View style={styles.pattern} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: ROW_COUNT }, (_, row) => (
          <PictureRow key={row} row={row} />
        ))}
      </View>
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={styles.halo}>
          <Image source={require('@/assets/images/splash-icon.png')} style={styles.logo} contentFit="contain" />
        </View>
      </View>
    </View>
  );
}

/** One diagonal band of pictures. Two copies sit side by side so the loop has no visible seam. */
function PictureRow({ row }: { row: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const reverse = row % 2 === 1;
  // Slightly different speeds per row keep the pattern from looking mechanical.
  const duration = 38_000 + (row % 3) * 7_000;

  useEffect(() => {
    if (reduceMotion) return;
    progress.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(progress);
  }, [reduceMotion, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reverse ? -ROW_WIDTH * (1 - progress.value) : -ROW_WIDTH * progress.value }],
  }));

  return (
    <Animated.View style={[styles.row, { marginLeft: row % 2 === 0 ? 0 : -CELL / 2 }, animatedStyle]}>
      <PictureStrip row={row} />
      <PictureStrip row={row} />
    </Animated.View>
  );
}

function PictureStrip({ row }: { row: number }) {
  return (
    <View style={styles.strip}>
      {Array.from({ length: ICONS_PER_ROW }, (_, index) => {
        const tilt = ((index * 37 + row * 23) % 50) - 25;
        return (
          <View key={index} style={[styles.cell, { transform: [{ rotate: `${tilt}deg` }] }]}>
            <Pic name={PICTURES[(index + row * 5) % PICTURES.length]} size={ICON_SIZE} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  pattern: { position: 'absolute', top: -CELL * 1.5, left: -CELL * 3, transform: [{ rotate: '-20deg' }], opacity: 0.4 },
  row: { flexDirection: 'row', width: ROW_WIDTH * 2 },
  strip: { flexDirection: 'row', width: ROW_WIDTH, height: CELL },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.7)',
    boxShadow: '0 12px 32px rgba(91, 50, 200, 0.25)',
  },
  logo: { width: 112, height: 112 },
});
