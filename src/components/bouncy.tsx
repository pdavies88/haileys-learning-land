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
  /** Act the moment a finger touches, instead of when it lifts. For answers and instruments. */
  instant?: boolean;
};

/** A button that squishes down when pressed and springs back: satisfying for little fingers. */
export function Bouncy({ onPress, children, style, accessibilityLabel, sound = true, disabled, instant }: Props) {
  const scale = useSharedValue(1);
  // Sinks a little as well as shrinking, so raised buttons feel like they press into their edge.
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - scale.value) * 30 }, { scale: scale.value }] }));

  const act = () => {
    if (sound) playSfx('pop');
    Haptics.selectionAsync().catch(() => undefined);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => {
        if (instant) act();
        scale.set(withSpring(0.93, { damping: 14, stiffness: 420 }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 9, stiffness: 320 }));
      }}
      onPress={() => {
        if (!instant) act();
      }}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
