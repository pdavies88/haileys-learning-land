import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { Choice } from '@/components/choice';
import { Pic } from '@/components/pic';
import { Shape } from '@/components/shape';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { COLORS, SHAPES, say } from '@/content/learning';
import { pick, playSfx, speak } from '@/lib/audio';
import { shuffle } from '@/lib/random';

/** Shape & color hunt: find all the shapes of one kind, or all the things of one color. */
export function ShapeHunt({ level, onSolved }: { level: number; onSolved: () => void }) {
  const { width, height } = useWindowDimensions();
  const [quest] = useState(() => {
    const byColor = Math.random() < 0.5;
    const shape = pick(SHAPES);
    const color = pick(COLORS);
    const count = 8 + level * 2;
    const answers = 3 + (level > 1 ? 1 : 0);
    const items = Array.from({ length: count }, (_, i) => {
      if (i < answers) return { id: i, shape: byColor ? pick(SHAPES) : shape, color: byColor ? color : pick(COLORS) };
      return {
        id: i,
        shape: byColor ? pick(SHAPES) : pick(SHAPES.filter((s) => s !== shape)),
        color: byColor ? pick(COLORS.filter((c) => c.name !== color.name)) : pick(COLORS),
      };
    });
    return { byColor, shape, color, items: shuffle(items), answers };
  });
  const [found, setFound] = useState<number[]>([]);
  const [wiggles, setWiggles] = useState<Record<number, number>>({});
  const prompt = quest.byColor ? say.findColor(quest.color.name) : say.findShape(quest.shape);
  const size = Math.min((width - 40) / 5 - Spacing.md, (height - 260) / Math.ceil(quest.items.length / 5) - Spacing.md, 100);

  useEffect(() => {
    speak(prompt);
    // Only when the hunt starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAnswer = (item: (typeof quest.items)[number]) =>
    quest.byColor ? item.color.name === quest.color.name : item.shape === quest.shape;

  const tap = (item: (typeof quest.items)[number]) => {
    if (found.includes(item.id)) return;
    if (!isAnswer(item)) {
      playSfx('bloop');
      setWiggles((w) => ({ ...w, [item.id]: (w[item.id] ?? 0) + 1 }));
      speak(quest.byColor ? say.color(item.color.name) : say.shape(item.shape), say.line('tryAgain'));
      return;
    }
    playSfx('pop');
    const now = [...found, item.id];
    setFound(now);
    if (now.length === quest.answers) {
      speak(say.line('questDone'));
      onSolved();
    } else {
      speak(say.number(now.length));
    }
  };

  return (
    <View style={styles.quest}>
      <Bouncy accessibilityLabel="Hear it again" onPress={() => speak(prompt)} sound={false} style={styles.questHint}>
        {quest.byColor ? (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: quest.color.hex }} />
        ) : (
          <Shape shape={quest.shape} color={Colors.textSoft} size={44} />
        )}
      </Bouncy>
      <View style={styles.questGrid}>
        {quest.items.map((item) => (
          <Choice
            key={item.id}
            accessibilityLabel={`${item.color.name} ${item.shape}`}
            wiggle={wiggles[item.id] ?? 0}
            glow={found.includes(item.id)}
            style={{ width: size + 16, height: size + 16 }}
            onPress={() => tap(item)}>
            {found.includes(item.id) ? (
              <Animated.View entering={ZoomIn} exiting={ZoomOut}>
                <Pic name="star" size={size * 0.8} />
              </Animated.View>
            ) : (
              <Shape shape={item.shape} color={item.color.hex} size={size} />
            )}
          </Choice>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quest: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  questHint: { backgroundColor: Colors.white, borderRadius: 999, padding: Spacing.sm, ...cardShadow },
  questGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, maxWidth: 640 },
});
