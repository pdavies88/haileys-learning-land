import { StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, raised } from '@/constants/theme';

/** A friendly owl that offers a clue when a child is stuck. Hidden until it's needed. */
export function HelpButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  if (!visible) return null;
  return (
    <Animated.View entering={ZoomIn.duration(220)}>
      <Bouncy accessibilityLabel="Help me" onPress={onPress} style={styles.button}>
        <Pic name="owl" size={34} />
        <Txt size={19} color={Colors.purpleDark}>
          Help
        </Txt>
      </Bouncy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    ...raised('#E4DEF5', 5),
  },
});
