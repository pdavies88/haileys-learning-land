import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { playSfx } from '@/lib/audio';

type Props = {
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  /** Play the little "pop" when tapped. Turn off when the screen plays its own sound. */
  sound?: boolean;
  disabled?: boolean;
};

/** A button that squishes down when pressed and springs back: satisfying for little fingers. */
export function Bouncy({ onPress, children, style, accessibilityLabel, sound = true, disabled }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withSpring(0.9, { damping: 12, stiffness: 400 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 8, stiffness: 300 }));
      }}
      onPress={() => {
        if (sound) playSfx('pop');
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
