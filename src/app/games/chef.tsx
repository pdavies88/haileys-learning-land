/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { BounceIn, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { Draggable } from '@/components/draggable';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { COLORS, RECIPES, SORT_FRUIT, say, type ChefStep } from '@/content/learning';
import { useDropTargets } from '@/hooks/use-drop-targets';
import { playSfx, speak } from '@/lib/audio';
import { shuffle } from '@/lib/random';

type Recipe = (typeof RECIPES)[number];
const ORDER = ['First', 'Next', 'Last'];
const colorHex = (name: string) => COLORS.find((c) => c.name === name)!.hex;

/** Tap ingredients into the bowl. Each one is counted out loud. */
function AddStep({ step, bowlSize, onDone }: { step: Extract<ChefStep, { kind: 'add' }>; bowlSize: number; onDone: () => void }) {
  const [added, setAdded] = useState<number[]>([]);
  const items = step.count + 2;
  const add = async (i: number) => {
    if (added.length >= step.count || added.includes(i)) return;
    const now = [...added, i];
    setAdded(now);
    playSfx('pop');
    await speak(say.number(now.length));
    if (now.length === step.count) onDone();
  };
  return (
    <View style={styles.stepBody}>
      <View style={styles.bowlWrap}>
        <Pic name="bowl" size={bowlSize} />
        <View style={styles.inBowl}>
          {added.map((i) => (
            <Animated.View key={i} entering={BounceIn}>
              <Pic name={step.item} size={bowlSize * 0.16} />
            </Animated.View>
          ))}
        </View>
        <View style={styles.count}>
          <Txt size={28} weight="heavy" color={Colors.orange}>
            {added.length} / {step.count}
          </Txt>
        </View>
      </View>
      <View style={styles.tray}>
        {Array.from({ length: items }, (_, i) =>
          added.includes(i) ? (
            <View key={i} style={styles.slotGap} />
          ) : (
            <Animated.View key={i} entering={ZoomIn.delay(i * 40)} exiting={ZoomOut}>
              <Bouncy accessibilityLabel={step.one} sound={false} onPress={() => add(i)} style={styles.ingredient}>
                <Pic name={step.item} size={56} />
              </Bouncy>
            </Animated.View>
          ),
        )}
      </View>
    </View>
  );
}

/** Stir by moving a finger round and round the bowl. Two full turns finish it. */
function StirStep({ bowlSize, onDone }: { bowlSize: number; onDone: () => void }) {
  'use no memo';
  const [turned, setTurned] = useState(0);
  const last = useRef<number | null>(null);
  const total = useRef(0);
  const finished = useRef(false);
  const goal = Math.PI * 4;

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      last.current = Math.atan2(e.y - bowlSize / 2, e.x - bowlSize / 2);
    })
    .onUpdate((e) => {
      const angle = Math.atan2(e.y - bowlSize / 2, e.x - bowlSize / 2);
      if (last.current !== null) {
        let delta = angle - last.current;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        total.current += Math.abs(delta);
        setTurned(total.current);
      }
      last.current = angle;
      if (!finished.current && total.current >= goal) {
        finished.current = true;
        playSfx('chime');
        onDone();
      }
    });

  return (
    <View style={styles.stepBody}>
      <GestureDetector gesture={pan}>
        <View style={{ width: bowlSize, height: bowlSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ transform: [{ rotate: `${(turned * 180) / Math.PI}deg` }] }}>
            <Pic name="bowl" size={bowlSize * 0.9} />
          </View>
          <View pointerEvents="none" style={styles.spoon}>
            <Pic name="sparkles" size={bowlSize * 0.2} style={{ opacity: Math.min(1, turned / goal) }} />
          </View>
        </View>
      </GestureDetector>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${Math.min(100, (turned / goal) * 100)}%` }]} />
      </View>
    </View>
  );
}

/** Tap the oven to bake: it glows and counts down three, two, one. */
function BakeStep({ size, onDone }: { size: number; onDone: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const bake = async () => {
    if (count !== null) return;
    playSfx('whoosh');
    for (const n of [3, 2, 1]) {
      setCount(n);
      await speak(say.number(n));
    }
    setCount(0);
    playSfx('chime');
    onDone();
  };
  const hot = count !== null;
  return (
    <View style={styles.stepBody}>
      <Bouncy accessibilityLabel="Oven" onPress={bake} sound={false} style={[styles.oven, { width: size, height: size * 0.85 }]}>
        <View style={styles.knobs}>
          {[0, 1, 2].map((k) => (
            <View key={k} style={styles.knob} />
          ))}
        </View>
        <View style={[styles.window, hot && styles.windowHot]}>
          {hot && count! > 0 ? (
            <Animated.View key={count} entering={ZoomIn}>
              <Txt size={size * 0.25} weight="heavy" color={Colors.white}>
                {count}
              </Txt>
            </Animated.View>
          ) : null}
        </View>
      </Bouncy>
    </View>
  );
}

/** Drag each fruit onto the plate of its color. */
function SortStep({ onDone }: { onDone: () => void }) {
  const [fruit] = useState(() => shuffle(Object.entries(SORT_FRUIT).flatMap(([color, names]) => names.slice(0, 2).map((name) => ({ name, color })))));
  const [sorted, setSorted] = useState<string[]>([]);
  const targets = useDropTargets();
  const plateColors = Object.keys(SORT_FRUIT);

  const drop = (item: { name: string; color: string }, x: number, y: number) => {
    const plate = targets.hit(x, y);
    if (plate !== item.color) {
      if (plate) {
        playSfx('bloop');
        speak(say.color(item.color));
      }
      return false;
    }
    playSfx('snap');
    const now = [...sorted, item.name];
    setSorted(now);
    if (now.length === fruit.length) onDone();
    return true;
  };

  return (
    <View style={styles.sortBody}>
      <View style={styles.plates}>
        {plateColors.map((c) => (
          <View key={c} ref={targets.register(c)} onLayout={targets.measure(c)} style={[styles.plate, { borderColor: colorHex(c) }]}>
            <View style={styles.plateFruit}>
              {fruit
                .filter((f) => f.color === c && sorted.includes(f.name))
                .map((f) => (
                  <Animated.View key={f.name} entering={BounceIn}>
                    <Pic name={f.name} size={38} />
                  </Animated.View>
                ))}
            </View>
            <View style={[styles.plateDot, { backgroundColor: colorHex(c) }]} />
          </View>
        ))}
      </View>
      <View style={styles.tray}>
        {fruit.map((f) =>
          sorted.includes(f.name) ? null : (
            <Draggable key={f.name} onPickUp={() => speak(say.color(f.color))} onDrop={(x, y) => drop(f, x, y)}>
              <View style={styles.ingredient}>
                <Pic name={f.name} size={56} />
              </View>
            </Draggable>
          ),
        )}
      </View>
    </View>
  );
}

export default function Chef() {
  const { width, height } = useWindowDimensions();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('chefPick'));
  }, []);

  const hint = (step: ChefStep) => (step.kind === 'stir' ? [say.line('chefStir')] : step.kind === 'bake' ? [say.line('chefBake')] : step.kind === 'sort' ? [say.line('chefSort')] : []);

  const start = (r: Recipe) => {
    setRecipe(r);
    setStepIndex(0);
    setDone(false);
    speak(say.recipe(r.id), say.recipeStep(r.id, 0), ...hint(r.steps[0]));
  };

  const finishStep = async () => {
    if (!recipe) return;
    const next = stepIndex + 1;
    if (next < recipe.steps.length) {
      await speak(say.line('great'));
      setStepIndex(next);
      speak(say.recipeStep(recipe.id, next), ...hint(recipe.steps[next]));
    } else {
      setDone(true);
      await speak(say.recipeDone(recipe.id));
      await celebrate(true);
    }
  };

  const bowlSize = Math.min(width * 0.6, height * 0.32, 260);
  const tile = Math.min((width - Spacing.md * 4) / 2, 200);

  let body;
  if (!recipe) {
    body = (
      <View style={styles.recipes}>
        {RECIPES.map((r, i) => (
          <Animated.View key={r.id} entering={ZoomIn.delay(i * 60).springify()}>
            <Bouncy accessibilityLabel={r.name} style={[styles.recipeCard, { width: tile, height: tile }]} onPress={() => start(r)}>
              <Pic name={r.result} size={tile * 0.55} />
              <Txt size={20} style={{ textTransform: 'capitalize' }}>
                {r.name}
              </Txt>
            </Bouncy>
          </Animated.View>
        ))}
      </View>
    );
  } else if (done) {
    body = (
      <View style={styles.stepBody}>
        <Animated.View entering={BounceIn.duration(800)}>
          <Pic name={recipe.result} size={bowlSize * 1.1} />
        </Animated.View>
        <Txt size={30} weight="heavy" color={Colors.purpleDark}>
          Yum!
        </Txt>
        <Bouncy accessibilityLabel="Cook something else" style={styles.again} onPress={() => setRecipe(null)}>
          <Pic name="chef" size={34} />
          <Txt size={20} color={Colors.white}>
            Cook again
          </Txt>
        </Bouncy>
      </View>
    );
  } else {
    const step = recipe.steps[stepIndex];
    body = (
      <View style={{ flex: 1 }}>
        <View style={styles.steps}>
          {recipe.steps.map((_, i) => (
            <View key={i} style={[styles.chip, i === stepIndex && styles.chipOn, i < stepIndex && styles.chipDone]}>
              <Txt size={16} color={i === stepIndex ? Colors.white : Colors.textSoft}>
                {ORDER[i]}
              </Txt>
            </View>
          ))}
        </View>
        {step.kind === 'add' && <AddStep key={stepIndex} step={step} bowlSize={bowlSize} onDone={finishStep} />}
        {step.kind === 'stir' && <StirStep key={stepIndex} bowlSize={bowlSize} onDone={finishStep} />}
        {step.kind === 'bake' && <BakeStep key={stepIndex} size={bowlSize} onDone={finishStep} />}
        {step.kind === 'sort' && <SortStep key={stepIndex} onDone={finishStep} />}
      </View>
    );
  }

  return (
    <GameScreen
      title="Little Chef"
      background="#FFF0E0"
      onRepeat={() => (recipe && !done ? speak(say.recipeStep(recipe.id, stepIndex), ...hint(recipe.steps[stepIndex])) : speak(say.line('chefPick')))}>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  recipes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: Spacing.md, padding: Spacing.md },
  recipeCard: { backgroundColor: Colors.white, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, ...cardShadow },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingTop: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.white },
  chipOn: { backgroundColor: Colors.orange },
  chipDone: { opacity: 0.5 },
  // Anchored to the top so the plates never move as fruit leaves the tray.
  sortBody: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: Spacing.md, paddingTop: Spacing.xl * 2, gap: Spacing.xl * 2 },
  stepBody: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', padding: Spacing.md, gap: Spacing.md },
  bowlWrap: { alignItems: 'center' },
  inBowl: { position: 'absolute', top: '22%', width: '62%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  count: { backgroundColor: Colors.white, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: 2, marginTop: Spacing.sm, ...cardShadow },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, maxWidth: 420 },
  ingredient: { padding: 6, backgroundColor: Colors.white, borderRadius: 20, ...cardShadow },
  slotGap: { width: 68, height: 68 },
  spoon: { position: 'absolute' },
  meter: { width: '70%', height: 14, borderRadius: 7, backgroundColor: 'rgba(255,159,67,0.2)', overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: Colors.orange, borderRadius: 7 },
  oven: { backgroundColor: '#B8BDC8', borderRadius: 24, padding: Spacing.md, gap: Spacing.sm, ...cardShadow },
  knobs: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#5F6472' },
  window: { flex: 1, borderRadius: 16, backgroundColor: '#3B3F4C', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#8A90A0' },
  windowHot: { backgroundColor: '#FF8A3D' },
  plates: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', flexWrap: 'wrap' },
  plate: { width: 110, height: 110, borderRadius: 55, backgroundColor: Colors.white, borderWidth: 8, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  plateFruit: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 80 },
  plateDot: { position: 'absolute', bottom: -6, width: 20, height: 20, borderRadius: 10 },
  again: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.orange, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, ...cardShadow },
});
