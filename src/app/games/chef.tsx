/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { Canvas, LinearGradient, Oval, Path as SkiaPath, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  BounceIn,
  BounceInDown,
  FadeOutUp,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { Draggable } from '@/components/draggable';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { TouchPad } from '@/components/touch-pad';
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, cardShadow, raised } from '@/constants/theme';
import { CHEF_MAX, CHEF_MIN, COLORS, PANTRY, RECIPES, SORT_FRUIT, say, type ChefStep } from '@/content/learning';
import { useDropTargets } from '@/hooks/use-drop-targets';
import { useLock } from '@/hooks/use-lock';
import { pause, playSfx, speak, speakAfter } from '@/lib/audio';
import { randomInt, sample, shuffle } from '@/lib/random';

type Recipe = (typeof RECIPES)[number];
type AddChefStep = Extract<ChefStep, { kind: 'add' }>;
const ORDER = ['First', 'Next', 'Last'];
const MAX_LEVEL = 2;
const colorHex = (name: string) => COLORS.find((c) => c.name === name)!.hex;

// Each level asks for bigger amounts and hides the ingredient among more kinds of food.
const LEVELS = [
  { min: CHEF_MIN, max: 5, decoyKinds: 1, sortColors: 3, perColor: 2 },
  { min: 3, max: 7, decoyKinds: 2, sortColors: 3, perColor: 3 },
  { min: 4, max: CHEF_MAX, decoyKinds: 3, sortColors: 4, perColor: 3 },
];

/** Picks how many of each ingredient this recipe needs, for the current level. */
function plan(recipe: Recipe, level: number) {
  const { min, max } = LEVELS[level];
  return recipe.steps.map((step) => (step.kind === 'add' ? randomInt(min, max) : 0));
}

/** Wobbles when something lands in it. */
function Bowl({ size, hits, children }: { size: number; hits: number; children?: ReactNode }) {
  const tilt = useSharedValue(0);
  useEffect(() => {
    if (hits > 0) tilt.set(withSequence(withTiming(-6, { duration: 70 }), withTiming(6, { duration: 110 }), withSpring(0, { damping: 6 })));
  }, [hits, tilt]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Pic name="bowl" size={size} />
      {children}
    </Animated.View>
  );
}

/**
 * Find the right ingredient on the pantry shelf, among other foods, and put in exactly the number
 * on the recipe card. Tap the check when it's right. Too many? Tap one in the bowl to take it out.
 */
