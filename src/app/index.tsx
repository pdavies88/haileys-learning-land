import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { GAMES, say } from '@/content/learning';
import { speak } from '@/lib/audio';

// Say hello once each time the app opens, not every time she comes back to this screen.
let welcomed = false;

function Floating({ name, size, delay }: { name: string; size: number; delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withTiming(-8, { duration: 1400 + delay }), withTiming(0, { duration: 1400 + delay })), -1);
  }, [y, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={style}>
      <Pic name={name} size={size} />
    </Animated.View>
  );
}

export default function Home() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const gap = Spacing.md;
  const sidePadding = Spacing.md + Math.max(insets.left, insets.right);
  const cardWidth = (Math.min(width, 1100) - sidePadding * 2 - gap * (columns - 1)) / columns;

  useEffect(() => {
    if (!welcomed) {
      welcomed = true;
      speak(say.line('welcome'));
    }
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.md,
        paddingBottom: insets.bottom + Spacing.lg,
        paddingHorizontal: sidePadding,
        alignItems: 'center',
      }}>
      <View style={styles.header}>
        <Floating name="rainbow" size={56} delay={0} />
        <Floating name="unicorn" size={84} delay={300} />
        <Floating name="castle" size={56} delay={150} />
      </View>
      <Txt size={width >= 600 ? 44 : 34} weight="heavy" color={Colors.purpleDark} style={styles.title}>
        Hailey&apos;s Learning Land
      </Txt>

      <View style={[styles.grid, { gap, maxWidth: 1100 }]}>
        {GAMES.map((game, index) => (
          <Animated.View key={game.id} entering={FadeInUp.delay(index * 60).springify()}>
            <Bouncy
              accessibilityLabel={game.title}
              style={[styles.card, { width: cardWidth, backgroundColor: game.color }]}
              onPress={() => {
                speak(say.game(game.id));
                router.push(`/games/${game.id}` as Href);
              }}>
              <View style={styles.bubble}>
                <Pic name={game.picture} size={Math.min(cardWidth * 0.45, 110)} />
              </View>
              <Txt size={cardWidth > 200 ? 24 : 20} weight="heavy" color={Colors.white} style={styles.cardTitle}>
                {game.title}
              </Txt>
            </Bouncy>
          </Animated.View>
        ))}
      </View>

      <Bouncy accessibilityLabel="For grown-ups" style={styles.grownUps} onPress={() => router.push('/grown-ups')}>
        <Pic name="lock" size={20} />
        <Txt size={16} weight="regular" color={Colors.textSoft}>
          Grown-ups
        </Txt>
      </Bouncy>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.sky },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  title: { textAlign: 'center', marginVertical: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    borderRadius: 28,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 170,
    justifyContent: 'center',
    ...cardShadow,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    padding: Spacing.md,
  },
  cardTitle: { textAlign: 'center' },
  grownUps: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
