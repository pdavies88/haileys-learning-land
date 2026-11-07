/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. Guitar opts out of React Compiler with 'use no memo'. */
import { Canvas, Circle, Group, Line, Oval, Rect, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { TouchPad } from '@/components/touch-pad';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import type { SfxName } from '@/content/audio-files';
import { SONGS, XYLOPHONE, say, type Song } from '@/content/learning';
import { pause, playSfx, prepare, prepareSfx, speak, stopSpeaking } from '@/lib/audio';

type Tab = 'xylophone' | 'drums' | 'piano' | 'guitar' | 'songs';
const TABS: { id: Tab; label: string; picture: string; intro: Parameters<typeof say.line>[0] }[] = [
  { id: 'xylophone', label: 'Xylophone', picture: 'rainbow', intro: 'musicIntro' },
  { id: 'drums', label: 'Drums', picture: 'drum', intro: 'drumsIntro' },
  { id: 'piano', label: 'Piano', picture: 'piano', intro: 'pianoIntro' },
  { id: 'guitar', label: 'Guitar', picture: 'guitar', intro: 'guitarIntro' },
  { id: 'songs', label: 'Songs', picture: 'music', intro: 'songsIntro' },
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

// ---------------------------------------------------------------------------
// Drums: a drum kit seen from the front, drawn in a 100 x 64 box and scaled to fit. Each piece has
// a spot to touch, a little bigger than it looks so small fingers don't miss.
// ---------------------------------------------------------------------------

const KIT_W = 100;
const KIT_H = 64;
const FLOOR = 62;
type KitPiece = { sfx: SfxName; label: string; hit: { x: number; y: number; w: number; h: number } };
// Later pieces sit on top of earlier ones where their spots overlap (the toms over the bass drum).
const KIT: KitPiece[] = [
  { sfx: 'kick', label: 'Bass drum', hit: { x: 36, y: 36, w: 28, h: 26 } },
  { sfx: 'crash', label: 'Crash cymbal', hit: { x: 70, y: 4, w: 30, h: 22 } },
  { sfx: 'hihat', label: 'Hi-hat', hit: { x: 0, y: 14, w: 28, h: 22 } },
  { sfx: 'snare', label: 'Snare drum', hit: { x: 15, y: 38, w: 22, h: 18 } },
  { sfx: 'tomlo', label: 'Floor tom', hit: { x: 63, y: 36, w: 24, h: 24 } },
  { sfx: 'tomhi', label: 'High tom', hit: { x: 31, y: 18, w: 18, h: 20 } },
  { sfx: 'tomhi', label: 'Middle tom', hit: { x: 51, y: 18, w: 18, h: 20 } },
];

/** A drum seen from the front: its shell with the head on top, tilted toward you. */
function Drum({ cx, top, bottom, rx, ry, shell, rim, lit }: { cx: number; top: number; bottom: number; rx: number; ry: number; shell: string; rim: string; lit: boolean }) {
  return (
    <Group>
      <Oval x={cx - rx} y={bottom - ry} width={rx * 2} height={ry * 2} color={rim} />
      <Rect x={cx - rx} y={top} width={rx * 2} height={bottom - top} color={shell} />
      <Rect x={cx - rx} y={top + (bottom - top) * 0.15} width={rx * 2} height={0.8} color="rgba(255,255,255,0.35)" />
      <Oval x={cx - rx} y={top - ry} width={rx * 2} height={ry * 2} color={lit ? '#FFF6C2' : '#F4F1EA'} />
      <Oval x={cx - rx} y={top - ry} width={rx * 2} height={ry * 2} color={rim} style="stroke" strokeWidth={0.9} />
    </Group>
  );
}

/** A cymbal on its stand, seen nearly edge-on. */
function Cymbal({ cx, y, rx, lit, double }: { cx: number; y: number; rx: number; lit: boolean; double?: boolean }) {
  const color = lit ? '#FFF1A6' : '#F2C84B';
  return (
    <Group>
      <Line p1={vec(cx, y)} p2={vec(cx, FLOOR)} color="#8E8AA0" strokeWidth={0.9} />
      <Line p1={vec(cx, FLOOR)} p2={vec(cx - 5, FLOOR + 1.5)} color="#8E8AA0" strokeWidth={0.9} />
      <Line p1={vec(cx, FLOOR)} p2={vec(cx + 5, FLOOR + 1.5)} color="#8E8AA0" strokeWidth={0.9} />
      {double && <Oval x={cx - rx} y={y + 1.6} width={rx * 2} height={3.2} color="#D9A82A" />}
      <Oval x={cx - rx} y={y - 1.6} width={rx * 2} height={3.2} color={color} />
      <Oval x={cx - rx * 0.22} y={y - 2.2} width={rx * 0.44} height={2.2} color="#C8961E" />
    </Group>
  );
}

function Drums({ width, height }: { width: number; height: number }) {
  const { isLit, flash } = useFlash();
  const scale = Math.min((width - Spacing.md * 2) / KIT_W, (height * 0.95) / KIT_H);
  const kitWidth = KIT_W * scale;
  const kitHeight = KIT_H * scale;
  const hit = (sfx: SfxName, key: string) => {
    playSfx(sfx);
    flash(key);
  };
  return (
    <View style={styles.kitWrap}>
      <View style={{ width: kitWidth, height: kitHeight }}>
        <Canvas style={{ width: kitWidth, height: kitHeight }}>
          <Group transform={[{ scale }]}>
            <Oval x={6} y={FLOOR - 1} width={88} height={5} color="rgba(59,42,92,0.10)" />
            <Cymbal cx={86} y={14} rx={14} lit={isLit('crash')} />
            <Cymbal cx={13} y={24} rx={11} lit={isLit('hihat')} double />
            {/* Toms mounted on the bass drum. */}
            <Line p1={vec(40, 36)} p2={vec(46, 42)} color="#8E8AA0" strokeWidth={1.2} />
            <Line p1={vec(60, 36)} p2={vec(54, 42)} color="#8E8AA0" strokeWidth={1.2} />
            <Drum cx={40} top={26} bottom={36} rx={8} ry={2.8} shell="#4D9DE0" rim="#2A6DB0" lit={isLit('High tom')} />
            <Drum cx={60} top={26} bottom={36} rx={8} ry={2.8} shell="#4D9DE0" rim="#2A6DB0" lit={isLit('Middle tom')} />
            {/* Bass drum, facing out, with a big star on its front. */}
            <Line p1={vec(40, 60)} p2={vec(37, FLOOR + 1)} color="#8E8AA0" strokeWidth={1.2} />
            <Line p1={vec(60, 60)} p2={vec(63, FLOOR + 1)} color="#8E8AA0" strokeWidth={1.2} />
            <Circle cx={50} cy={49} r={13.5} color="#F2545B" />
            <Circle cx={50} cy={49} r={11} color={isLit('kick') ? '#FFF6C2' : '#FBEFEF'} />
            <Circle cx={50} cy={49} r={11} color="#B8323A" style="stroke" strokeWidth={0.8} />
            {/* Snare on its stand, front left. */}
            <Line p1={vec(26, 50)} p2={vec(21, FLOOR + 1)} color="#8E8AA0" strokeWidth={0.9} />
            <Line p1={vec(26, 50)} p2={vec(31, FLOOR + 1)} color="#8E8AA0" strokeWidth={0.9} />
            <Drum cx={26} top={44} bottom={50} rx={9} ry={3} shell="#D8DCE8" rim="#9EA4B8" lit={isLit('Snare drum')} />
            {/* Floor tom on its legs, front right. */}
            <Line p1={vec(67, 56)} p2={vec(66, FLOOR + 1)} color="#8E8AA0" strokeWidth={0.9} />
            <Line p1={vec(81, 56)} p2={vec(82, FLOOR + 1)} color="#8E8AA0" strokeWidth={0.9} />
            <Drum cx={74} top={43} bottom={57} rx={9.5} ry={3.2} shell="#9B6DE3" rim="#6A43B0" lit={isLit('Floor tom')} />
          </Group>
        </Canvas>
        <Pic name="star" size={scale * 11} style={{ position: 'absolute', left: (50 - 5.5) * scale, top: (49 - 5.5) * scale }} />
        {KIT.map((piece) => (
          <TouchPad
            key={piece.label}
            label={piece.label}
            onTouch={() => hit(piece.sfx, piece.sfx === 'tomhi' || piece.sfx === 'tomlo' || piece.sfx === 'snare' ? piece.label : piece.sfx)}
            style={{ position: 'absolute', left: piece.hit.x * scale, top: piece.hit.y * scale, width: piece.hit.w * scale, height: piece.hit.h * scale }}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Piano and guitar
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// The xylophone, and songs played on it
// ---------------------------------------------------------------------------

const xylo = (bar: number) => `xylo${bar}` as SfxName;
const notes = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i}` as SfxName);
// The sounds each tab plays. They load when the tab opens, so the first touch already sounds.
const TAB_SOUNDS: Record<Tab, SfxName[]> = {
  xylophone: notes('xylo', 8),
  drums: [...new Set(KIT.map((d) => d.sfx))],
  piano: notes('piano', 13),
  guitar: notes('string', 6),
  songs: notes('xylo', 8),
};
const SONG_BEAT = 480; // ms per note when the song plays itself

/** A soft ring that pulses around the bar to tap next. */
function Glow() {
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.4, { duration: 450 })), -1);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View pointerEvents="none" style={[styles.glow, style]} />;
}

function Xylophone({ width, height, lit, glow, onTap }: { width: number; height: number; lit: number | null; glow?: number | null; onTap: (bar: number) => void }) {
  const barWidth = Math.min((width - Spacing.md * 2) / 8 - 6, 80);
  const tallest = Math.min(height * 0.62, 340);
  return (
    <View style={styles.xylophone}>
      {XYLOPHONE.map((bar, i) => (
        <View key={i} style={{ alignItems: 'center', gap: 6 }}>
          {glow === i ? <Pic name="star" size={Math.min(barWidth * 0.6, 40)} /> : <View style={{ height: Math.min(barWidth * 0.6, 40) }} />}
          <TouchPad
            label={`Note ${bar.note}`}
            onTouch={() => onTap(i)}
            style={[styles.bar, { width: barWidth, height: tallest * (1 - i * 0.06), backgroundColor: bar.color }, lit === i && styles.barLit]}>
            {glow === i && <Glow />}
            <View style={styles.peg} />
            <View style={styles.peg} />
          </TouchPad>
        </View>
      ))}
    </View>
  );
}

/**
 * Songs: pick one, then play it a note at a time. The next bar glows with a star above it and the
 * words light up as she goes, so she plays at her own pace. "Hear it" plays the song first.
 */
function Songs({ width, height }: { width: number; height: number }) {
  const [song, setSong] = useState<Song | null>(null);
  const [at, setAt] = useState({ line: 0, note: 0 });
  const [lit, setLit] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [finished, setFinished] = useState(false);
  const run = useRef(0);
  const { celebrate, overlay } = useCelebration();

  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  const flash = (bar: number) => {
    setLit(bar);
    setTimeout(() => setLit((current) => (current === bar ? null : current)), 260);
  };

  const choose = (next: Song) => {
    run.current += 1;
    setSong(next);
    setAt({ line: 0, note: 0 });
    setFinished(false);
    setListening(false);
    speak(say.song(next.id), say.line('songGlow'));
  };

  const back = () => {
    run.current += 1;
    stopSpeaking();
    setSong(null);
    speak(say.line('songsIntro'));
  };

  /** Plays the whole song by itself, lighting each bar and word, then starts her from the top. */
  const hear = async () => {
    if (!song) return;
    const id = ++run.current;
    setListening(true);
    setFinished(false);
    stopSpeaking();
    for (let line = 0; line < song.lines.length; line++) {
      for (let note = 0; note < song.lines[line].length; note++) {
        if (run.current !== id) return;
        setAt({ line, note });
        playSfx(xylo(song.lines[line][note][0]));
        flash(song.lines[line][note][0]);
        await pause(SONG_BEAT);
      }
      await pause(SONG_BEAT / 2);
    }
    if (run.current !== id) return;
    setListening(false);
    setAt({ line: 0, note: 0 });
  };

  const tap = async (bar: number) => {
    playSfx(xylo(bar));
    flash(bar);
    if (!song || listening || finished) return;
    const [want] = song.lines[at.line][at.note];
    // Only the glowing bar moves the song on; any other bar just plays its note.
    if (bar !== want) return;
    const lastNote = at.note + 1 >= song.lines[at.line].length;
    if (!lastNote) {
      setAt({ line: at.line, note: at.note + 1 });
    } else if (at.line + 1 < song.lines.length) {
      setAt({ line: at.line + 1, note: 0 });
    } else {
      setFinished(true);
      const id = run.current;
      await pause(400);
      if (run.current !== id) return;
      celebrate(true);
      speak(say.line('songEnd'));
    }
  };

  if (!song) {
    return (
      <ScrollView contentContainerStyle={styles.songList}>
        {SONGS.map((s) => (
          <Bouncy key={s.id} accessibilityLabel={s.title} style={styles.songCard} onPress={() => choose(s)}>
            <Pic name={s.picture} size={72} />
            <Txt size={20} weight="heavy" style={styles.center}>
              {s.title}
            </Txt>
          </Bouncy>
        ))}
      </ScrollView>
    );
  }

  const words = song.lines[at.line];
  return (
    <View style={styles.playing}>
      <View style={styles.songBar}>
        <Bouncy accessibilityLabel="Pick another song" style={styles.songButton} onPress={back}>
          <Pic name={song.picture} size={30} />
          <Txt size={17}>Songs</Txt>
        </Bouncy>
        <Bouncy accessibilityLabel="Hear the song" style={styles.songButton} onPress={hear} sound={false}>
          <Pic name="speaker" size={30} />
          <Txt size={17}>Hear it</Txt>
        </Bouncy>
        {finished && (
          <Bouncy accessibilityLabel="Play it again" style={styles.songButton} onPress={() => choose(song)}>
            <Pic name="star" size={30} />
            <Txt size={17}>Again</Txt>
          </Bouncy>
        )}
      </View>
      <View style={styles.words}>
        {words.map(([, syllable], i) => {
          const done = finished || i < at.note;
          const now = !finished && i === at.note;
          return (
            <Animated.View key={`${at.line}-${i}`} entering={ZoomIn.duration(150)} style={[styles.word, done && styles.wordDone, now && styles.wordNow]}>
              <Txt size={now ? 30 : 24} weight="heavy" color={now ? Colors.white : done ? '#E85D9C' : Colors.textSoft}>
                {syllable}
              </Txt>
            </Animated.View>
          );
        })}
      </View>
      <Xylophone width={width} height={height} lit={lit} glow={finished ? null : words[at.note]?.[0]} onTap={tap} />
      {overlay}
    </View>
  );
}

export default function Music() {
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('xylophone');
  const { isLit, flash } = useFlash();

  useEffect(() => {
    speak(say.line('musicIntro'));
    prepare(...TABS.map((t) => say.line(t.intro)));
  }, []);

  useEffect(() => prepareSfx(...TAB_SOUNDS[tab]), [tab]);

  const switchTab = (next: Tab) => {
    stopSpeaking();
    setTab(next);
    speak(say.line(TABS.find((t) => t.id === next)!.intro));
  };

  const playBar = (bar: number) => {
    playSfx(xylo(bar));
    flash(String(bar));
  };
  const lit = XYLOPHONE.findIndex((_, i) => isLit(String(i)));

  const area = { width, height: height * 0.62 };
  let body;
  if (tab === 'xylophone') body = <Xylophone {...area} lit={lit < 0 ? null : lit} onTap={playBar} />;
  else if (tab === 'drums') body = <Drums {...area} />;
  else if (tab === 'piano') body = <Piano {...area} />;
  else if (tab === 'guitar') body = <Guitar {...area} />;
  else body = <Songs {...area} />;

  return (
    <GameScreen title="Music maker" background="#FFE6F2" calm={false} onRepeat={() => speak(say.line(TABS.find((t) => t.id === tab)!.intro))}>
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
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm, flexWrap: 'wrap' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.white, ...cardShadow },
  tabOn: { backgroundColor: '#E85D9C' },
  xylophone: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: Spacing.md },
  bar: { borderRadius: 14, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, ...cardShadow },
  barLit: { borderWidth: 4, borderColor: Colors.white },
  glow: { ...StyleSheet.absoluteFill, borderRadius: 14, borderWidth: 6, borderColor: Colors.white, backgroundColor: 'rgba(255,255,255,0.35)' },
  peg: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)' },
  kitWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  songList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  songCard: { width: 200, minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: 28, backgroundColor: Colors.white, ...cardShadow },
  center: { textAlign: 'center' },
  playing: { flex: 1, alignItems: 'center', paddingTop: Spacing.sm, gap: Spacing.sm },
  songBar: { flexDirection: 'row', gap: Spacing.sm },
  songButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, height: 50, borderRadius: 25, backgroundColor: Colors.white, ...cardShadow },
  words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: Spacing.md, minHeight: 56 },
  word: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  wordDone: { backgroundColor: 'rgba(232,93,156,0.12)' },
  wordNow: { backgroundColor: '#E85D9C' },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