function AddStep({
  recipe,
  stepIndex,
  step,
  count,
  level,
  bowlSize,
  onDone,
}: {
  recipe: Recipe;
  stepIndex: number;
  step: AddChefStep;
  count: number;
  level: number;
  bowlSize: number;
  onDone: () => void;
}) {
  const { width } = useWindowDimensions();
  // The shelf: enough of the right ingredient to go over, mixed with a few other foods.
  const [shelf] = useState(() => {
    const decoys = sample(
      PANTRY.filter((p) => p !== step.item),
      LEVELS[level].decoyKinds,
    );
    const items = [
      ...Array.from({ length: Math.min(count + 2, 10) }, () => step.item),
      ...decoys.flatMap((d) => Array.from({ length: randomInt(2, 3) }, () => d)),
    ];
    return shuffle(items).map((name, id) => ({ id, name }));
  });
  const [inBowl, setInBowl] = useState<number[]>([]);
  const bowl = useRef<number[]>([]);
  const [wrong, setWrong] = useState<Record<number, number>>({});
  const [hits, setHits] = useState(0);
  const lock = useLock();
  const prompt = say.chefAdd(recipe.id, stepIndex, count);

  const put = (item: { id: number; name: string }) => {
    if (bowl.current.includes(item.id)) return;
    if (item.name !== step.item) {
      playSfx('bloop');
      setWrong((w) => ({ ...w, [item.id]: (w[item.id] ?? 0) + 1 }));
      speak(say.picture(item.name), prompt);
      return;
    }
    const now = [...bowl.current, item.id];
    bowl.current = now;
    setInBowl(now);
    setHits((h) => h + 1);
    playSfx('pop');
    // The first one cuts off the instruction; then each number queues after the last.
    if (now.length === 1) speak(say.number(1));
    else speakAfter(say.number(now.length));
  };

  const takeOut = (id: number) => {
    if (!bowl.current.includes(id)) return;
    const now = bowl.current.filter((i) => i !== id);
    bowl.current = now;
    setInBowl(now);
    playSfx('flip');
    speak(say.number(now.length));
  };

  const check = async () => {
    const n = bowl.current.length;
    if (n === count) {
      if (!lock.take()) return;
      playSfx('chime');
      onDone();
    } else if (n > count) {
      playSfx('bloop');
      speak(say.line('chefTooMany'));
    } else {
      playSfx('bloop');
      speak(say.line('chefMore'), prompt);
    }
  };

  const item = Math.min((width - 80) / 6, 64);
  return (
    <View style={styles.stepBody}>
      <View style={styles.kitchen}>
        <View style={styles.card}>
          <Txt size={14} weight="bold" color={Colors.textSoft}>
            Recipe
          </Txt>
          <View style={styles.cardRow}>
            <Txt size={52} weight="heavy" color={Colors.orange}>
              {count}
            </Txt>
            <Pic name={step.item} size={54} />
          </View>
        </View>
        <Bowl size={bowlSize} hits={hits}>
          <View style={[styles.inBowl, { width: bowlSize * 0.62 }]}>
            {inBowl.map((id) => (
              <Animated.View key={id} entering={BounceInDown.duration(500)} exiting={ZoomOut}>
                <TouchPad label={`Take out a ${step.one}`} onTouch={() => takeOut(id)}>
                  <Pic name={step.item} size={bowlSize * 0.15} />
                </TouchPad>
              </Animated.View>
            ))}
          </View>
        </Bowl>
      </View>
      <View style={[styles.shelf, { maxWidth: (item + 22) * 6 }]}>
        {shelf.map((food) =>
          inBowl.includes(food.id) ? (
            <View key={food.id} style={{ width: item + 12, height: item + 12 }} />
          ) : (
            <Animated.View key={food.id} entering={ZoomIn.delay(food.id * 25)} exiting={FadeOutUp.duration(250)}>
              <Wiggle times={wrong[food.id] ?? 0}>
                <TouchPad label={food.name} onTouch={() => put(food)} style={styles.ingredient}>
                  <Pic name={food.name} size={item} />
                </TouchPad>
              </Wiggle>
            </Animated.View>
          ),
        )}
      </View>
      <Bouncy accessibilityLabel="That's the right amount" sound={false} onPress={check} style={styles.checkButton}>
        <Pic name="check" size={34} />
        <Txt size={20} color={Colors.white}>
          Done
        </Txt>
      </Bouncy>
    </View>
  );
}

