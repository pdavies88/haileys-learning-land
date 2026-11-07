import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GameScreen } from '@/components/game-screen';
import { TouchPad } from '@/components/touch-pad';
import { Spacing } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';

const SHEETS = ['#8FD3FF', '#FFB8D9', '#B9F3C9', '#FFE48A', '#D7C4FF'];
const SIZE = 84; // roughly how big each bubble is

/**
 * Bubble wrap: pop every bubble on the sheet, with a pop and a little buzz each time. Nothing to
 * win or lose, just squishing; a full sheet is followed by a fresh one in a new colour. A calm-down
 * game, so fast popping is welcome here.
 */
export default function Pop() {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [sheet, setSheet] = useState(0);
  const [popped, setPopped] = useState<Set<number>>(new Set());

  useEffect(() => {
    speak(say.line('popIntro'));
  }, []);

  const cols = Math.max(4, Math.floor(area.width / SIZE));
  const rows = Math.max(4, Math.floor(area.height / SIZE));
  const total = cols * rows;
  const bubble = Math.min(area.width / cols, area.height / rows) * 0.86;

  const pop = async (i: number) => {
    if (popped.has(i)) return;
    const now = new Set(popped).add(i);
    setPopped(now);
    playSfx(i % 3 === 0 ? 'snap' : 'pop', { always: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (now.size < total) return;
    const on = sheet;
    await pause(600);
    if (on !== sheet) return;
    speak(say.line('popMore'));
    setPopped(new Set());
    setSheet((s) => s + 1);
  };

  const color = SHEETS[sheet % SHEETS.length];
  return (
    <GameScreen title="Bubble wrap" background="#EAF6FF" calm={false} onRepeat={() => speak(say.line('popIntro'))}>
      <View style={styles.body}>
        <Animated.View key={sheet} entering={FadeIn.duration(400)} style={[styles.sheet, { backgroundColor: color + '55' }]} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {area.width > 0 &&
            Array.from({ length: total }, (_, i) => {
              const flat = popped.has(i);
              return (
                <TouchPad
                  key={i}
                  label="Bubble"
                  onTouch={() => pop(i)}
                  style={{ position: 'absolute', left: (i % cols) * (area.width / cols) + (area.width / cols - bubble) / 2, top: Math.floor(i / cols) * (area.height / rows) + (area.height / rows - bubble) / 2 }}>
                  <View
                    style={[
                      styles.bubble,
                      { width: bubble, height: bubble, borderRadius: bubble / 2 },
                      flat ? styles.flat : { backgroundColor: color, borderColor: '#FFFFFFAA' },
                    ]}>
                    {!flat && <View style={[styles.shine, { width: bubble * 0.28, height: bubble * 0.18, borderRadius: bubble }]} />}
                  </View>
                </TouchPad>
              );
            })}
        </Animated.View>
      </View>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: Spacing.md },
  sheet: { flex: 1, borderRadius: 28, overflow: 'hidden' },
  bubble: { borderWidth: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  flat: { backgroundColor: 'rgba(255,255,255,0.35)', borderColor: 'rgba(0,0,0,0.06)', shadowOpacity: 0, transform: [{ scale: 0.82 }] },
  shine: { position: 'absolute', top: '18%', left: '22%', backgroundColor: 'rgba(255,255,255,0.75)', transform: [{ rotate: '-25deg' }] },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
