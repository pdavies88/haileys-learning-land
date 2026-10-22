import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
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
import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing, cardShadow, raised } from '@/constants/theme';
import { MISSIONS, PETS, say, type PetLine } from '@/content/learning';
import { useDropTargets } from '@/hooks/use-drop-targets';
import { pause, playSfx, speak, speakAfter } from '@/lib/audio';
import { randomInt } from '@/lib/random';

type Pet = (typeof PETS)[number];
type Need = 'food' | 'play' | 'bath' | 'sleep';
type Needs = Record<Need, number>;
type Action = 'eat' | 'play' | 'bath' | 'sleep' | 'cuddle' | 'no' | null;

const NEEDS: Need[] = ['food', 'play', 'bath', 'sleep'];
/** Below this, the pet asks for it. */
const WANTS = 45;
/** Five happy moments fill the love meter for a big celebration. */
const HEARTS = 5;
const TICK_MS = 7000;
const ASKS: Record<Need, PetLine> = { food: 'hungry', play: 'wantsPlay', bath: 'wantsBath', sleep: 'wantsSleep' };
const DONE: Record<Need, PetLine> = { food: 'yum', play: 'played', bath: 'clean', sleep: 'rested' };
const NEED_COLORS: Record<Need, string> = { food: '#FF8A3D', play: '#3B8EF0', bath: '#14B8A6', sleep: '#8B5CF6' };

const foodOf = (pet: Pet) => MISSIONS.find((m) => m.animal === pet.mission)!;
const itemFor = (pet: Pet, need: Need) => (need === 'food' ? foodOf(pet).food : need === 'play' ? 'ball' : need === 'bath' ? 'bubbles' : 'bed');

/** The neediest need, if the pet wants anything. */
const wanted = (needs: Needs): Need | null => {
  const lowest = NEEDS.reduce((a, b) => (needs[a] <= needs[b] ? a : b));
  return needs[lowest] < WANTS ? lowest : null;
};

/** Something that floats up and fades: hearts after a cuddle, bubbles in the bath. */
function Floater({ name, x, delay }: { name: string; x: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 1300 + delay }));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ translateY: -140 * t.value }, { scale: 0.6 + 0.6 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.floater, { left: x }, style]}>
      <Pic name={name} size={36} />
    </Animated.View>
  );
}

