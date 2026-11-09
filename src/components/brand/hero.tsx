import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Colors, MIN_TAP, Spacing } from '@/constants/theme';
import { say } from '@/content/learning';
import { speak } from '@/lib/audio';

/** The logo's shape: width over height. */
const LOGO_RATIO = 1024 / 768;
export const HERO_HEIGHT = 300;

/**
 * The top of the home screen: the storybook logo (a book house in a tree) on the paper page, with a
 * speaker button that says hello aloud for children who can't read yet. `width` is the width of
 * the page content.
 */
export function Hero({ width }: { width: number }) {
  const logoWidth = Math.min(width - MIN_TAP, 520);
  return (
    <View style={[styles.row, { width }]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={{ width: logoWidth, height: logoWidth / LOGO_RATIO }}
        contentFit="contain"
        accessible
        accessibilityLabel="Hailey's Learning Land"
        accessibilityIgnoresInvertColors
      />
      {/* The button animates inside its own box, so a plain view pins it to the corner. */}
      <View style={styles.corner}>
        <Bouncy accessibilityLabel="Hear hello" sound={false} style={styles.speaker} onPress={() => speak(say.line('hello'))}>
          <Pic name="speaker" size={32} />
        </Bouncy>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', top: Spacing.sm, right: 0 },
  speaker: {
    width: MIN_TAP - 8,
    height: MIN_TAP - 8,
    borderRadius: MIN_TAP,
    backgroundColor: Colors.brandSoft,
    borderWidth: 2,
    borderColor: 'rgba(59,47,38,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
