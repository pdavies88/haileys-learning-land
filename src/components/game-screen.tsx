import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, MIN_TAP, Spacing, cardShadow } from '@/constants/theme';
import { stopSpeaking } from '@/lib/audio';

type Props = {
  title: string;
  /** Soft background color for this game. */
  background: string;
  /** Says the current instruction again. */
  onRepeat?: () => void;
  /** Stars earned so far in this round, out of `total`. */
  progress?: { done: number; total: number };
  children: ReactNode;
};

/** The frame every game sits in: a big Home button, the title, a "say it again" button and stars. */
export function GameScreen({ title, background, onRepeat, progress, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: background, paddingTop: insets.top + Spacing.sm }]}>
      <View style={[styles.bar, { paddingLeft: insets.left + Spacing.md, paddingRight: insets.right + Spacing.md }]}>
        <Bouncy
          accessibilityLabel="Go home"
          style={styles.round}
          onPress={() => {
            stopSpeaking();
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}>
          <Pic name="house" size={40} />
        </Bouncy>
        <View style={styles.middle}>
          <Txt size={26} weight="heavy" numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Txt>
          {progress ? (
            <View style={styles.stars}>
              {Array.from({ length: progress.total }, (_, i) => (
                <Pic key={i} name="star" size={22} style={{ opacity: i < progress.done ? 1 : 0.22 }} />
              ))}
            </View>
          ) : null}
        </View>
        {onRepeat ? (
          <Bouncy accessibilityLabel="Hear it again" style={styles.round} onPress={onRepeat} sound={false}>
            <Pic name="speaker" size={38} />
          </Bouncy>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.sm, paddingLeft: insets.left, paddingRight: insets.right }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  round: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: MIN_TAP / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  spacer: { width: MIN_TAP },
  middle: { flex: 1, alignItems: 'center' },
  stars: { flexDirection: 'row', gap: 4, marginTop: 2 },
  body: { flex: 1 },
});
