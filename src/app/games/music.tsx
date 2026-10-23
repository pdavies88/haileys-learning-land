/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. Guitar opts out of React Compiler with 'use no memo'. */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { TouchPad } from '@/components/touch-pad';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import type { SfxName } from '@/content/audio-files';
import { ABC_SONG, LETTERS, XYLOPHONE, say } from '@/content/learning';
import { pause, playSfx, prepare, speak, stopSpeaking } from '@/lib/audio';
import { randomInt } from '@/lib/random';

type Tab = 'xylophone' | 'drums' | 'piano' | 'guitar' | 'copy' | 'sing';
const TABS: { id: Tab; label: string; picture: string; intro: Parameters<typeof say.line>[0] }[] = [
  { id: 'xylophone', label: 'Xylophone', picture: 'rainbow', intro: 'musicIntro' },
  { id: 'drums', label: 'Drums', picture: 'drum', intro: 'drumsIntro' },
  { id: 'piano', label: 'Piano', picture: 'piano', intro: 'pianoIntro' },
  { id: 'guitar', label: 'Guitar', picture: 'guitar', intro: 'guitarIntro' },
  { id: 'copy', label: 'Copy me', picture: 'music', intro: 'copyIntro' },
  { id: 'sing', label: 'Sing', picture: 'bell', intro: 'singAbc' },
];

/** Lights something up for a moment each time it's played. */
function useFlash() {
  const [lit, setLit] = useState<Record<string, number>>({});
  const flash = (key: string) => {
    const at = Math.random();
    setLit((l) => ({ ...l, [key]: at }));
    setTimeout(() => setLit((l) => (l[key] === at ? { ...l, [key]: 0 } : l)), 220);
  };
  return { isLit: (key: string) => Boolean(lit[key]), flash };
}

// A drum kit, laid out like a real one: cymbals at the top, toms in the middle, snare and kick below.
const KIT: { sfx: SfxName; label: string; color: string; rim: string; size: number; cymbal?: boolean }[] = [
  { sfx: 'crash', label: 'Crash cymbal', color: '#FFD35C', rim: '#E0A800', size: 0.3, cymbal: true },
  { sfx: 'hihat', label: 'Hi-hat', color: '#FFE08A', rim: '#D9A520', size: 0.24, cymbal: true },
  { sfx: 'tomhi', label: 'High tom', color: '#4D9DE0', rim: '#2A6DB0', size: 0.24 },
  { sfx: 'tomlo', label: 'Low tom', color: '#9B6DE3', rim: '#6A43B0', size: 0.28 },
  { sfx: 'snare', label: 'Snare drum', color: '#F7F7FB', rim: '#B8BCCB', size: 0.26 },
  { sfx: 'kick', label: 'Bass drum', color: '#F2545B', rim: '#B8323A', size: 0.38 },
];

function Drums({ width, height }: { width: number; height: number }) {
  const { isLit, flash } = useFlash();
  const unit = Math.min(width, height * 0.95);
  const hit = (sfx: SfxName) => {
    playSfx(sfx);
    flash(sfx);
  };
  const drum = (d: (typeof KIT)[number]) => (
    <TouchPad
      key={d.sfx}
      label={d.label}
      onTouch={() => hit(d.sfx)}
      style={[
        styles.drum,
        {
          width: unit * d.size,
          height: unit * d.size * (d.cymbal ? 0.62 : 1),
          backgroundColor: d.color,
          borderColor: d.rim,
          borderWidth: d.cymbal ? 3 : Math.max(6, unit * 0.02),
        },
        isLit(d.sfx) && styles.drumLit,
      ]}>
      {d.cymbal ? <View style={[styles.cymbalBell, { backgroundColor: d.rim }]} /> : null}
      {d.sfx === 'kick' ? <Pic name="star" size={unit * 0.1} /> : null}
    </TouchPad>
  );
  return (
    <View style={styles.kit}>
      <View style={styles.kitRow}>{KIT.slice(0, 2).map(drum)}</View>
      <View style={styles.kitRow}>{KIT.slice(2, 4).map(drum)}</View>
      <View style={[styles.kitRow, { alignItems: 'flex-end' }]}>{KIT.slice(4).map(drum)}</View>
    </View>
  );
}