/** Shakes "no" each time `times` goes up. */
function Wiggle({ times, children }: { times: number; children: ReactNode }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (times > 0) x.set(withSequence(withTiming(-8, { duration: 60 }), withTiming(8, { duration: 80 }), withTiming(-5, { duration: 80 }), withTiming(0, { duration: 60 })));
  }, [times, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * An empty mixing bowl seen from the side, drawn in two layers so the spoon can dip inside it: the
 * rim and batter go behind the spoon, the front of the bowl goes in front of it.
 */
function MixingBowl({ box, swirl, children }: { box: number; swirl: number; children: ReactNode }) {
  const cx = box / 2;
  const rimY = box * 0.4;
  const rx = box * 0.42;
  const ry = box * 0.13;
  const depth = box * 0.4;
  const rim = Skia.XYWHRect(cx - rx, rimY - ry, rx * 2, ry * 2);
  const batter = Skia.XYWHRect(cx - rx + 8, rimY - ry + 6, rx * 2 - 16, ry * 2 - 12);
  const streak = Skia.XYWHRect(cx - rx * 0.55, rimY - ry * 0.45, rx * 1.1, ry * 0.9);
  // The batter swirls round as she stirs.
  const swirls = Skia.PathBuilder.Make().addArc(streak, swirl, 70).addArc(streak, swirl + 180, 70).build();
  const front = Skia.PathBuilder.Make()
    .moveTo(cx + rx, rimY)
    .arcToOval(rim, 0, 180, false)
    .cubicTo(cx - rx, rimY + depth * 0.6, cx - rx * 0.7, rimY + depth, cx - rx * 0.45, rimY + depth)
    .lineTo(cx + rx * 0.45, rimY + depth)
    .cubicTo(cx + rx * 0.7, rimY + depth, cx + rx, rimY + depth * 0.6, cx + rx, rimY)
    .close()
    .build();
  const lip = Skia.PathBuilder.Make().addArc(rim, 0, 180).build();
  return (
    <View style={{ width: box, height: box }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Oval rect={rim} color="#3F6FD8" />
        <Oval rect={batter} color="#FFE2A6" />
        <SkiaPath path={swirls} color="rgba(255,255,255,0.8)" style="stroke" strokeWidth={5} strokeCap="round" />
      </Canvas>
      {children}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <SkiaPath path={front}>
          <LinearGradient start={vec(0, rimY)} end={vec(0, rimY + depth)} colors={['#5B9BFF', '#3A63D6']} />
        </SkiaPath>
        <SkiaPath path={lip} color="#8FC0FF" style="stroke" strokeWidth={6} strokeCap="round" />
      </Canvas>
    </View>
  );
}

/**
 * Stir by moving a finger round and round the bowl; two turns finish it. The bowl stays still and
 * the spoon circles inside it, leaning and turning as it goes like a real spoon mixing batter.
 */
function StirStep({ bowlSize, onDone }: { bowlSize: number; onDone: () => void }) {
  'use no memo';
  const [turned, setTurned] = useState(0);
  const [angle, setAngle] = useState(-Math.PI / 2);
  const last = useRef<number | null>(null);
  const total = useRef(0);
  const finished = useRef(false);
  const goal = Math.PI * 4;
  const box = bowlSize * 1.3;
  const center = { x: box / 2, y: box * 0.42 };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      last.current = Math.atan2(e.y - center.y, e.x - center.x);
    })
    .onUpdate((e) => {
      const a = Math.atan2(e.y - center.y, e.x - center.x);
      setAngle(a);
      if (last.current !== null) {
        let delta = a - last.current;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        total.current += Math.abs(delta);
        setTurned(total.current);
      }
      last.current = a;
      if (!finished.current && total.current >= goal) {
        finished.current = true;
        playSfx('chime');
        onDone();
      }
    });

  // The spoon's head follows a flat circle inside the bowl. In the picture the head sits up and to
  // the left, so it turns 225 degrees to point down into the batter, then leans out and turns
  // as it goes round.
  const spoon = box * 0.46;
  const head = spoon * 0.27;
  const hx = center.x + Math.cos(angle) * box * 0.2;
  const hy = center.y + Math.sin(angle) * box * 0.055;
  return (
    <View style={styles.stepBody}>
      <GestureDetector gesture={pan}>
        <View style={{ width: box, height: box }}>
          <MixingBowl box={box} swirl={(turned * 180) / Math.PI}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: hx - head,
                top: hy - head,
                transformOrigin: [head, head, 0],
                // A flat squeeze stands in for turning: a real 3D turn would lift the spoon above the bowl's front.
                transform: [{ rotate: `${225 + Math.cos(angle) * 18}deg` }, { scaleX: 0.7 + 0.3 * Math.abs(Math.sin(angle)) }],
              }}>
              <Pic name="spoon" size={spoon} />
            </View>
          </MixingBowl>
          <View pointerEvents="none" style={styles.sparkle}>
            <Pic name="sparkles" size={bowlSize * 0.22} style={{ opacity: Math.min(1, turned / goal) }} />
          </View>
        </View>
      </GestureDetector>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${Math.min(100, (turned / goal) * 100)}%` }]} />
      </View>
    </View>
  );
}

/** A puff of steam that rises and fades, over and over. */
function Steam({ delay, x }: { delay: number; x: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1400 }), -1, false)));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateY: -60 * t.value }, { scale: 0.6 + t.value * 0.6 }] }));
  return (
    <Animated.View style={[styles.steam, { left: x }, style]}>
      <Pic name="cloud" size={44} />
    </Animated.View>
  );
}

/** Tap the oven to bake: it glows, shakes, steams, and counts down three, two, one. */
function BakeStep({ size, onDone }: { size: number; onDone: () => void }) {
  const [count, setCount] = useState<number | null>(null);
  const shake = useSharedValue(0);
  const bake = async () => {
    if (count !== null) return;
    playSfx('whoosh');
    shake.set(withRepeat(withSequence(withTiming(-2, { duration: 60 }), withTiming(2, { duration: 60 })), -1, true));
    for (const n of [3, 2, 1]) {
      setCount(n);
      await speak(say.number(n));
    }
    shake.set(0);
    setCount(0);
    playSfx('chime');
    onDone();
  };
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const hot = count !== null;
  return (
    <View style={styles.stepBody}>
      <View>
        {hot ? [0, 1, 2].map((i) => <Steam key={i} delay={i * 450} x={size * (0.2 + i * 0.25)} />) : null}
        <Animated.View style={style}>
          <Bouncy accessibilityLabel="Oven" onPress={bake} sound={false} style={[styles.oven, { width: size, height: size * 0.85 }]}>
            <View style={styles.knobs}>
              {[0, 1, 2].map((k) => (
                <View key={k} style={[styles.knob, hot && styles.knobOn]} />
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
        </Animated.View>
      </View>
    </View>
  );
}

/** Drag each fruit onto the plate of its color. Higher levels add a fourth color and more fruit. */
function SortStep({ level, onDone }: { level: number; onDone: () => void }) {
  const { sortColors, perColor } = LEVELS[level];
  const [plateColors] = useState(() => sample(Object.keys(SORT_FRUIT), sortColors));
  const [fruit] = useState(() => shuffle(plateColors.flatMap((color) => SORT_FRUIT[color].slice(0, perColor).map((name) => ({ name, color })))));
  const [sorted, setSorted] = useState<string[]>([]);
  const targets = useDropTargets();

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
                    <Pic name={f.name} size={30} />
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
  const [counts, setCounts] = useState<number[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [level, setLevel] = useState(0);
  const finishing = useLock();
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('chefPick'));
  }, []);

  /** What to say for a step: its instruction, then how to do it. */
  const instruction = (r: Recipe, i: number, plannedCounts = counts) => {
    const step = r.steps[i];
    if (step.kind === 'add') return [say.chefAdd(r.id, i, plannedCounts[i]), say.line('chefCheck')];
    const how = step.kind === 'stir' ? 'chefStir' : step.kind === 'bake' ? 'chefBake' : 'chefSort';
    return [say.recipeStep(r.id, i), say.line(how)];
  };

  const start = (r: Recipe) => {
    const planned = plan(r, level);
    setRecipe(r);
    setCounts(planned);
    setStepIndex(0);
    setDone(false);
    finishing.release();
    speak(say.recipe(r.id), ...instruction(r, 0, planned));
  };

  const finishStep = async () => {
    if (!recipe || !finishing.take()) return;
    const next = stepIndex + 1;
    if (next < recipe.steps.length) {
      await pause(700);
      setStepIndex(next);
      finishing.release();
      speak(...instruction(recipe, next));
    } else {
      setDone(true);
      setLevel((l) => Math.min(MAX_LEVEL, l + 1));
      await celebrate(true);
    }
  };

  const bowlSize = Math.min(width * 0.5, height * 0.26, 240);
  const tile = Math.min((width - Spacing.md * 4) / 2, 200);

  let body;
  if (!recipe) {
    body = (
      <View style={styles.recipes}>
        {RECIPES.map((r, i) => (
          <Animated.View key={r.id} entering={ZoomIn.delay(i * 60).springify()}>
            <Bouncy accessibilityLabel={r.name} style={[styles.recipeCard, { width: tile, height: tile }]} onPress={() => start(r)}>
              <Pic name={r.result} size={tile * 0.55} />
              <Txt size={20}>
                {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
              </Txt>
            </Bouncy>
          </Animated.View>
        ))}
      </View>
    );
  } else if (done) {
    body = (
      <View style={styles.stepBody}>
        <Animated.View entering={BounceIn.duration(900)}>
          <Pic name={recipe.result} size={bowlSize * 1.3} />
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
        {step.kind === 'add' && (
          <AddStep key={stepIndex} recipe={recipe} stepIndex={stepIndex} step={step} count={counts[stepIndex]} level={level} bowlSize={bowlSize} onDone={finishStep} />
        )}
        {step.kind === 'stir' && <StirStep key={stepIndex} bowlSize={bowlSize} onDone={finishStep} />}
        {step.kind === 'bake' && <BakeStep key={stepIndex} size={bowlSize} onDone={finishStep} />}
        {step.kind === 'sort' && <SortStep key={stepIndex} level={level} onDone={finishStep} />}
      </View>
    );
  }

  return (
    <GameScreen
      title="Little chef"
      background="#FFE9D6"
      level={recipe ? level : undefined}
      onRepeat={() => (recipe && !done ? speak(...instruction(recipe, stepIndex)) : speak(say.line('chefPick')))}>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  recipes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: Spacing.md, padding: Spacing.md },
  recipeCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, ...raised('#F1D3BD') },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingTop: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.white },
  chipOn: { backgroundColor: Colors.orange },
  chipDone: { opacity: 0.5 },
  // Anchored to the top so the plates never move as fruit leaves the tray.
  sortBody: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: Spacing.md, paddingTop: Spacing.xl * 2, gap: Spacing.xl * 2 },
  stepBody: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', padding: Spacing.md, gap: Spacing.md },
  kitchen: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, flexWrap: 'wrap', justifyContent: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignItems: 'center', ...raised('#F1D3BD', 5) },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  inBowl: { position: 'absolute', top: '24%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  shelf: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: Radius.lg, padding: Spacing.sm },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, maxWidth: 460 },
  ingredient: { padding: 6, backgroundColor: Colors.white, borderRadius: 20, ...cardShadow },
  checkButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.green, borderRadius: 999, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, ...raised('#169a5f', 5) },
  sparkle: { position: 'absolute', top: 0, right: 0 },
  meter: { width: '70%', height: 14, borderRadius: 7, backgroundColor: 'rgba(255,159,67,0.2)', overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: Colors.orange, borderRadius: 7 },
  steam: { position: 'absolute', top: -40, zIndex: 2 },
  oven: { backgroundColor: '#B8BDC8', borderRadius: 24, padding: Spacing.md, gap: Spacing.sm, ...cardShadow },
  knobs: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#5F6472' },
  knobOn: { backgroundColor: '#FF5A3D' },
  window: { flex: 1, borderRadius: 16, backgroundColor: '#3B3F4C', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#8A90A0' },
  windowHot: { backgroundColor: '#FF8A3D' },
  plates: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', flexWrap: 'wrap' },
  plate: { width: 104, height: 104, borderRadius: 52, backgroundColor: Colors.white, borderWidth: 8, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  plateFruit: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 78 },
  plateDot: { position: 'absolute', bottom: -6, width: 20, height: 20, borderRadius: 10 },
  again: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.orange, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, ...cardShadow },
});
