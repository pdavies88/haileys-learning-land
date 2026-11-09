import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { SpySceneCanvas, SpyTargetIcon } from '@/components/spy-scene';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { SPY_TARGETS, say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';
import { SCENE_KINDS, buildScene, hitsTarget } from '@/lib/spy-scene';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/**
 * I spy: like a busy picture book, find the one star (or heart, or ladybug) hidden in one of ten
 * drawn places, such as a park, a farm, a snowy hill or the bottom of the sea, full of people,
 * animals and things. It is tucked partly behind something but always shows enough to spot.
 * Tapping anything else does nothing, so there is nothing to get wrong: just keep looking. Each
 * round moves to the next place, starting from a different one each time, and the places get busier.
 */
export default function ISpy() {
  const [round, setRound] = useState(0);
  const [seed, setSeed] = useState(newSeed);
  const [firstPlace] = useState(() => Math.floor(Math.random() * SCENE_KINDS.length));
  const [found, setFound] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const { celebrate, overlay } = useCelebration();

  const target = SPY_TARGETS[round % SPY_TARGETS.length];
  // The same seed lays the picture out again when the tablet turns, without starting a new round.
  const scene = useMemo(
    () =>
      area.width > 0
        ? buildScene({ kind: SCENE_KINDS[(firstPlace + round) % SCENE_KINDS.length], targetName: target.name, width: Math.round(area.width), height: Math.round(area.height), round, seed })
        : null,
    [area.width, area.height, round, seed, target.name, firstPlace],
  );

  useEffect(() => {
    speak(say.spy(target.name));
  }, [target.name]);

  const pick = async (x: number, y: number) => {
    if (found || !scene || !hitsTarget(scene.target, x, y)) return;
    setFound(true);
    playSfx('chime');
    await celebrate(true);
    await speak(say.line('spyDone'));
    await pause(500);
    setFound(false);
    setSeed(newSeed());
    setRound((r) => r + 1);
  };

  // Acts as soon as a finger lands, so a wobbly or slow tap still counts.
  const tap = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => pick(e.x, e.y));

  const ring = scene ? scene.target.size * 1.5 : 0;

  return (
    <GameScreen title="I spy" background="#FFF4DD" level={round} onRepeat={() => speak(say.spy(target.name))}>
      <View style={styles.body}>
        <View style={styles.ask}>
          <Txt size={26} weight="heavy">
            Can you find the {target.name}?
          </Txt>
          <SpyTargetIcon name={target.name} size={46} />
        </View>
        <View style={styles.field} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {scene && (
            <GestureDetector gesture={tap}>
              <View accessible accessibilityRole="image" accessibilityLabel={`A busy picture. Somewhere there is a ${target.name}.`} onAccessibilityTap={() => pick(scene.target.x, scene.target.y)}>
                <SpySceneCanvas scene={scene} />
                {found && (
                  <Animated.View
                    entering={ZoomIn}
                    pointerEvents="none"
                    style={[styles.ring, { left: scene.target.x - ring / 2, top: scene.target.y - ring / 2, width: ring, height: ring, borderRadius: ring / 2 }]}
                  />
                )}
              </View>
            </GestureDetector>
          )}
        </View>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  ask: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  field: { flex: 1, alignSelf: 'stretch', borderRadius: 32, backgroundColor: Colors.white, overflow: 'hidden', ...cardShadow },
  ring: { position: 'absolute', borderWidth: 6, borderColor: Colors.green, backgroundColor: 'rgba(34,193,122,0.15)' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