// Piano keys from C to the next C. Black keys sit between the white keys they're named after.
const WHITE = [0, 2, 4, 5, 7, 9, 11, 12];
const BLACK = [
  { note: 1, after: 0 },
  { note: 3, after: 1 },
  { note: 6, after: 3 },
  { note: 8, after: 4 },
  { note: 10, after: 5 },
];
const KEY_DOTS = ['#F2545B', '#FF9F43', '#FFD23F', '#3CC47C', '#2EC4B6', '#4D9DE0', '#9B6DE3', '#F2545B'];

function Piano({ width, height }: { width: number; height: number }) {
  const { isLit, flash } = useFlash();
  const keyWidth = Math.min((width - Spacing.md * 2) / WHITE.length, 96);
  const keyHeight = Math.min(height * 0.7, keyWidth * 4.2);
  const play = (note: number) => {
    playSfx(`piano${note}` as SfxName);
    flash(String(note));
  };
  return (
    <View style={styles.pianoWrap}>
      <View style={[styles.piano, { width: keyWidth * WHITE.length, height: keyHeight }]}>
        {WHITE.map((note, i) => (
          <TouchPad
            key={note}
            label={`Piano key ${i + 1}`}
            onTouch={() => play(note)}
            style={[styles.whiteKey, { width: keyWidth, height: keyHeight }, isLit(String(note)) && styles.whiteKeyLit]}>
            <View style={[styles.keyDot, { backgroundColor: KEY_DOTS[i] }]} />
          </TouchPad>
        ))}
        {BLACK.map(({ note, after }) => (
          <TouchPad
            key={note}
            label={`Black piano key ${after + 1}`}
            onTouch={() => play(note)}
            style={[
              styles.blackKey,
              { left: keyWidth * (after + 1) - keyWidth * 0.3, width: keyWidth * 0.6, height: keyHeight * 0.6 },
              isLit(String(note)) && styles.blackKeyLit,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const STRING_COLORS = ['#C8A26B', '#C8A26B', '#C8A26B', '#E6E6EE', '#E6E6EE', '#E6E6EE'];

/**
 * A guitar: swipe up or down across the strings to strum, or touch one string to pluck it. Every
 * string the finger crosses plays, so a slow swipe sounds like a slow strum.
 */
function Guitar({ width, height }: { width: number; height: number }) {
  'use no memo';
  const { isLit, flash } = useFlash();
  const boxWidth = Math.min(width - Spacing.md * 2, 640);
  const boxHeight = Math.min(height * 0.72, 420);
  // Strings run across the guitar's neck, low E at the top.
  const top = boxHeight * 0.18;
  const gap = (boxHeight * 0.64) / 5;
  const ys = [0, 1, 2, 3, 4, 5].map((i) => top + i * gap);
  const last = useRef<number | null>(null);
  const pluck = (i: number) => {
    playSfx(`string${i}` as SfxName);
    flash(String(i));
  };
  const strings = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      last.current = e.y;
      const nearest = ys.reduce((best, y, i) => (Math.abs(y - e.y) < Math.abs(ys[best] - e.y) ? i : best), 0);
      if (Math.abs(ys[nearest] - e.y) < gap * 0.45) pluck(nearest);
    })
    .onUpdate((e) => {
      const from = last.current ?? e.y;
      const crossed = ys.map((y, i) => ({ y, i })).filter(({ y }) => (from < y && e.y >= y) || (from > y && e.y <= y));
      // Play them in the order the finger reaches them.
      if (e.y < from) crossed.reverse();
      crossed.forEach(({ i }) => pluck(i));
      last.current = e.y;
    })
    .onFinalize(() => {
      last.current = null;
    });
  return (
    <View style={styles.guitarWrap}>
      <GestureDetector gesture={strings}>
        <View accessible accessibilityRole="button" accessibilityLabel="Guitar strings: swipe to strum" style={[styles.guitar, { width: boxWidth, height: boxHeight }]}>
          <View style={[styles.soundHole, { width: boxHeight * 0.5, height: boxHeight * 0.5, borderRadius: boxHeight * 0.25, left: boxWidth * 0.32, top: boxHeight * 0.25 }]} />
          {ys.map((y, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.string,
                { top: y - (5 - i * 0.6) / 2, height: 5 - i * 0.6, backgroundColor: STRING_COLORS[i] },
                isLit(String(i)) && styles.stringLit,
              ]}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

const BEAT = 520; // ms
// Songs go slower than copy-me tunes, so every word is said in full before the next note.
const SING_BEAT = 700;

const xylo = (bar: number) => `xylo${bar}` as SfxName;

export default function Music() {
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('xylophone');
  const [lit, setLit] = useState<number | null>(null);
  const [tune, setTune] = useState<number[]>([]);
  const [entered, setEntered] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const [singing, setSinging] = useState<string | null>(null);
  const run = useRef(0);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('musicIntro'));
    prepare(...TABS.map((t) => say.line(t.intro)));
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
    await pause(500);
    for (const bar of notes) {
      if (run.current !== id) return;
      playBar(bar);
      await pause(BEAT + 120);
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
      await pause(400);
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
    // Load every word first, so none of them starts late.
    prepare(...steps.map((step) => step.line));
    await speak(say.line(song === 'abc' ? 'singAbc' : 'singCount'));
    for (const step of steps) {
      if (run.current !== id) return;
      setSinging(step.word);
      playBar(step.bar);
      // Wait for the beat and for the word to finish, whichever is longer, so no word is cut off.
      const [said] = await Promise.all([speak(step.line), pause(SING_BEAT * step.beats)]);
      if (!said) return;
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
    speak(say.line(TABS.find((t) => t.id === next)!.intro));
    if (next === 'copy') {
      const id = run.current;
      pause(1800).then(() => {
        if (run.current === id) newTune(3);
      });
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

  const area = { width, height: height * 0.62 };
  let body;
  if (tab === 'xylophone') body = xylophone;
  else if (tab === 'drums') body = <Drums {...area} />;
  else if (tab === 'piano') body = <Piano {...area} />;
  else if (tab === 'guitar') body = <Guitar {...area} />;
  else if (tab === 'copy') {
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
        tab === 'copy' && tune.length ? playTune(tune) : speak(say.line(TABS.find((t) => t.id === tab)!.intro))
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
  kit: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  kitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  drum: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  drumLit: { transform: [{ scale: 0.92 }], opacity: 0.85 },
  cymbalBell: { width: '22%', height: '30%', borderRadius: 999 },
  pianoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  piano: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', backgroundColor: '#3B2A5C', padding: 0, ...cardShadow },
  whiteKey: { backgroundColor: Colors.white, borderRightWidth: 2, borderColor: '#D9D4E8', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14 },
  whiteKeyLit: { backgroundColor: '#FFF3B0' },
  keyDot: { width: 18, height: 18, borderRadius: 9 },
  blackKey: { position: 'absolute', top: 0, backgroundColor: '#2B2140', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  blackKeyLit: { backgroundColor: '#7A5BC0' },
  guitarWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guitar: { backgroundColor: '#E2A25C', borderRadius: 40, borderWidth: 8, borderColor: '#A8632A', overflow: 'hidden', ...cardShadow },
  soundHole: { position: 'absolute', backgroundColor: '#4A2C14', borderWidth: 8, borderColor: '#C98340' },
  string: { position: 'absolute', left: 0, right: 0, borderRadius: 3 },
  stringLit: { backgroundColor: '#FFF3B0', transform: [{ scaleY: 1.8 }] },
  copy: { flex: 1, alignItems: 'center', paddingTop: Spacing.md },
  dots: { flexDirection: 'row', gap: 10, minHeight: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(232,93,156,0.25)' },
  dotOn: { backgroundColor: '#E85D9C' },
  singCard: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  songs: { flexDirection: 'row', gap: Spacing.md },
  song: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: 24, ...cardShadow },
});
