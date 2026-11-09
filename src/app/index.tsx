import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HERO_HEIGHT, Hero } from '@/components/brand/hero';
import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, raised } from '@/constants/theme';
import { GAMES, GAME_SECTIONS, say } from '@/content/learning';
import { speak } from '@/lib/audio';

// Say hello once each time the app opens, not every time she comes back to this page.
let greeted = false;

/**
 * The front page: the hero, then one big card for each kind of game. A card says its name aloud
 * and opens a page with just the games of that kind, so this page stays short however many games
 * there are. Pictures carry the meaning: the words are there for grown-ups and early readers.
 */
export default function Home() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const columns = width >= 900 ? 3 : width >= 520 ? 2 : 1;
  const gap = Spacing.md;
  const sidePadding = Spacing.md + Math.max(insets.left, insets.right);
  const contentWidth = Math.min(width, 1100) - sidePadding * 2;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cardHeight = columns === 1 ? 128 : 160;

  useEffect(() => {
    if (greeted) return;
    greeted = true;
    speak(say.line('hello'));
  }, []);

  // Once the hero scrolls away, fade in a strip behind the status bar so the cards don't run
  // into the clock.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO_HEIGHT - 80, HERO_HEIGHT], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}>
        <View style={[styles.content, { paddingHorizontal: sidePadding, paddingTop: insets.top + Spacing.sm }]}>
          <Hero width={contentWidth} />

          <View style={[styles.grid, { gap, width: contentWidth }]}>
            {GAME_SECTIONS.map((section, i) => {
              const games = GAMES.filter((game) => game.section === section.id);
              return (
                <Animated.View key={section.id} entering={FadeInUp.delay(i * 60).springify()}>
                  <Bouncy
                    accessibilityLabel={section.title}
                    sound={false}
                    style={[styles.card, raised(Colors.ink, 4), { width: cardWidth, height: cardHeight, backgroundColor: section.color }]}
                    onPress={() => {
                      // A kind with only one game opens it straight away: no page with a single card.
                      if (games.length === 1) {
                        router.push(`/games/${games[0].id}` as Href);
                        return;
                      }
                      speak(say.section(section.id));
                      router.push(`/category/${section.id}` as Href);
                    }}>
                    <View style={styles.text}>
                      <Txt size={columns === 1 ? 24 : 26} weight="heavy" color={Colors.white} numberOfLines={1} adjustsFontSizeToFit>
                        {section.title}
                      </Txt>
                      <View style={styles.peek}>
                        {games.slice(0, 4).map((game) => (
                          <View key={game.id} style={styles.peekPic}>
                            <Pic name={game.picture} size={24} />
                          </View>
                        ))}
                      </View>
                    </View>
                    <View style={[styles.picDisc, { width: cardHeight * 0.72, height: cardHeight * 0.72, borderRadius: cardHeight }]}>
                      <Pic name={section.picture} size={cardHeight * 0.5} />
                    </View>
                  </Bouncy>
                </Animated.View>
              );
            })}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.lg },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  text: { flex: 1, gap: Spacing.sm },
  picDisc: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,232,0.9)', borderWidth: 2, borderColor: 'rgba(59,47,38,0.35)' },
  peek: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  peekPic: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,232,0.92)' },
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
