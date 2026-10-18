import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

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

type Tab = 'play' | 'drums' | 'copy' | 'sing';
const TABS: { id: Tab; label: string; picture: string }[] = [
  { id: 'play', label: 'Play', picture: 'piano' },
  { id: 'drums', label: 'Drums', picture: 'drum' },
  { id: 'copy', label: 'Copy me', picture: 'music' },
  { id: 'sing', label: 'Sing', picture: 'bell' },
];
const DRUMS: { sfx: SfxName; picture: string; color: string }[] = [
  { sfx: 'drum', picture: 'drum', color: '#F2545B' },
  { sfx: 'clap', picture: 'clap', color: '#FFD23F' },
  { sfx: 'shaker', picture: 'maracas', color: '#3CC47C' },
  { sfx: 'bell', picture: 'bell', color: '#4D9DE0' },
];
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

  const tapBar = async (bar: number) => {
    playBar(bar);
    if (tab !== 'copy' || listening || tune.length === 0) return;
    const now = [...entered, bar];
    if (tune[now.length - 1] !== bar) {
      playSfx('bloop');
      setEntered([]);
      await speak(say.line('listenAgain'));
      playTune(tune);
      return;
    }
    setEntered(now);
    if (now.length === tune.length) {
      setListening(true);
      await wait(400);
      await celebrate(false);
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
    if (next === 'drums') speak(say.line('drumsIntro'));
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
        <Bouncy
          key={i}
          accessibilityLabel={`Note ${bar.note}`}
          sound={false}
          onPress={() => tapBar(i)}
          style={[
            styles.bar,
            { width: barWidth, height: tallest * (1 - i * 0.06), backgroundColor: bar.color },
            lit === i && styles.barLit,
          ]}>
          <View style={styles.peg} />
          <View style={styles.peg} />
        </Bouncy>
      ))}
    </View>
  );

  let body;
  if (tab === 'play') body = xylophone;
  else if (tab === 'drums') {
    const pad = Math.min((width - Spacing.md * 4) / 2, height * 0.26, 220);
    body = (
      <View style={styles.drums}>
        {DRUMS.map((d) => (
          <Bouncy key={d.sfx} accessibilityLabel={d.sfx} sound={false} onPress={() => playSfx(d.sfx)} style={[styles.pad, { width: pad, height: pad, backgroundColor: d.color }]}>
            <Pic name={d.picture} size={pad * 0.5} />
          </Bouncy>
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
      title="Music Maker"
      background="#FFE6F2"
      onRepeat={() =>
        tab === 'copy' && tune.length ? playTune(tune) : speak(say.line(tab === 'drums' ? 'drumsIntro' : tab === 'sing' ? 'singAbc' : 'musicIntro'))
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
