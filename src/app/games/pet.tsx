import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { BounceIn, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { DrawPad, Drawing, type Stroke } from '@/components/draw-pad';
import { FeedTray } from '@/components/feed-tray';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { MISSIONS, PETS, SIGHT_WORDS_EASY, say } from '@/content/learning';
import { pick, playSfx, speak } from '@/lib/audio';
import { randomInt, sample, shuffle } from '@/lib/random';

type Pet = (typeof PETS)[number];
type Activity = 'home' | 'feed' | 'teach' | 'toy';
const HEARTS = 5;

/** The pet bounces when it's happy. */
function PetPicture({ pet, size, bounce }: { pet: string; size: number; bounce: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (bounce > 0) scale.set(withSequence(withSpring(1.18), withSpring(1)));
  }, [bounce, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pic name={pet} size={size} />
    </Animated.View>
  );
}

/** Teach the pet a word: find the spoken sight word among three. */
function Teach({ onDone }: { onDone: () => void }) {
  const [word] = useState(() => pick(SIGHT_WORDS_EASY));
  const [cards] = useState(() => shuffle([word, ...sample(SIGHT_WORDS_EASY.filter((w) => w !== word), 2)]));
  const [wiggles, setWiggles] = useState<Record<string, number>>({});
  const [found, setFound] = useState(false);

  useEffect(() => {
    speak(say.findWord(word));
  }, [word]);

  const choose = async (w: string) => {
    if (found) return;
    if (w === word) {
      setFound(true);
      playSfx('chime');
      await speak(say.word(w));
      onDone();
    } else {
      playSfx('bloop');
      setWiggles((all) => ({ ...all, [w]: (all[w] ?? 0) + 1 }));
      speak(say.word(w), say.line('tryAgain'), say.findWord(word));
    }
  };

  return (
    <View style={styles.cards}>
      {cards.map((w) => (
        <Choice key={w} accessibilityLabel={w} wiggle={wiggles[w] ?? 0} glow={found && w === word} style={styles.wordCard} onPress={() => choose(w)}>
          <Txt size={44} weight="heavy" color={Colors.purpleDark}>
            {w}
          </Txt>
        </Choice>
      ))}
    </View>
  );
}

export default function PetGame() {
  const { width, height } = useWindowDimensions();
  const [pet, setPet] = useState<Pet | null>(null);
  const [activity, setActivity] = useState<Activity>('home');
  const [hearts, setHearts] = useState(0);
  const [bounce, setBounce] = useState(0);
  const [toys, setToys] = useState<Stroke[][]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState('#FF7EB6');
  const [feedTarget, setFeedTarget] = useState(3);
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('petPick'));
  }, []);

  /** An activity is done: the pet is happier. Five hearts earns a big celebration. */
  const happy = async (line: string) => {
    setActivity('home');
    setBounce((b) => b + 1);
    playSfx('star');
    await speak(line);
    const now = hearts + 1;
    if (now >= HEARTS) {
      setHearts(HEARTS);
      await speak(say.pet(pet!.id, 'loves'));
      await celebrate(true);
      setHearts(0);
    } else {
      setHearts(now);
    }
  };

  const padSize = Math.min(width - Spacing.lg * 2, height * 0.45);
  const tile = Math.min((width - Spacing.md * 4) / 2, 190);

  if (!pet) {
    return (
      <GameScreen title="My Little Pet" background="#E6F7E8" onRepeat={() => speak(say.line('petPick'))}>
        <View style={styles.pets}>
          {PETS.map((p, i) => (
            <Animated.View key={p.id} entering={ZoomIn.delay(i * 60).springify()}>
              <Bouncy
                accessibilityLabel={p.name}
                style={[styles.petCard, { width: tile, height: tile }]}
                onPress={() => {
                  setPet(p);
                  playSfx('sparkle');
                  speak(say.pet(p.id, 'hello'));
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

  const mission = MISSIONS.find((m) => m.animal === pet.mission)!;
  const petSize = Math.min(width * 0.45, height * 0.26, 220);

  let body;
  if (activity === 'feed') {
    body = <FeedTray mission={mission} animal={pet.id} target={feedTarget} onDone={() => happy(say.line('yay'))} />;
  } else if (activity === 'teach') {
    body = (
      <View style={styles.activity}>
        <PetPicture pet={pet.id} size={petSize * 0.7} bounce={bounce} />
        <Teach onDone={() => happy(say.line('great'))} />
      </View>
    );
  } else if (activity === 'toy') {
    body = (
      <View style={styles.activity}>
        <DrawPad size={padSize} strokes={strokes} onChange={setStrokes} color={color} onColor={setColor} />
        <Bouncy
          accessibilityLabel="Done drawing"
          style={styles.doneButton}
          onPress={() => {
            if (strokes.length) setToys((t) => [...t.slice(-2), strokes]);
            setStrokes([]);
            happy(say.pet(pet.id, 'lovesToy'));
          }}>
          <Pic name="check" size={34} />
          <Txt size={20} color={Colors.white}>
            Give it the toy
          </Txt>
        </Bouncy>
      </View>
    );
  } else {
    body = (
      <View style={styles.activity}>
        <View style={styles.hearts}>
          {Array.from({ length: HEARTS }, (_, i) => (
            <Pic key={i} name="heart" size={30} style={{ opacity: i < hearts ? 1 : 0.2 }} />
          ))}
        </View>
        <View style={styles.room}>
          <Bouncy
            accessibilityLabel={`Tickle ${pet.name}`}
            sound={false}
            onPress={() => {
              setBounce((b) => b + 1);
              playSfx('pop');
              speak(say.pet(pet.id, 'giggle'));
            }}>
            <PetPicture pet={pet.id} size={petSize} bounce={bounce} />
          </Bouncy>
          <View style={styles.toys}>
            {toys.map((toy, i) => (
              <Animated.View key={i} entering={BounceIn} style={styles.toy}>
                <Drawing strokes={toy} size={64} drawnAt={padSize} />
              </Animated.View>
            ))}
          </View>
        </View>
        <View style={styles.actions}>
          <Bouncy
            accessibilityLabel="Feed"
            style={[styles.action, { backgroundColor: '#FF9F43' }]}
            onPress={() => {
              const n = randomInt(2, 6);
              setFeedTarget(n);
              setActivity('feed');
              speak(say.pet(pet.id, 'hungry'), say.mission(mission, n));
            }}>
            <Pic name={mission.food} size={40} />
            <Txt size={18} color={Colors.white}>
              Feed
            </Txt>
          </Bouncy>
          <Bouncy
            accessibilityLabel="Teach a word"
            style={[styles.action, { backgroundColor: '#4D9DE0' }]}
            onPress={() => {
              setActivity('teach');
              speak(say.pet(pet.id, 'teach'));
            }}>
            <Pic name="book" size={40} />
            <Txt size={18} color={Colors.white}>
              Teach
            </Txt>
          </Bouncy>
          <Bouncy
            accessibilityLabel="Draw a toy"
            style={[styles.action, { backgroundColor: '#9B6DE3' }]}
            onPress={() => {
              setActivity('toy');
              speak(say.pet(pet.id, 'toy'), say.line('petDrawDone'));
            }}>
            <Pic name="crayon" size={40} />
            <Txt size={18} color={Colors.white}>
              Toy
            </Txt>
          </Bouncy>
        </View>
        <Bouncy
          accessibilityLabel="Pick a different pet"
          style={styles.switch}
          onPress={() => {
            setPet(null);
            setHearts(0);
            setToys([]);
            speak(say.line('petPick'));
          }}>
          <Txt size={16} color={Colors.textSoft}>
            Pick a different pet
          </Txt>
        </Bouncy>
      </View>
    );
  }

  return (
    <GameScreen
      title="My Little Pet"
      background="#E6F7E8"
      onRepeat={() => speak(say.pet(pet.id, activity === 'feed' ? 'hungry' : activity === 'teach' ? 'teach' : activity === 'toy' ? 'toy' : 'hello'))}>
      {activity !== 'home' && (
        <Bouncy accessibilityLabel="Back to your pet" style={styles.back} onPress={() => setActivity('home')}>
          <Txt size={16} color={Colors.textSoft}>
            ‹ Back to {pet.name.toLowerCase()}
          </Txt>
        </Bouncy>
      )}
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  pets: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  petCard: { backgroundColor: Colors.white, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, ...cardShadow },
  activity: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', padding: Spacing.md },
  hearts: { flexDirection: 'row', gap: 6 },
  room: { alignItems: 'center', gap: Spacing.sm },
  toys: { flexDirection: 'row', gap: Spacing.sm },
  toy: { backgroundColor: Colors.white, borderRadius: 16, padding: 4, ...cardShadow },
  actions: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  action: { width: 104, height: 104, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 4, ...cardShadow },
  switch: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)' },
  back: { alignSelf: 'center', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
  wordCard: { width: 150, height: 100 },
  doneButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.green, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, ...cardShadow },
});
