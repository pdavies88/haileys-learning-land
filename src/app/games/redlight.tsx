import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { say } from '@/content/learning';
import { pause, playSfx, speak } from '@/lib/audio';

type Light = 'green' | 'yellow' | 'red';

// Who walks, and what waits at the end of the path. A new pair each time she gets there. Pictures
// of animals drawn facing left are mirrored so they walk forward.
const RACES = [
  { runner: 'turtle', prize: 'strawberry', facesLeft: true },
  { runner: 'bunny', prize: 'carrot', facesLeft: false },
  { runner: 'puppy', prize: 'bone', facesLeft: false },
  { runner: 'mouse', prize: 'cheese', facesLeft: false },
  { runner: 'kitten', prize: 'fish', facesLeft: false },
  { runner: 'snail', prize: 'leaf', facesLeft: true },
];

const TICK_MS = 100;
const WALK_PER_TICK = 0.012; // about eight seconds of walking on green to get there
const SLOW_ON_YELLOW = 0.5;
// Children need a moment to let go: holding on for this long after the light turns red is fine.
const REACT_MS = 600;
const SLIP_BACK = 0.12;
const STUCK_MS = 1200;

const between = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * One turn of the lights, in ms. Greens and reds come short, medium or long, so she can't count
 * along and has to watch. Higher levels warn for less time, or not at all, and from level 2 a
 * yellow sometimes turns back to green instead of red.
 */
function timing(level: number) {
  const roll = Math.random();
  return {
    green: roll < 0.3 ? between(900, 1600) : roll < 0.75 ? between(2000, 4000) : between(4500, 6500),
    yellow: Math.max(0, 1400 - level * 300) + between(0, 500),
    red: Math.random() < 0.35 ? between(1200, 2000) : between(2500, 4500),
    skipYellow: level >= 3 && Math.random() < 0.3,
    backToGreen: level >= 1 && Math.random() < 0.25,
  };
}

// Different words each time a light changes, never the same twice in a row.
const SAYINGS = {
  green: ['rlGo', 'rlGoMore', 'rlGoGreen', 'rlGoOff'],
  yellow: ['rlSlow', 'rlSlowCareful', 'rlSlowYellow'],
  red: ['rlStop', 'rlStopFreeze', 'rlStopRed', 'rlStopThere'],
} as const;
let lastSaid = '';
function saying(light: Light) {
  const options = SAYINGS[light].filter((line) => line !== lastSaid);
  lastSaid = options[Math.floor(Math.random() * options.length)];
  return say.line(lastSaid as (typeof SAYINGS)[Light][number]);
}

const LIGHT_COLORS: Record<Light, string> = { green: '#22C17A', yellow: '#FFC93C', red: '#F2545B' };

