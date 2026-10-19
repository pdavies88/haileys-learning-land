/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. SwipePad opts out of React Compiler with 'use no memo'. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import type { SfxName } from '@/content/audio-files';
import { ABC_SONG, LETTERS, XYLOPHONE, say } from '@/content/learning';
import { playSfx, speak, stopSpeaking } from '@/lib/audio';
import { randomInt } from '@/lib/random';

type Tab = 'play' | 'band' | 'copy' | 'sing';
const TABS: { id: Tab; label: string; picture: string }[] = [
  { id: 'play', label: 'Play', picture: 'piano' },
  { id: 'band', label: 'Band', picture: 'drum' },
  { id: 'copy', label: 'Copy me', picture: 'music' },
  { id: 'sing', label: 'Sing', picture: 'bell' },
];
// Band instruments are played by swiping across them. `every` is how far (in points) a finger
// travels between sounds while it keeps swiping: short for a shaker, long for a strum.
const BAND: { sfx: SfxName; picture: string; color: string; label: string; every: number }[] = [
  { sfx: 'drum', picture: 'drum', color: '#F2545B', label: 'Drum', every: 90 },
  { sfx: 'shaker', picture: 'maracas', color: '#3CC47C', label: 'Maracas', every: 45 },
  { sfx: 'clap', picture: 'clap', color: '#FFB627', label: 'Clapping hands', every: 80 },
  { sfx: 'bell', picture: 'bell', color: '#4D9DE0', label: 'Bell', every: 110 },
  { sfx: 'strum', picture: 'guitar', color: '#9B6DE3', label: 'Guitar', every: 120 },
];

/**
 * Plays the moment a finger touches it, not when it lifts, and lets several fingers play several
 * bars at once. Taps from mashing are all heard.
 */
