import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * Acts the moment a finger touches it, even while other fingers are still down elsewhere.
 *
 * A plain button only follows one finger at a time, so when a child taps quickly with two fingers
 * (or taps the next one before lifting off the last) the second tap is lost. Each pad has its own
 * gesture handler instead, so every touch counts. Use it for things children tap fast: treats,
 * ingredients and instrument keys.
 */
export function TouchPad({ onTouch, style, label, disabled, children }: {
  onTouch: () => void;
  style?: StyleProp<ViewStyle>;
  label: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const scale = useSharedValue(1);
  const gesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(!disabled)
    .minDistance(0)
    .onBegin(() => {
      scale.set(withSequence(withTiming(0.9, { duration: 50 }), withSpring(1, { damping: 10 })));
      onTouch();
    });
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View accessible accessibilityRole="button" accessibilityLabel={label} onAccessibilityTap={onTouch} style={[style, animated]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
