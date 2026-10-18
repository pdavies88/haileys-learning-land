import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { Draggable } from '@/components/draggable';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { FRIENDS, PLACES, STICKERS, say } from '@/content/learning';
import { playSfx, speak } from '@/lib/audio';

type Placed = { id: number; name: string; x: number; y: number };
type Place = (typeof PLACES)[number];

// Where the place's decorations sit, as fractions of the scene.
const DECOR_SPOTS = [
  { x: 0.14, y: 0.16, size: 0.16 },
  { x: 0.86, y: 0.14, size: 0.13 },
  { x: 0.84, y: 0.8, size: 0.15 },
];

export default function Friends() {
  const { width } = useWindowDimensions();
  const [friend, setFriend] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [stickers, setStickers] = useState<Placed[]>([]);
  const [scene, setScene] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sceneView = useRef<View>(null);
  const nextId = useRef(1);

  useEffect(() => {
    speak(say.line('friendIntro'));
  }, []);

  const step = !friend ? 'friend' : !place ? 'place' : 'decorate';
  const instruction = step === 'friend' ? 'friendIntro' : step === 'place' ? 'pickPlace' : 'addStickers';

  const measureScene = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    requestAnimationFrame(() => sceneView.current?.measureInWindow((x, y) => setScene({ x, y, width: w, height: h })));
  };

  const inScene = (x: number, y: number) => x >= scene.x && x <= scene.x + scene.width && y >= scene.y && y <= scene.y + scene.height;

  const dropNew = (name: string, x: number, y: number) => {
    if (!inScene(x, y)) return false;
    playSfx('pop');
    setStickers((s) => [...s, { id: nextId.current++, name, x: x - scene.x, y: y - scene.y }]);
    return false; // the tray sticker springs back so she can use it again
  };

  const startOver = () => {
    setFriend(null);
    setPlace(null);
    setStickers([]);
    speak(say.line('friendIntro'));
  };

  const columns = width >= 700 ? 5 : 2;
  const tile = Math.min((width - Spacing.md * (columns + 2)) / columns, 180);

  if (step === 'friend' || step === 'place') {
    const options = step === 'friend' ? FRIENDS.map((f) => ({ id: f, picture: f })) : PLACES.map((p) => ({ id: p.id, picture: p.decor[0] }));
    return (
      <GameScreen title="Make a Friend" background="#FFE3EC" onRepeat={() => speak(say.line(instruction))}>
        <ScrollView contentContainerStyle={styles.options}>
          {options.map((option, i) => {
            const placeInfo = PLACES.find((p) => p.id === option.id);
            return (
              <Animated.View key={option.id} entering={ZoomIn.delay(i * 50).springify()}>
                <Bouncy
                  accessibilityLabel={option.id}
                  style={[styles.option, { width: tile, height: tile, backgroundColor: placeInfo ? placeInfo.colors[0] : Colors.white }]}
                  onPress={() => {
                    playSfx('sparkle');
                    if (step === 'friend') {
                      setFriend(option.id);
                      speak(say.picture(option.id), say.line('pickPlace'));
                    } else {
                      setPlace(placeInfo!);
                      speak(say.place(option.id), say.line('addStickers'));
                    }
                  }}>
                  <Pic name={option.picture} size={tile * 0.62} />
                  {placeInfo ? (
                    <Txt size={18} color={placeInfo.id === 'night' ? Colors.white : Colors.text}>
                      {placeInfo.name}
                    </Txt>
                  ) : null}
                </Bouncy>
              </Animated.View>
            );
          })}
        </ScrollView>
      </GameScreen>
    );
  }

  const friendSize = Math.min(scene.width, scene.height) * 0.5;
  return (
    <GameScreen title="Make a Friend" background="#FFE3EC" onRepeat={() => speak(say.line(instruction))}>
      <View style={styles.decorate}>
        <View ref={sceneView} onLayout={measureScene} style={styles.scene}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={scene.width} height={scene.height}>
              <LinearGradient start={vec(0, 0)} end={vec(0, scene.height)} colors={place!.colors} />
            </Rect>
          </Canvas>
          {scene.width > 0 &&
            DECOR_SPOTS.map((spot, i) => {
              const s = Math.min(scene.width, scene.height) * spot.size * 1.6;
              return (
                <View key={i} pointerEvents="none" style={{ position: 'absolute', left: spot.x * scene.width - s / 2, top: spot.y * scene.height - s / 2 }}>
                  <Pic name={place!.decor[i]} size={s} />
                </View>
              );
            })}
          {scene.width > 0 && (
            <Animated.View entering={ZoomIn.springify()} pointerEvents="none" style={[styles.friend, { left: scene.width / 2 - friendSize / 2, top: scene.height / 2 - friendSize / 2 }]}>
              <Pic name={friend!} size={friendSize} />
            </Animated.View>
          )}
          {stickers.map((sticker) => {
            const s = Math.max(48, Math.min(scene.width, scene.height) * 0.13);
            return (
              <View key={sticker.id} style={{ position: 'absolute', left: sticker.x - s / 2, top: sticker.y - s / 2 }}>
                <Draggable stayWhereDropped onPickUp={() => playSfx('pop')} onDrop={() => true}>
                  <Animated.View entering={ZoomIn.springify()}>
                    <Pic name={sticker.name} size={s} />
                  </Animated.View>
                </Draggable>
              </View>
            );
          })}
        </View>

        <View style={styles.tray}>
          {STICKERS.map((name) => (
            <Draggable key={name} onDrop={(x, y) => dropNew(name, x, y)}>
              <View style={styles.sticker}>
                <Pic name={name} size={40} />
              </View>
            </Draggable>
          ))}
        </View>

        <Animated.View entering={FadeIn} style={styles.actions}>
          <Bouncy accessibilityLabel="Clear stickers" style={styles.action} onPress={() => setStickers([])}>
            <Pic name="trash" size={30} />
          </Bouncy>
          <Bouncy accessibilityLabel="New friend" style={[styles.action, styles.newFriend]} onPress={startOver}>
            <Txt size={20} color={Colors.white}>
              New friend
            </Txt>
          </Bouncy>
        </Animated.View>
      </View>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  option: { borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 4, ...cardShadow },
  decorate: { flex: 1, padding: Spacing.sm, gap: Spacing.sm },
  scene: { flex: 1, borderRadius: 28, overflow: 'hidden', ...cardShadow },
  friend: { position: 'absolute' },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  sticker: { width: 56, height: 56, borderRadius: 18, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md },
  action: { height: 56, minWidth: 56, borderRadius: 28, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, ...cardShadow },
  newFriend: { backgroundColor: Colors.pink },
});
