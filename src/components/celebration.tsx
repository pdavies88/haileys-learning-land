import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Pic } from '@/components/pic';
import { pause, playSfx } from '@/lib/audio';

const CONFETTI = ['star', 'heart', 'sparkles', 'rainbow', 'star', 'flower', 'heart', 'gem', 'butterfly', 'star'];

function Particle({ name, angle, distance, delay }: { name: string; angle: number; distance: number; delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }));
  }, [progress, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.7 ? 1 : 1 - (progress.value - 0.7) / 0.3,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value + 60 * progress.value * progress.value },
      { scale: 0.4 + progress.value * 0.8 },
      { rotate: `${progress.value * 220}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.particle, style]}>
      <Pic name={name} size={44} />
    </Animated.View>
  );
}

/**
 * A burst of stars, hearts and sparkles with a success sound. Nothing is spoken: a child who moves
 * on quickly would otherwise hear praise for one game on the next screen. `celebrate(big)` bursts
 * at once and resolves once the burst has mostly played, so the next question doesn't land on top.
 */
export function useCelebration() {
  const [burst, setBurst] = useState<{ id: number; pieces: { angle: number; distance: number; delay: number }[] } | null>(
    null,
  );

  const celebrate = async (big = false) => {
    const pieces = Array.from({ length: 18 }, (_, i) => ({
      angle: (i / 18) * Math.PI * 2 + Math.random() * 0.3,
      distance: 140 + Math.random() * 120,
      delay: Math.random() * 120,
    }));
    setBurst((previous) => ({ id: (previous?.id ?? 0) + 1, pieces }));
    playSfx(big ? 'tada' : 'sparkle');
    await pause(big ? 1400 : 800);
  };

  const overlay = burst ? (
    <View key={`celebration-${burst.id}`} pointerEvents="none" style={styles.overlay}>
      {burst.pieces.map((piece, i) => (
        <Particle key={i} name={CONFETTI[i % CONFETTI.length]} {...piece} />
      ))}
    </View>
  ) : null;

  return { celebrate, overlay };
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
});
