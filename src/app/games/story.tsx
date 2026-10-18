import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { DrawPad, Drawing, type Stroke } from '@/components/draw-pad';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { PLACES, STORY_HEROES, STORY_OBJECTS, say, spokenLines } from '@/content/learning';
import { playSfx, speak, stopSpeaking } from '@/lib/audio';

const TEXT = spokenLines();
type Step = 'hero' | 'place' | 'object' | 'draw' | 'story';

export default function Story() {
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState<Step>('hero');
  const [hero, setHero] = useState(STORY_HEROES[0]);
  const [place, setPlace] = useState(PLACES[0]);
  const [object, setObject] = useState(STORY_OBJECTS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState('#9B6DE3');
  const [sentence, setSentence] = useState(-1);
  const reading = useRef(0);
  const { celebrate, overlay } = useCelebration();

  const prompts: Record<Step, string> = {
    hero: say.line('storyPickHero'),
    place: say.line('storyPickPlace'),
    object: say.line('storyPickObject'),
    draw: say.line('storyDraw'),
    story: say.line('storyReady'),
  };

  useEffect(() => {
    speak(prompts.hero);
    return () => {
      reading.current += 1;
    };
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = [
    say.storyIntro(hero.id),
    say.storyHome(hero.id, place.id),
    say.storyFind(hero.id, object.id),
    say.storyEvent(object.id, place.id),
    ...(strokes.length ? [say.storyDrawing(hero.id)] : []),
    say.storyEnd(hero.id),
  ];

  /** Reads the story one sentence at a time, showing each sentence as it's read. */
  const read = async () => {
    const run = ++reading.current;
    await speak(say.line('storyReady'));
    for (let i = 0; i < lines.length; i++) {
      if (reading.current !== run) return;
      setSentence(i);
      await speak(lines[i]);
    }
    if (reading.current === run) {
      setSentence(lines.length);
      await celebrate(true);
    }
  };

  const go = (next: Step) => {
    setStep(next);
    speak(prompts[next]);
  };

  const startOver = () => {
    reading.current += 1;
    stopSpeaking();
    setStrokes([]);
    setSentence(-1);
    go('hero');
  };

  const columns = width >= 700 ? 5 : 2;
  const tile = Math.min((width - Spacing.md * (columns + 2)) / columns, 170);
  const choices =
    step === 'hero'
      ? STORY_HEROES.map((h) => ({ id: h.id, picture: h.id, label: h.name, bg: Colors.white, pick: () => { setHero(h); speak(say.picture(h.id)); go('place'); } }))
      : step === 'place'
        ? PLACES.map((p) => ({ id: p.id, picture: p.decor[0], label: p.name, bg: p.colors[0], pick: () => { setPlace(p); speak(say.place(p.id)); go('object'); } }))
        : STORY_OBJECTS.map((o) => ({ id: o.id, picture: o.id, label: o.name, bg: Colors.white, pick: () => { setObject(o); go('draw'); } }));

  let body;
  if (step === 'hero' || step === 'place' || step === 'object') {
    body = (
      <ScrollView contentContainerStyle={styles.options}>
        {choices.map((c, i) => (
          <Animated.View key={`${step}-${c.id}`} entering={ZoomIn.delay(i * 50).springify()}>
            <Bouncy
              accessibilityLabel={c.label}
              style={[styles.option, { width: tile, height: tile, backgroundColor: c.bg }]}
              onPress={() => {
                playSfx('sparkle');
                c.pick();
              }}>
              <Pic name={c.picture} size={tile * 0.55} />
              <Txt size={16} color={c.id === 'night' ? Colors.white : Colors.text} numberOfLines={1} adjustsFontSizeToFit>
                {c.label}
              </Txt>
            </Bouncy>
          </Animated.View>
        ))}
      </ScrollView>
    );
  } else if (step === 'draw') {
    const padSize = Math.min(width - Spacing.lg * 2, height * 0.5);
    body = (
      <View style={styles.drawStep}>
        <DrawPad size={padSize} strokes={strokes} onChange={setStrokes} color={color} onColor={setColor} />
        <Bouncy
          accessibilityLabel="Read my story"
          style={styles.readButton}
          onPress={() => {
            setStep('story');
            read();
          }}>
          <Pic name="book" size={40} />
          <Txt size={22} color={Colors.white}>
            Read my story
          </Txt>
        </Bouncy>
      </View>
    );
  } else {
    const sceneSize = Math.min(width - Spacing.lg * 2, height * 0.42);
    const frame = sceneSize * 0.3;
    body = (
      <ScrollView contentContainerStyle={styles.storyPage}>
        <View style={[styles.scene, { width: sceneSize, height: sceneSize }]}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={sceneSize} height={sceneSize}>
              <LinearGradient start={vec(0, 0)} end={vec(0, sceneSize)} colors={place.colors} />
            </Rect>
          </Canvas>
          <View style={[styles.corner, { left: 8, top: 8 }]}>
            <Pic name={place.decor[0]} size={sceneSize * 0.22} />
          </View>
          <View style={[styles.corner, { right: 8, top: 8 }]}>
            <Pic name={place.decor[1]} size={sceneSize * 0.16} />
          </View>
          <Animated.View entering={ZoomIn.springify()} style={[styles.corner, { left: sceneSize * 0.18, bottom: sceneSize * 0.08 }]}>
            <Pic name={hero.id} size={sceneSize * 0.4} />
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(300).springify()} style={[styles.corner, { left: sceneSize * 0.56, bottom: sceneSize * 0.12 }]}>
            <Pic name={object.id} size={sceneSize * 0.2} />
          </Animated.View>
          {strokes.length > 0 && (
            <View style={[styles.frame, { right: 8, bottom: 8, width: frame, height: frame }]}>
              <Drawing strokes={strokes} size={frame - 8} drawnAt={Math.min(width - Spacing.lg * 2, height * 0.5)} />
            </View>
          )}
        </View>
        <View style={styles.text}>
          {lines.map((id, i) =>
            i <= sentence ? (
              <Animated.View key={id} entering={FadeIn}>
                <Txt size={20} weight={i === sentence ? 'bold' : 'regular'} color={i === sentence ? Colors.purpleDark : Colors.textSoft}>
                  {TEXT[id]}
                </Txt>
              </Animated.View>
            ) : null,
          )}
        </View>
        <View style={styles.actions}>
          <Bouncy accessibilityLabel="Read it again" style={styles.action} onPress={read}>
            <Pic name="book" size={30} />
          </Bouncy>
          <Bouncy accessibilityLabel="New story" style={[styles.action, styles.newStory]} onPress={startOver}>
            <Txt size={20} color={Colors.white}>
              New story
            </Txt>
          </Bouncy>
        </View>
      </ScrollView>
    );
  }

  return (
    <GameScreen title="Build a Story" background="#EDEBFF" onRepeat={() => (step === 'story' ? read() : speak(prompts[step]))}>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  option: { borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 4, padding: Spacing.sm, ...cardShadow },
  drawStep: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.md },
  readButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.purple, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, ...cardShadow },
  storyPage: { alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  scene: { borderRadius: 28, overflow: 'hidden', ...cardShadow },
  corner: { position: 'absolute' },
  frame: { position: 'absolute', backgroundColor: Colors.white, borderRadius: 12, borderWidth: 4, borderColor: '#F5C26B', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  text: { gap: Spacing.sm, maxWidth: 640, alignSelf: 'stretch' },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  action: { height: 56, minWidth: 56, borderRadius: 28, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, ...cardShadow },
  newStory: { backgroundColor: Colors.purple },
});
