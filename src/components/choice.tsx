import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { Colors, Radius, raised } from '@/constants/theme';

type Props = {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  /** Increase to make the card wiggle ("not that one"). */
  wiggle: number;
  /** Glows when this is the right answer and she found it. */
  glow?: boolean;
  /** Taken away by the Help button: faded and can't be picked. */
  gone?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A big answer card that wiggles for "try again" and glows for "you got it". */
export function Choice({ onPress, children, accessibilityLabel, wiggle, glow, gone, style }: Props) {
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
    pulse.value = glow ? withSequence(withSpring(1.12), withSpring(1)) : 1;
  }, [glow, pulse]);

  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }, { scale: pulse.value }] }));
  const fade = useAnimatedStyle(() => ({ opacity: withTiming(gone ? 0.15 : 1, { duration: 250 }) }));

  return (
    <Animated.View style={[animated, fade]} pointerEvents={gone ? 'none' : 'auto'}>
      <Bouncy
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        instant
        disabled={gone}
        sound={false}
        style={[
          {
            backgroundColor: glow ? '#FFF6CC' : Colors.white,
            borderRadius: Radius.lg,
            borderWidth: 4,
            borderColor: glow ? Colors.yellow : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            ...raised(glow ? '#E8B21F' : '#E4DEF5'),
          },
          style,
        ]}>
        {children}
      </Bouncy>
    </Animated.View>
  );
}
