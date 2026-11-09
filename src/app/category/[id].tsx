import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouncy } from '@/components/bouncy';
import { GameCard } from '@/components/game-card';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, MIN_TAP, Spacing, raised, shade } from '@/constants/theme';
import { GAMES, GAME_SECTIONS, say } from '@/content/learning';
import { speak } from '@/lib/audio';

/**
 * All the games of one kind, opened from a card on the front page. The speaker says the kind of
 * game again, for a child who can't read the title.
 */
export default function Category() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const section = GAME_SECTIONS.find((s) => s.id === id);
  if (!section) return <Redirect href="/" />;

  const games = GAMES.filter((game) => game.section === section.id);
  const columns = width >= 700 ? 4 : width >= 520 ? 3 : 2;
  const gap = Spacing.md;
  const sidePadding = Spacing.md + Math.max(insets.left, insets.right);
  const contentWidth = Math.min(width, 1100) - sidePadding * 2;
  const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  const cardHeight = Math.max(160, Math.min(cardWidth * 1.0, 210));

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.sm, paddingHorizontal: sidePadding }]}>
        <Bouncy
          accessibilityLabel="Back to all games"
          style={styles.round}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Pic name="house" size={38} />
        </Bouncy>
        <View style={styles.title}>
          <Pic name={section.picture} size={40} />
          <Txt size={28} weight="heavy" numberOfLines={1} adjustsFontSizeToFit style={styles.titleText}>
            {section.title}
          </Txt>
        </View>
        <Bouncy accessibilityLabel="Hear it again" sound={false} style={styles.round} onPress={() => speak(say.section(section.id))}>
          <Pic name="speaker" size={36} />
        </Bouncy>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}>
        <View style={[styles.grid, { gap, paddingHorizontal: sidePadding, width: contentWidth + sidePadding * 2 }]}>
          {games.map((game, i) => (
            <Animated.View key={game.id} entering={FadeInUp.delay(i * 40).springify()}>
              {/* Cards take the colour of their kind, a little lighter or darker in turn, so the page reads as one set. */}
              <GameCard game={game} width={cardWidth} height={cardHeight} color={shade(section.color, [0, 0.12, -0.1, 0.22][i % 4])} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingBottom: Spacing.md },
  round: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: MIN_TAP / 2,
    backgroundColor: '#FFF8E8',
    borderWidth: 2.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...raised(Colors.ink, 3),
  },
  title: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  titleText: { flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center', paddingTop: Spacing.sm },
});
