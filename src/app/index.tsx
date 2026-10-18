import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HERO_HEIGHT, Hero } from '@/components/brand/hero';
import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, gradient, raised, shade } from '@/constants/theme';
import { GAMES, GAME_SECTIONS, say } from '@/content/learning';
import { speak } from '@/lib/audio';

// Say hello once each time the app opens, not every time she comes back to this screen.
let welcomed = false;

export default function Home() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const columns = width >= 700 ? 4 : width >= 520 ? 3 : 2;
  const gap = Spacing.md;
  const sidePadding = Spacing.md + Math.max(insets.left, insets.right);
  const contentWidth = Math.min(width, 1100) - sidePadding * 2;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cardHeight = Math.max(150, Math.min(cardWidth * 0.95, 200));

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

  let order = 0;
  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}>
        <Hero />
        <View style={[styles.content, { paddingHorizontal: sidePadding }]}>
          <View style={[styles.heading, { width: contentWidth }]}>
            <Txt size={width >= 600 ? 40 : 32} weight="heavy" color={Colors.text}>
              Hi Hailey!
            </Txt>
            <Txt size={18} weight="regular" color={Colors.textSoft}>
              What shall we make, read or solve today?
            </Txt>
          </View>

          {GAME_SECTIONS.map((section) => (
            <View key={section.id} style={[styles.section, { width: contentWidth }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Pic name={section.picture} size={24} />
                </View>
                <Txt size={22} weight="heavy" color={Colors.text}>
                  {section.title}
                </Txt>
              </View>
              <View style={[styles.grid, { gap }]}>
                {GAMES.filter((game) => game.section === section.id).map((game) => (
                  <Animated.View key={game.id} entering={FadeInUp.delay(order++ * 35).springify()}>
                    <Bouncy
                      accessibilityLabel={game.title}
                      style={[styles.cardFrame, raised(shade(game.color, -0.32)), { width: cardWidth, height: cardHeight }]}
                      onPress={() => {
                        speak(say.game(game.id));
                        router.push(`/games/${game.id}` as Href);
                      }}>
                      {/* The shadow sits on the frame; the gradient is clipped to the rounded card inside it. */}
                      <View style={[styles.card, gradient(shade(game.color, 0.12), shade(game.color, -0.12), 150)]}>
                        <View style={[styles.glow, { width: cardHeight, height: cardHeight, borderRadius: cardHeight / 2 }]} />
                        <Pic name={game.picture} size={Math.min(cardWidth * 0.48, 104)} style={styles.cardPic} />
                        <View style={styles.cardText}>
                          <Txt size={cardWidth > 200 ? 22 : 19} weight="heavy" color={Colors.white} numberOfLines={2}>
                            {game.title}
                          </Txt>
                          <Txt size={13} weight="regular" color="rgba(255,255,255,0.88)" numberOfLines={1}>
                            {game.skills}
                          </Txt>
                        </View>
                      </View>
                    </Bouncy>
                  </Animated.View>
                ))}
              </View>
            </View>
          ))}

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
  heading: { marginTop: Spacing.lg, gap: 2 },
  section: { marginTop: Spacing.lg, gap: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cardFrame: { borderRadius: Radius.lg },
  card: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  // A soft light behind the picture.
  glow: { position: 'absolute', top: -30, right: -40, backgroundColor: 'rgba(255,255,255,0.18)' },
  cardPic: { position: 'absolute', top: Spacing.md, right: Spacing.md, transform: [{ rotate: '8deg' }] },
  cardText: { gap: 2 },
  grownUps: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Colors.background },
});
