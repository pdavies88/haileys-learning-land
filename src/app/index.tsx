import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HERO_HEIGHT, Hero } from '@/components/brand/hero';
import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { GAMES, say } from '@/content/learning';
import { speak } from '@/lib/audio';

// Say hello once each time the app opens, not every time she comes back to this screen.
let welcomed = false;

export default function Home() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const gap = Spacing.md;
  const sidePadding = Spacing.md + Math.max(insets.left, insets.right);
  const cardWidth = (Math.min(width, 1100) - sidePadding * 2 - gap * (columns - 1)) / columns;

  // Once the hero scrolls away, fade in a strip behind the status bar so the cards don't run
  // into the clock.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO_HEIGHT - 80, HERO_HEIGHT], [0, 1], 'clamp'),
  }));

  useEffect(() => {
    if (!welcomed) {
      welcomed = true;
      speak(say.line('welcome'));
    }
  }, []);

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}>
        <Hero />
        <View style={[styles.content, { paddingHorizontal: sidePadding }]}>
          <Txt size={width >= 600 ? 44 : 34} weight="heavy" color={Colors.purpleDark} style={styles.title}>
            Hailey&apos;s Learning Land
          </Txt>
          <Txt size={18} weight="regular" color={Colors.textSoft} style={styles.tagline}>
            Learn, play and create!
          </Txt>

          <View style={[styles.grid, { gap, maxWidth: 1100 }]}>
            {GAMES.map((game, index) => (
              <Animated.View key={game.id} entering={FadeInUp.delay(index * 40).springify()}>
                <Bouncy
                  accessibilityLabel={game.title}
                  style={[styles.card, { width: cardWidth, backgroundColor: game.color }]}
                  onPress={() => {
                    speak(say.game(game.id));
                    router.push(`/games/${game.id}` as Href);
                  }}>
                  <View style={styles.bubble}>
                    <Pic name={game.picture} size={Math.min(cardWidth * 0.4, 100)} />
                  </View>
                  <Txt size={cardWidth > 200 ? 23 : 19} weight="heavy" color={Colors.white} style={styles.cardTitle}>
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
        </View>
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[styles.statusBar, { height: insets.top }, backdrop]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { alignItems: 'center' },
  title: { textAlign: 'center', marginTop: Spacing.lg },
  tagline: { textAlign: 'center', marginBottom: Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    borderRadius: 28,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 160,
    justifyContent: 'center',
    ...cardShadow,
  },
  bubble: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, padding: Spacing.md },
  cardTitle: { textAlign: 'center' },
  grownUps: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    backgroundColor: Colors.white,
  },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Colors.background },
});
