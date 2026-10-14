import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { Colors, cardShadow } from '@/constants/theme';

type Props = {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  /** Increase to make the card wiggle ("not that one"). */
  wiggle: number;
  /** Glows when this is the right answer and she found it. */
  glow?: boolean;
  /** Gently pulses to help her find the answer after a few tries. */
  hint?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A big answer card that wiggles for "try again" and glows for "you got it". */
export function Choice({ onPress, children, accessibilityLabel, wiggle, glow, hint, style }: Props) {
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (wiggle > 0) {
      rotate.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 90 }),
        withTiming(-6, { duration: 90 }),
        withTiming(0, { duration: 80 }),
      );
    }
  }, [wiggle, rotate]);

  useEffect(() => {
    pulse.value = hint || glow ? withSequence(withSpring(1.12), withSpring(1)) : 1;
  }, [hint, glow, pulse]);

  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }, { scale: pulse.value }] }));

  return (
    <Animated.View style={animated}>
      <Bouncy
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        sound={false}
        style={[
          {
            backgroundColor: glow ? '#FFF3B0' : Colors.white,
            borderRadius: 28,
            borderWidth: 5,
            borderColor: glow ? Colors.yellow : hint ? Colors.pink : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            ...cardShadow,
          },
          style,
        ]}>
        {children}
      </Bouncy>
    </Animated.View>
  );
}
