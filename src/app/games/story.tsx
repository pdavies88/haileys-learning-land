import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { PLACES, STORY_FRIENDS, STORY_HEROES, STORY_OBJECTS, say, spokenLines } from '@/content/learning';
import { playSfx, speak, stopSpeaking } from '@/lib/audio';

const TEXT = spokenLines();
type Step = 'hero' | 'place' | 'friend' | 'object' | 'story';

/** Sentence case for labels: "night sky" becomes "Night sky". */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export default function Story() {
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState<Step>('hero');
  const [hero, setHero] = useState(STORY_HEROES[0]);
  const [place, setPlace] = useState(PLACES[0]);
  const [object, setObject] = useState(STORY_OBJECTS[0]);
  const [friend, setFriend] = useState(STORY_FRIENDS[0]);
  const [reached, setReached] = useState(-1);
  const reading = useRef(0);
  const { celebrate, overlay } = useCelebration();

  const prompts: Record<Step, string> = {
    hero: say.line('storyPickHero'),
    place: say.line('storyPickPlace'),
    friend: say.line('storyPickFriend'),
    object: say.line('storyPickObject'),
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

  const linesFor = (o: (typeof STORY_OBJECTS)[number]) => [
    say.storyIntro(hero.id),
    say.storyHome(hero.id, place.id),
    say.storyMeet(hero.id, friend),
    say.storyFind(hero.id, o.id),
    say.storyEvent(o.id, place.id),
    say.storyEnd(hero.id),
  ];
  const lines = linesFor(object);

  /** Reads the story one sentence at a time, showing each sentence as it's read. */
  const read = async (chosen = object) => {
    const lines = linesFor(chosen);
    const run = ++reading.current;
    await speak(say.line('storyReady'));
    for (let i = 0; i < lines.length; i++) {
      if (reading.current !== run) return;
      setReached(i);
      // Stop if something interrupts a sentence, rather than skipping on to the next one.
      if (!(await speak(lines[i]))) return;
    }
    if (reading.current === run) {
      setReached(lines.length);
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
    setReached(-1);
    go('hero');
  };

  const columns = width >= 700 ? 5 : 2;
  const tile = Math.min((width - Spacing.md * (columns + 2)) / columns, 170);
  const choices =
    step === 'hero'
      ? STORY_HEROES.map((h) => ({ id: h.id, picture: h.id, label: h.name, bg: Colors.white, pick: () => { setHero(h); speak(say.picture(h.id)); go('place'); } }))
      : step === 'place'
        ? PLACES.map((p) => ({ id: p.id, picture: p.decor[0], label: sentence(p.name), bg: p.colors[0], pick: () => { setPlace(p); speak(say.place(p.id)); go('friend'); } }))
        : step === 'friend'
          ? STORY_FRIENDS.map((f) => ({ id: f, picture: f, label: sentence(f), bg: Colors.white, pick: () => { setFriend(f); speak(say.picture(f)); go('object'); } }))
          : STORY_OBJECTS.map((o) => ({ id: o.id, picture: o.id, label: sentence(o.name), bg: Colors.white, pick: () => { setObject(o); setStep('story'); read(o); } }));

  let body;
  if (step !== 'story') {
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
              <Txt size={Math.max(18, tile * 0.13)} weight="heavy" color={c.id === 'night' ? Colors.white : Colors.text} numberOfLines={1} adjustsFontSizeToFit>
                {c.label}
              </Txt>
            </Bouncy>
          </Animated.View>
        ))}
      </ScrollView>
    );
  } else {
    const sceneSize = Math.min(width - Spacing.lg * 2, height * 0.42);
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
          <Animated.View entering={ZoomIn.delay(150).springify()} style={[styles.corner, { right: sceneSize * 0.06, bottom: sceneSize * 0.08 }]}>
            <Pic name={friend} size={sceneSize * 0.26} />
          </Animated.View>
        </View>
        <View style={styles.text}>
          {lines.map((id, i) =>
            i <= reached ? (
              <Animated.View key={id} entering={FadeIn}>
                <Txt size={20} weight={i === reached ? 'bold' : 'regular'} color={i === reached ? Colors.purpleDark : Colors.textSoft}>
                  {TEXT[id]}
                </Txt>
              </Animated.View>
            ) : null,
          )}
        </View>
        <View style={styles.actions}>
          <Bouncy accessibilityLabel="Read it again" style={styles.action} onPress={() => read()}>
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
    <GameScreen title="Build a story" background="#EDEBFF" onRepeat={() => (step === 'story' ? read() : speak(prompts[step]))}>
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  option: { borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 4, padding: Spacing.sm, ...cardShadow },
  storyPage: { alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  scene: { borderRadius: 28, overflow: 'hidden', ...cardShadow },
  corner: { position: 'absolute' },
  text: { gap: Spacing.sm, maxWidth: 640, alignSelf: 'stretch' },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  action: { height: 56, minWidth: 56, borderRadius: 28, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, ...cardShadow },
  newStory: { backgroundColor: Colors.purple },
});