/** The pet: bobs when content, droops when it needs something, and acts out what it's doing. */
function PetFigure({ pet, size, action, actionId, sad, muddy }: { pet: Pet; size: number; action: Action; actionId: number; sad: boolean; muddy: boolean }) {
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Idle: a gentle bob, slower and lower when the pet is sad.
  useEffect(() => {
    y.set(withRepeat(withSequence(withTiming(sad ? 4 : -8, { duration: sad ? 1400 : 900 }), withTiming(0, { duration: sad ? 1400 : 900 })), -1, true));
  }, [sad, y]);

  // A new action id replays the animation, even for the same action twice in a row.
  useEffect(() => {
    if (!action) return;
    if (action === 'eat') scale.set(withSequence(withTiming(1.12, { duration: 120 }), withTiming(0.95, { duration: 120 }), withTiming(1.1, { duration: 120 }), withSpring(1)));
    if (action === 'play') y.set(withSequence(withTiming(-70, { duration: 220 }), withTiming(0, { duration: 220 }), withTiming(-50, { duration: 200 }), withTiming(0, { duration: 200 })));
    if (action === 'bath') rotate.set(withSequence(withTiming(-10, { duration: 90 }), withTiming(10, { duration: 120 }), withTiming(-8, { duration: 120 }), withTiming(8, { duration: 120 }), withSpring(0)));
    if (action === 'sleep') scale.set(withRepeat(withSequence(withTiming(1.04, { duration: 700 }), withTiming(0.98, { duration: 700 })), 3, true));
    if (action === 'cuddle') scale.set(withSequence(withSpring(1.15), withSpring(1)));
    if (action === 'no') rotate.set(withSequence(withTiming(-12, { duration: 90 }), withTiming(12, { duration: 120 }), withTiming(-8, { duration: 120 }), withSpring(0)));
  }, [action, actionId, rotate, scale, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: scale.value }, { rotate: `${rotate.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Pic name={pet.id} size={size} style={action === 'sleep' ? { opacity: 0.85 } : undefined} />
      {muddy ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {[
            { x: 0.25, y: 0.62, s: 0.14 },
            { x: 0.62, y: 0.7, s: 0.11 },
            { x: 0.45, y: 0.82, s: 0.09 },
            { x: 0.7, y: 0.45, s: 0.08 },
          ].map((m, i) => (
            <View key={i} style={[styles.mud, { left: m.x * size, top: m.y * size, width: m.s * size, height: m.s * size * 0.8, borderRadius: m.s * size }]} />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

/**
 * My little pet, a pocket pet to look after. Over time it gets hungry, bored, muddy and sleepy, and
 * says so with a thought bubble. Drag the food, ball, bubbles or bed onto it and it eats, plays,
 * splashes or naps. Tap it for a cuddle. Five happy moments fill the love meter.
 */
export default function PetGame() {
  const { width, height } = useWindowDimensions();
  const [pet, setPet] = useState<Pet | null>(null);
  const [needs, setNeeds] = useState<Needs>({ food: 80, play: 80, bath: 80, sleep: 80 });
  const [hearts, setHearts] = useState(0);
  const [action, setAction] = useState<Action>(null);
  const [actionId, setActionId] = useState(0);
  const [floaters, setFloaters] = useState<{ id: number; name: string; x: number; delay: number }[]>([]);
  const [asleep, setAsleep] = useState(false);
  const [fed, setFed] = useState(0);
  const [feedGoal, setFeedGoal] = useState(3);
  const [trayKey, setTrayKey] = useState(0);
  const busy = useRef(false);
  const fedRef = useRef(0);
  const lastAsk = useRef<Need | null>(null);
  const needsRef = useRef<Needs>(needs);
  const nextFloat = useRef(1);
  const targets = useDropTargets();
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('petPick'));
  }, []);

  /** Changes the needs. When the pet becomes hungry, it picks how many treats it wants. */
  const updateNeeds = (next: Needs) => {
    const before = wanted(needsRef.current);
    needsRef.current = next;
    setNeeds(next);
    if (wanted(next) === 'food' && before !== 'food') {
      fedRef.current = 0;
      setFed(0);
      setFeedGoal(randomInt(2, 4));
    }
  };

  // Over time the pet gets hungry, bored, muddy and sleepy, one need at a time.
  useEffect(() => {
    if (!pet || asleep) return;
    const timer = setInterval(() => {
      if (busy.current) return;
      const need = NEEDS[randomInt(0, NEEDS.length - 1)];
      const n = needsRef.current;
      updateNeeds({ ...n, [need]: Math.max(0, n[need] - randomInt(15, 25)) });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [pet, asleep]);

  const want = wanted(needs);

  // When a new want appears, the pet says so. A hungry pet asks for a number of treats.
  useEffect(() => {
    if (!pet || !want || want === lastAsk.current || busy.current) return;
    lastAsk.current = want;
    if (want === 'food') {
      speak(say.pet(pet.id, 'hungry'), say.mission(foodOf(pet), feedGoal));
    } else {
      speak(say.pet(pet.id, ASKS[want]));
    }
  }, [want, pet, feedGoal]);

  const float = (name: string, count: number) => {
    const items = Array.from({ length: count }, (_, i) => ({ id: nextFloat.current++, name, x: randomInt(-60, 60), delay: i * 120 }));
    setFloaters((f) => [...f.slice(-12), ...items]);
  };

  const act = (a: Action) => {
    setAction(a);
    setActionId((n) => n + 1);
  };

  /** A need was met: the pet acts it out, says so, and the love meter fills a little. */
  const satisfied = async (need: Need) => {
    if (!pet) return;
    busy.current = true;
    lastAsk.current = null;
    updateNeeds({ ...needsRef.current, [need]: 100 });
    if (need === 'sleep') {
      setAsleep(true);
      act('sleep');
      await pause(3000);
      setAsleep(false);
    }
    playSfx('star');
    float('heart', 3);
    await speak(say.pet(pet.id, DONE[need]));
    const now = hearts + 1;
    if (now >= HEARTS) {
      setHearts(HEARTS);
      await celebrate(true);
      setHearts(0);
    } else {
      setHearts(now);
    }
    busy.current = false;
  };

  /** Something was dropped on the pet. */
  const give = (need: Need) => {
    if (!pet || busy.current) return;
    // Put the item back in the tray straight away, ready to use again.
    setTrayKey((k) => k + 1);
    if (need !== want && needs[need] > 70) {
      act('no');
      playSfx('bloop');
      speak(say.pet(pet.id, 'notNow'), ...(want ? [say.pet(pet.id, ASKS[want])] : []));
      return;
    }
    if (need === 'food') {
      act('eat');
      playSfx('pop');
      const n = fedRef.current + 1;
      fedRef.current = n;
      setFed(n);
      const goal = want === 'food' ? feedGoal : 1;
      // Each treat is counted out loud; the first cuts off whatever the pet was saying.
      if (n < goal) {
        if (n === 1) speak(say.number(1));
        else speakAfter(say.number(n));
        return;
      }
      busy.current = true;
      fedRef.current = 0;
      (n === 1 ? speak(say.number(1)) : speakAfter(say.number(n))).then(() => {
        busy.current = false;
        setFed(0);
        satisfied('food');
      });
      return;
    }
    if (need === 'play') {
      act('play');
      playSfx('whoosh');
      float('ball', 1);
    }
    if (need === 'bath') {
      act('bath');
      playSfx('sparkle');
      float('bubbles', 5);
    }
    satisfied(need);
  };

  const cuddle = () => {
    if (!pet || busy.current) return;
    act('cuddle');
    float('heart', 2);
    playSfx('pop');
    speak(say.pet(pet.id, 'giggle'));
  };

  const tile = Math.min((width - Spacing.md * 4) / 2, 190);

  if (!pet) {
    return (
      <GameScreen title="My little pet" background="#E6F7E8" onRepeat={() => speak(say.line('petPick'))}>
        <View style={styles.picker}>
          {PETS.map((p, i) => (
            <Animated.View key={p.id} entering={ZoomIn.delay(i * 60).springify()}>
              <Bouncy
                accessibilityLabel={p.name}
                style={[styles.petCard, { width: tile, height: tile }]}
                onPress={() => {
                  setPet(p);
                  needsRef.current = { food: 80, play: 80, bath: 80, sleep: 80 };
                  updateNeeds({ food: randomInt(30, 44), play: randomInt(55, 90), bath: randomInt(55, 90), sleep: randomInt(60, 95) });
                  setHearts(0);
                  lastAsk.current = null;
                  speak(say.pet(p.id, 'hello'), say.line('petHowTo'));
                }}>
                <Pic name={p.id} size={tile * 0.6} />
                <Txt size={20}>{p.name}</Txt>
              </Bouncy>
            </Animated.View>
          ))}
        </View>
      </GameScreen>
    );
  }

  const petSize = Math.min(width * 0.5, height * 0.3, 280);
  const sad = NEEDS.some((n) => needs[n] < 25);
  return (
    <GameScreen
      title="My little pet"
      background={asleep ? '#C9C3F0' : '#E6F7E8'}
      onRepeat={() => speak(want ? say.pet(pet.id, ASKS[want]) : say.line('petHowTo'))}>
      <View style={styles.home}>
        <View style={styles.meters}>
          {NEEDS.map((n) => (
            <View key={n} style={styles.meter}>
              <Pic name={itemFor(pet, n)} size={26} />
              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: `${needs[n]}%`, backgroundColor: NEED_COLORS[n] }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.hearts}>
          {Array.from({ length: HEARTS }, (_, i) => (
            <Pic key={i} name="heart" size={26} style={{ opacity: i < hearts ? 1 : 0.2 }} />
          ))}
        </View>

        <View style={styles.stage}>
          {want && !asleep ? (
            <Animated.View key={want} entering={ZoomIn.springify()} exiting={FadeOut} style={[styles.bubble, { left: petSize * 0.62 }]}>
              <Pic name={itemFor(pet, want)} size={46} />
              {want === 'food' ? (
                <Txt size={22} weight="heavy" color={Colors.orange}>
                  {feedGoal - fed}
                </Txt>
              ) : null}
            </Animated.View>
          ) : null}
          <View ref={targets.register('pet')} onLayout={targets.measure('pet')}>
            <Bouncy accessibilityLabel={`Pet ${pet.name}`} onPress={cuddle} sound={false}>
              <PetFigure pet={pet} size={petSize} action={action} actionId={actionId} sad={sad} muddy={needs.bath < WANTS} />
            </Bouncy>
          </View>
          {asleep ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="none" style={styles.zzz}>
              <Txt size={44} weight="heavy" color={Colors.purpleDark}>
                Zzz
              </Txt>
            </Animated.View>
          ) : null}
          {floaters.map((f) => (
            <Floater key={f.id} name={f.name} x={petSize / 2 + f.x - 18} delay={f.delay} />
          ))}
        </View>

        <Txt size={17} weight="regular" color={Colors.textSoft}>
          Drag something to {pet.name.toLowerCase()}, or tap to pet
        </Txt>
        <View key={trayKey} style={styles.tray}>
          {NEEDS.map((n) => (
            <Draggable
              key={n}
              onDrop={(x, y) => {
                if (targets.hit(x, y, 40) !== 'pet') return false;
                give(n);
                return true;
              }}>
              <View style={styles.item}>
                <Pic name={itemFor(pet, n)} size={52} />
              </View>
            </Draggable>
          ))}
        </View>

        <Bouncy
          accessibilityLabel="Pick another pet"
          style={styles.change}
          onPress={() => {
            setPet(null);
            speak(say.line('petPick'));
          }}>
          <Txt size={16} color={Colors.textSoft}>
            Another pet
          </Txt>
        </Bouncy>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  picker: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: Spacing.md, padding: Spacing.md },
  petCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, ...raised('#C8E8CC') },
  home: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', padding: Spacing.md },
  meters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meterTrack: { width: 44, height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 5 },
  hearts: { flexDirection: 'row', gap: 4 },
  stage: { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xl },
  bubble: {
    position: 'absolute',
    top: -10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...cardShadow,
  },
  zzz: { position: 'absolute', top: 0, right: -20 },
  floater: { position: 'absolute', bottom: '40%' },
  mud: { position: 'absolute', backgroundColor: 'rgba(110, 70, 40, 0.55)' },
  tray: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  item: { padding: 10, backgroundColor: Colors.white, borderRadius: Radius.md, ...cardShadow },
  change: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)' },
});
