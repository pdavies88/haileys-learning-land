import { router, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { abandonSpeech } from '@/lib/audio';

/**
 * Shown instead of a game that hit an unexpected error, so the app stays open and a child can go
 * back to the games. Each game screen exports it as its `ErrorBoundary`.
 */
export function GameError({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    abandonSpeech();
    console.error('A game stopped with an error', error);
  }, [error]);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Pic name="sparkles" size={96} />
        <Txt size={28} weight="heavy" style={styles.center}>
          Oops! This game got muddled.
        </Txt>
        <View style={styles.buttons}>
          <Bouncy accessibilityLabel="Try again" style={[styles.button, styles.again]} onPress={() => retry()}>
            <Txt size={20} color={Colors.white}>
              Try again
            </Txt>
          </Bouncy>
          <Bouncy
            accessibilityLabel="Back to the games"
            style={[styles.button, styles.home]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <Pic name="house" size={30} />
            <Txt size={20}>Games</Txt>
          </Bouncy>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, backgroundColor: Colors.background },
  card: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl, borderRadius: 32, backgroundColor: Colors.white, maxWidth: 520, ...cardShadow },
  center: { textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: Spacing.md },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, height: 60, borderRadius: 30 },
  again: { backgroundColor: Colors.purple },
  home: { backgroundColor: Colors.background },
});
