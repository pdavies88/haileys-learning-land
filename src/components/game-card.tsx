import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, raised } from '@/constants/theme';
import type { GAMES } from '@/content/learning';

type Game = (typeof GAMES)[number];

/**
 * A card that opens one game: a big picture to recognise it by, and its name underneath for
 * grown-ups and early readers. The game says its own name and intro as it opens.
 */
export function GameCard({ game, width, height, color = game.color }: { game: Game; width: number; height: number; color?: string }) {
  const pic = Math.min(width * 0.52, height * 0.52, 112);
  return (
    <Bouncy
      accessibilityLabel={game.title}
      style={[styles.card, raised(Colors.ink, 4), { width, height, backgroundColor: color }]}
      // No spoken name on the tap: the game speaks as it opens, and two lines at once came out late
      // or on top of each other.
      onPress={() => router.push(`/games/${game.id}` as Href)}>
      <View style={[styles.disc, { width: pic * 1.35, height: pic * 1.35, borderRadius: pic }]}>
        <Pic name={game.picture} size={pic} />
      </View>
      <Txt size={width > 200 ? 20 : 17} weight="heavy" color={Colors.white} numberOfLines={2} style={styles.title}>
        {game.title}
      </Txt>
    </Bouncy>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 2.5, borderColor: Colors.ink, padding: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  disc: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,232,0.9)', borderWidth: 2, borderColor: 'rgba(59,47,38,0.35)' },
  title: { textAlign: 'center' },
});
