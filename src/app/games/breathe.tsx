import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, speak } from '@/lib/audio';

// Box breathing: four sides of four counts each. The balloon grows as she breathes in, stays full
// while she holds, shrinks as she breathes out, and stays small while she holds again.
const SIDES = [
  { label: 'Breathe in', short: 'In', line: 'brIn', balloon: 1.15 },
  { label: 'Hold', short: 'Hold', line: 'brHold', balloon: 1.15 },
  { label: 'Breathe out', short: 'Out', line: 'brOut', balloon: 0.6 },
  { label: 'Hold', short: 'Hold', line: 'brHold', balloon: 0.6 },
] as const;
const COUNT_MS = 1000;
const BOXES = 4;
const BOX = 260;

/**
 * Breathe with me: box breathing. The narrator guides four equal steps, counting to four in each:
 * breathe in, hold, breathe out, hold. A dot travels round the box and the balloon grows, holds and
 * shrinks with it. Four boxes fill the jar. A calm corner to come back to whenever she needs it.
 */
export default function Breathe() {
  const [running, setRunning] = useState(false);
  const [side, setSide] = useState(0);
  const [count, setCount] = useState(0);
  const [stars, setStars] = useState(0);
  const run = useRef(0);
  const around = useSharedValue(0); // 0 to 4: how far round the box the dot has gone
  const size = useSharedValue(0.6);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('brIntro'));
    return () => {
      run.current += 1;
    };
  }, []);

  const start = async () => {
    const id = ++run.current;
    setRunning(true);
    setStars(0);
    around.set(0);
    size.set(0.6);
    for (let box = 0; box < BOXES; box++) {
      for (let s = 0; s < SIDES.length; s++) {
        if (run.current !== id) return;
        setSide(s);
        around.set(withTiming(s + 1, { duration: COUNT_MS * 4, easing: Easing.linear }));
        size.set(withTiming(SIDES[s].balloon, { duration: COUNT_MS * 4, easing: Easing.inOut(Easing.sin) }));
        for (let c = 1; c <= 4; c++) {
          if (run.current !== id) return;
          setCount(c);
          // The step's name counts as "one", then the numbers.
          speak(c === 1 ? say.line(SIDES[s].line) : say.number(c));
          await pause(COUNT_MS);
        }
      }
      around.set(0);
      setStars(box + 1);
    }
    if (run.current !== id) return;
    setRunning(false);
    setCount(0);
    await celebrate(true);
    speak(say.line('brDone'));
  };

  const stop = () => {
    run.current += 1;
    setRunning(false);
    setCount(0);
    around.set(0);
    size.set(withTiming(0.6));
  };

  const dot = useAnimatedStyle(() => {
    const t = around.value % 4;
    const f = t - Math.floor(t);
    const edge = Math.floor(t);
    const x = edge === 0 ? f : edge === 1 ? 1 : edge === 2 ? 1 - f : 0;
    const y = edge === 0 ? 0 : edge === 1 ? f : edge === 2 ? 1 : 1 - f;
    return { transform: [{ translateX: x * BOX - 18 }, { translateY: y * BOX - 18 }] };
  });
  const balloon = useAnimatedStyle(() => ({ transform: [{ scale: size.value }] }));

  return (
    <GameScreen title="Breathe with me" background="#E3F0FF" onRepeat={() => speak(say.line('brIntro'))}>
      <View style={styles.body}>
        <View style={styles.say}>
          <Txt size={34} weight="heavy" color={Colors.purpleDark}>
            {running ? SIDES[side].label : 'Breathe with the box'}
          </Txt>
          {running && count > 0 ? (
            <Animated.View key={`${side}-${count}`} entering={ZoomIn.duration(200)}>
              <Txt size={56} weight="heavy" color={Colors.blue}>
                {count}
              </Txt>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.boxWrap}>
          <View style={[styles.box, { width: BOX, height: BOX }]}>
            <Animated.View style={balloon}>
              <Pic name="balloon" size={170} />
            </Animated.View>
          </View>
          <Txt size={18} weight="heavy" color={Colors.textSoft} style={[styles.sideLabel, { top: -30 }]}>
            {SIDES[0].short}
          </Txt>
          <Txt size={18} weight="heavy" color={Colors.textSoft} style={[styles.sideLabel, { right: -62, top: BOX / 2 - 12 }]}>
            {SIDES[1].short}
          </Txt>
          <Txt size={18} weight="heavy" color={Colors.textSoft} style={[styles.sideLabel, { bottom: -30 }]}>
            {SIDES[2].short}
          </Txt>
          <Txt size={18} weight="heavy" color={Colors.textSoft} style={[styles.sideLabel, { left: -62, top: BOX / 2 - 12 }]}>
            {SIDES[3].short}
          </Txt>
          <Animated.View pointerEvents="none" style={[styles.dot, dot]} />
        </View>

        <View style={styles.jar}>
          {Array.from({ length: BOXES }, (_, i) =>
            i < stars ? (
              <Animated.View key={i} entering={ZoomIn.springify()}>
                <Pic name="star" size={44} />
              </Animated.View>
            ) : (
              <View key={i} style={styles.slot} />
            ),
          )}
        </View>

        <Bouncy accessibilityLabel={running ? 'Stop' : 'Start'} style={[styles.button, { backgroundColor: running ? Colors.textSoft : Colors.blue }]} onPress={running ? stop : start}>
          <Txt size={26} weight="heavy" color={Colors.white}>
            {running ? 'Stop' : 'Start'}
          </Txt>
        </Bouncy>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-around', padding: Spacing.md },
  say: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 72 },
  boxWrap: { width: BOX, height: BOX, alignItems: 'center' },
  box: { borderWidth: 6, borderColor: '#B9C9E8', borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)' },
  sideLabel: { position: 'absolute', width: 56, textAlign: 'center' },
  dot: { position: 'absolute', left: 0, top: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.blue, borderWidth: 5, borderColor: Colors.white, ...cardShadow },
  jar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.75)', ...cardShadow },
  slot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderStyle: 'dashed', borderColor: '#B9C9E8' },
  button: { paddingHorizontal: Spacing.xl, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', ...cardShadow },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
