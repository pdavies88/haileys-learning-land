import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn, ZoomOut, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { say, type Mission } from '@/content/learning';
import { playSfx, speak, speakAfter } from '@/lib/audio';

/** The hungry animal: it bounces happily every time it gets a treat. */
function Animal({ name, size, fed }: { name: string; size: number; fed: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (fed > 0) scale.set(withSequence(withSpring(1.15), withSpring(1)));
  }, [fed, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pic name={name} size={size} />
    </Animated.View>
  );
}

/**
 * Feed an animal the right number of treats. Each tap counts out loud. Calls `onDone` once the
 * animal has had exactly `target` treats. Give it a new `key` for each new question.
 */
export function FeedTray({ mission, target, animal, onDone }: { mission: Mission; target: number; animal?: string; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const [eaten, setEaten] = useState<number[]>([]);
  // The true count, updated at once. Fast taps can land before the screen redraws.
  const count = useRef<number[]>([]);
  const items = Math.min(target + 3, 12);
  const short = Math.min(width, height);
  const itemSize = Math.min(short * 0.16, 90);

  const feed = async (item: number) => {
    if (count.current.length >= target || count.current.includes(item)) return;
    const now = [...count.current, item];
    count.current = now;
    setEaten(now);
    playSfx('pop');
    // The first tap cuts off the instruction. After that, each number queues after the last, so
    // quick taps are still counted out loud one by one.
    const counted = now.length === 1 ? speak(say.number(1)) : speakAfter(say.number(now.length));
    if (now.length < target) return;
    await counted;
    onDone();
  };

  return (
    <View style={[styles.feed, width > height && styles.feedWide]}>
      <View style={styles.animalSpot}>
        <Animal name={animal ?? mission.animal} size={Math.min(short * 0.32, 220)} fed={eaten.length} />
        <View style={styles.counter}>
          <Txt size={34} weight="heavy" color={Colors.orange}>
            {eaten.length} / {target}
          </Txt>
        </View>
      </View>
      <View style={[styles.tray, { maxWidth: itemSize * 5 + Spacing.md * 6 }]}>
        {Array.from({ length: items }, (_, i) =>
          eaten.includes(i) ? (
            <View key={i} style={{ width: itemSize + 8, height: itemSize + 8 }} />
          ) : (
            <Animated.View key={i} entering={ZoomIn.delay(i * 40)} exiting={ZoomOut}>
              <Bouncy accessibilityLabel={mission.foodOne} onPress={() => feed(i)} sound={false} style={{ padding: 4 }}>
                <Pic name={mission.food} size={itemSize} />
              </Bouncy>
            </Animated.View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', padding: Spacing.md },
  feedWide: { flexDirection: 'row-reverse' },
  animalSpot: { alignItems: 'center', gap: Spacing.sm },
  counter: { backgroundColor: Colors.white, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: 4, ...cardShadow },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
});
