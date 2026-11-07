import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { TouchPad } from '@/components/touch-pad';
import { Txt } from '@/components/txt';
import { Colors, Spacing } from '@/constants/theme';
import { COLORS, say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';

const THINGS = ['duck', 'star', 'apple', 'ball', 'fish', 'heart'];

/**
 * Tiny tots, for toddlers: nothing to get wrong. Colors: one big balloon, and every tap says its
 * colour and brings the next. Numbers: one to five big things; each tap lights one and counts it,
 * and the last tap says how many.
 */
export default function Tots() {
  const [mode, setMode] = useState<'colors' | 'numbers'>('colors');
  const [color, setColor] = useState(0);
  const [count, setCount] = useState(1);
  const [lit, setLit] = useState(0);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('totsIntro'));
  }, []);

  // Says the colour she's looking at, then shows the next one a moment later.
  const tapColor = async () => {
    playSfx('pop');
    const now = color;
    await speak(say.color(COLORS[now].name));
    setColor((c) => (c === now ? (c + 1) % COLORS.length : c));
  };

  const tapThing = async (i: number) => {
    if (i !== lit) return; // count them in order, left to right
    playSfx('pop');
    speak(say.number(i + 1));
    setLit(i + 1);
    if (i + 1 < count) return;
    await pause(700);
    await celebrate(false);
    setLit(0);
    setCount((c) => (c % 5) + 1);
  };

  return (
    <GameScreen title="Tiny tots" background="#FFF6E5" onRepeat={() => speak(say.line('totsIntro'))}>
      <View style={styles.body}>
        <View style={styles.modes}>
          {(['colors', 'numbers'] as const).map((m) => (
            <Bouncy key={m} accessibilityLabel={m} style={[styles.mode, mode === m && styles.modeOn]} onPress={() => setMode(m)}>
              <Txt size={22} weight="heavy" color={mode === m ? Colors.white : Colors.text}>
                {m === 'colors' ? 'Colors' : '1 2 3'}
              </Txt>
            </Bouncy>
          ))}
        </View>
        {mode === 'colors' ? (
          <TouchPad label="Tap the color" onTouch={tapColor} style={styles.full}>
            <Animated.View key={color} entering={ZoomIn.duration(250)} style={[styles.blob, { backgroundColor: COLORS[color].hex }]} />
          </TouchPad>
        ) : (
          <View style={styles.things}>
            {Array.from({ length: count }, (_, i) => (
              <TouchPad key={`${count}-${i}`} label={`Thing ${i + 1}`} onTouch={() => tapThing(i)} style={[styles.thing, i < lit && styles.thingOn, i === lit && styles.thingNext]}>
                <Pic name={THINGS[count % THINGS.length]} size={110} />
              </TouchPad>
            ))}
          </View>
        )}
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  modes: { flexDirection: 'row', gap: Spacing.sm },
  mode: { paddingHorizontal: Spacing.lg, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  modeOn: { backgroundColor: Colors.orange },
  full: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  blob: { width: 300, height: 300, borderRadius: 150 },
  things: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  thing: { padding: 16, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.6)', opacity: 0.6 },
  thingNext: { opacity: 1, borderWidth: 5, borderColor: Colors.yellow },
  thingOn: { opacity: 1, backgroundColor: '#FFF1B8' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