/** A traffic light, upright, or on its side where the screen is short. */
function TrafficLight({ light, size, sideways }: { light: Light; size: number; sideways: boolean }) {
  return (
    <View style={[styles.lightBox, sideways ? { flexDirection: 'row', height: size, paddingHorizontal: size * 0.12 } : { width: size, paddingVertical: size * 0.12 }, { gap: size * 0.1 }]}>
      {(['red', 'yellow', 'green'] as const).map((l) => (
        <View
          key={l}
          style={[
            styles.lamp,
            { width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35, backgroundColor: light === l ? LIGHT_COLORS[l] : '#3E3552' },
            light === l && { shadowColor: LIGHT_COLORS[l], shadowOpacity: 0.9, shadowRadius: 16 },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Stop and Go: hold the big button to walk the animal to its prize, and let go when the
 * light turns red. Practises stopping on cue. Yellow warns that red is coming. Holding on after red
 * slides the animal back a little and holds it there for a moment, with no other penalty.
 */
export default function RedLight() {
  const [light, setLight] = useState<Light>('red');
  const [holding, setHolding] = useState(false);
  const [race, setRace] = useState(0);
  const [level, setLevel] = useState(0);
  const [won, setWon] = useState(false);
  const [track, setTrack] = useState(0);
  // The game loop reads these every tick, faster than the screen redraws.
  const state = useRef({ light: 'red' as Light, holding: false, progress: 0, redSince: 0, stuckUntil: 0, won: false, level: 0 });
  const progress = useSharedValue(0);
  const bob = useSharedValue(0);
  const { celebrate, overlay } = useCelebration();
  const { runner, prize, facesLeft } = RACES[race % RACES.length];
  // On a short screen (a phone held sideways) everything shrinks so the road and button still fit.
  const short = useWindowDimensions().height < 600;

  const changeLight = (next: Light) => {
    state.current.light = next;
    if (next === 'red') state.current.redSince = Date.now();
    setLight(next);
    if (next === 'green') playSfx('chime');
    speak(saying(next));
  };

  // The lights: green, then (usually) yellow, then red, then green again, until the screen closes.
  useEffect(() => {
    let alive = true;
    const cycle = async () => {
      await speak(say.line('rlIntro'));
      while (alive) {
        if (state.current.won) {
          await pause(500);
          continue;
        }
        const t = timing(state.current.level);
        changeLight('green');
        await pause(t.green);
        if (!alive || state.current.won) continue;
        if (!t.skipYellow && t.yellow > 0) {
          changeLight('yellow');
          await pause(t.yellow);
          // Sometimes the yellow turns back to green: keep going.
          if (!alive || state.current.won || t.backToGreen) continue;
        }
        changeLight('red');
        await pause(t.red);
      }
    };
    cycle();
    return () => {
      alive = false;
    };
    // Runs once; the loop reads the latest level from the ref.
  }, []);

  const finish = async () => {
    const s = state.current;
    s.won = true;
    setWon(true);
    playSfx('tada');
    await celebrate(true);
    await speak(say.line('rlWin'));
    await pause(800);
    s.progress = 0;
    progress.value = 0;
    s.level = Math.min(s.level + 1, 5);
    setLevel(s.level);
    setRace((r) => r + 1);
    setWon(false);
    s.won = false;
    changeLight('red');
  };

  // The walk: every tick, move forward while held on green (slower on yellow).
  useEffect(() => {
    const id = setInterval(() => {
      const s = state.current;
      const now = Date.now();
      if (s.won || !s.holding || now < s.stuckUntil) return;
      if (s.light === 'red') {
        if (now - s.redSince < REACT_MS) return;
        // Still holding on red: slide back a little and wait.
        s.progress = Math.max(0, s.progress - SLIP_BACK);
        s.stuckUntil = now + STUCK_MS;
        progress.value = withTiming(s.progress, { duration: 300 });
        playSfx('bloop');
        speak(say.line('rlOops'));
        return;
      }
      s.progress = Math.min(1, s.progress + WALK_PER_TICK * (s.light === 'yellow' ? SLOW_ON_YELLOW : 1));
      progress.value = withTiming(s.progress, { duration: TICK_MS, easing: Easing.linear });
      if (s.progress >= 1) finish();
    }, TICK_MS);
    return () => clearInterval(id);
    // The interval reads everything from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A little hop while walking.
  useEffect(() => {
    bob.value = holding && light !== 'red' ? withRepeat(withSequence(withTiming(-10, { duration: 150 }), withTiming(0, { duration: 150 })), -1) : withTiming(0);
  }, [holding, light, bob]);

  const hold = (down: boolean) => {
    state.current.holding = down;
    setHolding(down);
  };

  // Big enough to see on a phone, not too big on a tablet.
  const runnerSize = Math.min(110, Math.max(56, track * 0.12));
  const walk = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * Math.max(0, track - runnerSize * 1.6) }, { translateY: bob.value }, { scaleX: facesLeft ? -1 : 1 }],
  }));
  const color = LIGHT_COLORS[light];

  return (
    <GameScreen title="Stop and Go" background="#E6F6EC" level={level} onRepeat={() => speak(say.line('rlIntro'))}>
      <View style={styles.body}>
        <View style={styles.top}>
          <TrafficLight light={light} size={short ? 46 : 84} sideways={short} />
          <Txt size={short ? 40 : 64} weight="heavy" color={color} style={[styles.sign, short && { minWidth: 140 }]}>
            {light === 'green' ? 'GO' : light === 'yellow' ? 'SLOW' : 'STOP'}
          </Txt>
        </View>

        <View style={[styles.trackArea, short && { height: 100 }]} onLayout={(e: LayoutChangeEvent) => setTrack(e.nativeEvent.layout.width)}>
          <View style={styles.road}>
            {Array.from({ length: Math.max(3, Math.floor((track - 60) / 46)) }, (_, i) => (
              <View key={i} style={styles.dash} />
            ))}
          </View>
          <View style={[styles.prize, { right: 0 }]}>
            <Pic name={prize} size={runnerSize * 0.9} />
          </View>
          <Animated.View style={[styles.runner, walk]}>
            <Pic name={runner} size={runnerSize} />
          </Animated.View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hold to walk"
          disabled={won}
          onPressIn={() => hold(true)}
          onPressOut={() => hold(false)}
          style={[styles.button, short && styles.buttonShort, { backgroundColor: color }, holding && styles.buttonDown]}>
          <Txt size={30} weight="heavy" color={light === 'yellow' ? Colors.text : Colors.white}>
            {holding ? (light === 'red' ? 'Let go!' : 'Walking…') : 'Hold to go'}
          </Txt>
        </Pressable>
      </View>
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-around', padding: Spacing.md, gap: Spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  lightBox: { alignItems: 'center', borderRadius: 26, backgroundColor: '#2B2140', ...cardShadow },
  lamp: {},
  sign: { minWidth: 220, textAlign: 'center' },
  trackArea: { alignSelf: 'stretch', height: 160, justifyContent: 'center', marginHorizontal: Spacing.lg },
  road: { position: 'absolute', left: 0, right: 0, height: 70, borderRadius: 35, backgroundColor: '#D8CFC2', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 30 },
  dash: { width: 26, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  prize: { position: 'absolute' },
  runner: { position: 'absolute', left: 0 },
  button: { width: 340, maxWidth: '90%', height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  buttonShort: { height: 64, width: 260 },
  buttonDown: { transform: [{ scale: 0.96 }], opacity: 0.9 },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