function TouchPad({ onTouch, style, label, children }: { onTouch: () => void; style: StyleProp<ViewStyle>; label: string; children?: ReactNode }) {
  const scale = useSharedValue(1);
  const gesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin(() => {
      scale.set(withSequence(withTiming(0.92, { duration: 50 }), withSpring(1, { damping: 10 })));
      onTouch();
    });
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View accessible accessibilityRole="button" accessibilityLabel={label} style={[style, animated]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/** Plays when a finger swipes across it, and again as the finger keeps moving. A plain tap is silent. */
function SwipePad({ every, onPlay, onTapOnly, style, label, children }: {
  every: number;
  onPlay: () => void;
  onTapOnly: () => void;
  style: StyleProp<ViewStyle>;
  label: string;
  children?: ReactNode;
}) {
  'use no memo';
  const tilt = useSharedValue(0);
  const travelled = useRef(0);
  const last = useRef({ x: 0, y: 0 });
  const played = useRef(false);
  const hit = () => {
    played.current = true;
    tilt.set(withSequence(withTiming(-10, { duration: 60 }), withTiming(10, { duration: 90 }), withSpring(0, { damping: 8 })));
    onPlay();
  };
  const gesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(12)
    .onBegin(() => {
      played.current = false;
    })
    .onStart((e) => {
      travelled.current = 0;
      last.current = { x: e.translationX, y: e.translationY };
      hit();
    })
    .onUpdate((e) => {
      travelled.current += Math.hypot(e.translationX - last.current.x, e.translationY - last.current.y);
      last.current = { x: e.translationX, y: e.translationY };
      if (travelled.current >= every) {
        travelled.current = 0;
        hit();
      }
    })
    .onFinalize(() => {
      if (!played.current) onTapOnly();
    });
  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View accessible accessibilityRole="button" accessibilityLabel={label} style={[style, animated]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
const BEAT = 520; // ms

const xylo = (bar: number) => `xylo${bar}` as SfxName;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Music() {
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('play');
  const [lit, setLit] = useState<number | null>(null);
  const [tune, setTune] = useState<number[]>([]);
  const [entered, setEntered] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [singing, setSinging] = useState<string | null>(null);
  const run = useRef(0);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('musicIntro'));
    return () => {
      run.current += 1;
    };
  }, []);

  const flash = (bar: number) => {
    setLit(bar);
    setTimeout(() => setLit((current) => (current === bar ? null : current)), 260);
  };

  const playBar = (bar: number) => {
    playSfx(xylo(bar));
    flash(bar);
  };

  /** Plays the tune for her to copy, lighting up each bar. */
  const playTune = async (notes: number[]) => {
    const id = ++run.current;
    setListening(true);
    typed.current = [];
    setEntered([]);
    await wait(500);
    for (const bar of notes) {
      if (run.current !== id) return;
      playBar(bar);
      await wait(BEAT + 120);
    }
    if (run.current !== id) return;
    setListening(false);
    speak(say.line('yourTurn'));
  };

  const newTune = (length: number) => {
    const notes = Array.from({ length }, () => randomInt(0, 7));
    setTune(notes);
    playTune(notes);
  };

  // Copy-me progress lives in a ref too, so notes mashed faster than the screen redraws still count.
  const typed = useRef<number[]>([]);
  const busy = useRef(false);

  const tapBar = async (bar: number) => {
    playBar(bar);
    if (tab !== 'copy' || listening || busy.current || tune.length === 0) return;
    const now = [...typed.current, bar];
    if (tune[now.length - 1] !== bar) {
      busy.current = true;
      typed.current = [];
      playSfx('bloop');
      setEntered([]);
      await speak(say.line('listenAgain'));
      busy.current = false;
      playTune(tune);
      return;
    }
    typed.current = now;
    setEntered(now);
    if (now.length === tune.length) {
      busy.current = true;
      setListening(true);
      await wait(400);
      await celebrate(false);
      busy.current = false;
      newTune(Math.min(tune.length + 1, 8));
    }
  };

  /** Sings a song: each step lights a bar, plays its note and says the word. */
  const sing = async (song: 'abc' | 'count') => {
    const id = ++run.current;
    const steps =
      song === 'abc'
        ? ABC_SONG.map(([letter, bar, beats]) => ({ word: letter.toUpperCase(), line: say.letterName(LETTERS.find((l) => l.lower === letter)!), bar, beats }))
        : [0, 1, 2, 3, 4, 5, 6, 7, 6, 7].map((bar, i) => ({ word: String(i + 1), line: say.number(i + 1), bar, beats: 1.5 }));
    await speak(say.line(song === 'abc' ? 'singAbc' : 'singCount'));
    for (const step of steps) {
      if (run.current !== id) return;
      setSinging(step.word);
      playBar(step.bar);
      speak(step.line);
      await wait(BEAT * step.beats);
    }
    if (run.current !== id) return;
    setSinging(null);
    await speak(say.line(song === 'abc' ? 'abcEnd' : 'countEnd'));
    celebrate(true);
  };

  const switchTab = (next: Tab) => {
    run.current += 1;
    stopSpeaking();
    setTab(next);
    setSinging(null);
    setListening(false);
    setTune([]);
    if (next === 'play') speak(say.line('musicIntro'));
    if (next === 'band') speak(say.line('drumsIntro'));
    if (next === 'copy') {
      speak(say.line('copyIntro'));
      setTimeout(() => newTune(3), 1800);
    }
  };

  const barWidth = Math.min((width - Spacing.md * 2) / 8 - 6, 80);
  const tallest = Math.min(height * 0.42, 340);
  const xylophone = (
    <View style={styles.xylophone}>
      {XYLOPHONE.map((bar, i) => (
        <TouchPad
          key={i}
          label={`Note ${bar.note}`}
          onTouch={() => tapBar(i)}
          style={[
            styles.bar,
            { width: barWidth, height: tallest * (1 - i * 0.06), backgroundColor: bar.color },
            lit === i && styles.barLit,
          ]}>
          <View style={styles.peg} />
          <View style={styles.peg} />
        </TouchPad>
      ))}
    </View>
  );

  let body;
  if (tab === 'play') body = xylophone;
  else if (tab === 'band') {
    const pad = Math.min((width - Spacing.md * 4) / (width >= 700 ? 3 : 2), height * 0.24, 220);
    body = (
      <View style={styles.drums}>
        {BAND.map((d) => (
          <SwipePad
            key={d.sfx}
            label={`${d.label}: swipe to play`}
            every={d.every}
            onPlay={() => playSfx(d.sfx)}
            onTapOnly={() => speak(say.line('drumsIntro'))}
            style={[styles.pad, { width: pad, height: pad, backgroundColor: d.color }]}>
            <Pic name={d.picture} size={pad * 0.5} />
          </SwipePad>
        ))}
      </View>
    );
  } else if (tab === 'copy') {
    body = (
      <View style={styles.copy}>
        <View style={styles.dots}>
          {tune.map((_, i) => (
            <View key={i} style={[styles.dot, i < entered.length && styles.dotOn]} />
          ))}
        </View>
        <Txt size={20} color={Colors.textSoft}>
          {listening ? 'Listen…' : 'Your turn!'}
        </Txt>
        {xylophone}
      </View>
    );
  } else {
    body = (
      <View style={styles.copy}>
        <View style={styles.singCard}>
          {singing ? (
            <Animated.View key={singing} entering={ZoomIn.duration(200)}>
              <Txt size={96} weight="heavy" color={Colors.purpleDark}>
                {singing}
              </Txt>
            </Animated.View>
          ) : (
            <View style={styles.songs}>
              <Bouncy accessibilityLabel="Sing the alphabet song" style={[styles.song, { backgroundColor: '#FF7EB6' }]} onPress={() => sing('abc')}>
                <Txt size={32} weight="heavy" color={Colors.white}>
                  ABC
                </Txt>
              </Bouncy>
              <Bouncy accessibilityLabel="Count to ten" style={[styles.song, { backgroundColor: '#4D9DE0' }]} onPress={() => sing('count')}>
                <Txt size={32} weight="heavy" color={Colors.white}>
                  1 to 10
                </Txt>
              </Bouncy>
            </View>
          )}
        </View>
        {xylophone}
      </View>
    );
  }

  return (
    <GameScreen
      title="Music maker"
      background="#FFE6F2"
      onRepeat={() =>
        tab === 'copy' && tune.length ? playTune(tune) : speak(say.line(tab === 'band' ? 'drumsIntro' : tab === 'sing' ? 'singAbc' : 'musicIntro'))
      }>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Bouncy key={t.id} accessibilityLabel={t.label} style={[styles.tab, tab === t.id && styles.tabOn]} onPress={() => switchTab(t.id)}>
            <Pic name={t.picture} size={26} />
            <Txt size={15} color={tab === t.id ? Colors.white : Colors.text}>
              {t.label}
            </Txt>
          </Bouncy>
        ))}
      </View>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm, flexWrap: 'wrap' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.white, ...cardShadow },
  tabOn: { backgroundColor: '#E85D9C' },
  xylophone: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: Spacing.md },
  bar: { borderRadius: 14, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, ...cardShadow },
  barLit: { transform: [{ scale: 1.08 }], borderWidth: 4, borderColor: Colors.white },
  peg: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)' },
  drums: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  pad: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: 'rgba(255,255,255,0.6)', ...cardShadow },
  copy: { flex: 1, alignItems: 'center', paddingTop: Spacing.md },
  dots: { flexDirection: 'row', gap: 10, minHeight: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(232,93,156,0.25)' },
  dotOn: { backgroundColor: '#E85D9C' },
  singCard: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  songs: { flexDirection: 'row', gap: Spacing.md },
  song: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: 24, ...cardShadow },
});
