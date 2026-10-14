import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { useCelebration } from '@/components/celebration';
import { Draggable } from '@/components/draggable';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Shape } from '@/components/shape';
import { ShapeHunt } from '@/components/shape-hunt';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { BUILDS, COLORS, say, type BuildPiece } from '@/content/learning';
import { useDropTargets } from '@/hooks/use-drop-targets';
import { useRound } from '@/hooks/use-round';
import { playSfx, speak } from '@/lib/audio';
import { shuffle } from '@/lib/random';

type Build = (typeof BUILDS)[number];
const hex = (name: string) => COLORS.find((c) => c.name === name)!.hex;
const samePiece = (a: BuildPiece, b: BuildPiece) => a.shape === b.shape && a.w === b.w && a.h === b.h && a.color === b.color;

/** Drag shapes into the dashed outline to build a house, a robot or a rocket. */
function Builder({ build, onBuilt }: { build: Build; onBuilt: () => void }) {
  const { width, height } = useWindowDimensions();
  const [filled, setFilled] = useState<number[]>([]);
  const [tray] = useState(() => shuffle(build.pieces.map((piece, index) => ({ piece, index }))));
  const [usedTray, setUsedTray] = useState<number[]>([]);
  const targets = useDropTargets();
  const area = Math.min(width - Spacing.lg * 2, height * 0.46, 460);
  // Pieces in the tray are drawn smaller, but never so small that little fingers can't grab them.
  const trayScaleFor = (piece: BuildPiece) => Math.min(1, Math.max(0.55, 48 / (Math.min(piece.w, piece.h) * area)));
  const lift = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const finished = filled.length === build.pieces.length;

  useEffect(() => {
    speak(say.build(build.id));
  }, [build.id]);

  useEffect(() => {
    if (!finished) return;
    if (build.id === 'rocket') lift.set(withDelay(1600, withTiming(-height, { duration: 1600 })));
    if (build.id === 'robot') wiggle.set(withRepeat(withSequence(withTiming(-6, { duration: 150 }), withTiming(6, { duration: 150 })), 6, true));
  }, [finished, build.id, height, lift, wiggle]);

  const flight = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { rotate: `${wiggle.value}deg` }] }));

  const drop = (trayIndex: number, piece: BuildPiece, x: number, y: number) => {
    const fits = (id: string) => !filled.includes(Number(id)) && samePiece(build.pieces[Number(id)], piece);
    const hit = targets.hit(x, y, 16, fits);
    if (hit === null) {
      if (targets.hit(x, y, 0) !== null) playSfx('bloop');
      return false;
    }
    const slot = Number(hit);
    playSfx('snap');
    const now = [...filled, slot];
    setFilled(now);
    setUsedTray((u) => [...u, trayIndex]);
    if (now.length === build.pieces.length) {
      (async () => {
        if (build.id === 'rocket') await speak(say.buildDone(build.id), say.line('blastOff'));
        else await speak(say.buildDone(build.id));
        onBuilt();
      })();
    }
    return true;
  };

  return (
    <View style={styles.builder}>
      <Animated.View style={[styles.area, { width: area, height: area }, flight]}>
        {build.pieces.map((piece, i) => {
          const w = piece.w * area;
          const h = piece.h * area;
          return (
            <View
              key={i}
              ref={targets.register(String(i))}
              onLayout={targets.measure(String(i))}
              style={{ position: 'absolute', left: piece.x * area - w / 2, top: piece.y * area - h / 2, width: w, height: h }}>
              {filled.includes(i) ? (
                <Animated.View entering={ZoomIn.springify()}>
                  <Shape shape={piece.shape} color={hex(piece.color)} size={w} width={w} height={h} />
                </Animated.View>
              ) : (
                <Shape shape={piece.shape} color="" size={w} width={w} height={h} hole />
              )}
            </View>
          );
        })}
      </Animated.View>
      <View style={styles.tray}>
        {tray.map(({ piece }, t) =>
          usedTray.includes(t) ? null : (
            <Draggable key={t} onDrop={(x, y) => drop(t, piece, x, y)}>
              <Shape
                shape={piece.shape}
                color={hex(piece.color)}
                size={piece.w * area * trayScaleFor(piece)}
                width={piece.w * area * trayScaleFor(piece)}
                height={piece.h * area * trayScaleFor(piece)}
              />
            </Draggable>
          ),
        )}
      </View>
    </View>
  );
}

export default function Quest() {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'menu' | 'hunt' | 'pick' | 'build'>('menu');
  const [build, setBuild] = useState<Build>(BUILDS[0]);
  const [huntKey, setHuntKey] = useState(0);
  const round = useRound({ total: 3, maxLevel: 3 });
  const { celebrate, overlay } = useCelebration();

  useEffect(() => {
    speak(say.line('questPick'));
  }, []);

  const tile = Math.min((width - Spacing.md * 4) / 2, 210);
  const menuButton = (label: string, picture: string, color: string, onPress: () => void) => (
    <Bouncy accessibilityLabel={label} style={[styles.menuCard, { width: tile, height: tile, backgroundColor: color }]} onPress={onPress}>
      <View style={styles.bubble}>
        <Pic name={picture} size={tile * 0.4} />
      </View>
      <Txt size={22} weight="heavy" color={Colors.white}>
        {label}
      </Txt>
    </Bouncy>
  );

  let body;
  if (mode === 'menu') {
    body = (
      <View style={styles.menu}>
        {menuButton('Hunt', 'magnifier', '#3AA0D9', () => {
          setMode('hunt');
          speak(say.line('questHunt'));
        })}
        {menuButton('Build', 'rocket', '#F28C38', () => {
          setMode('pick');
          speak(say.line('questBuild'));
        })}
      </View>
    );
  } else if (mode === 'hunt') {
    body = (
      <ShapeHunt
        key={huntKey}
        level={round.level}
        onSolved={async () => {
          await round.success(celebrate);
          setHuntKey((k) => k + 1);
        }}
      />
    );
  } else if (mode === 'pick') {
    body = (
      <View style={styles.menu}>
        {BUILDS.map((b) => (
          <Animated.View key={b.id} entering={ZoomIn.springify()}>
            <Bouncy
              accessibilityLabel={b.name}
              style={[styles.menuCard, { width: tile * 0.9, height: tile * 0.9, backgroundColor: Colors.white }]}
              onPress={() => {
                setBuild(b);
                setMode('build');
              }}>
              <Pic name={b.id === 'house' ? 'house' : b.id} size={tile * 0.45} />
              <Txt size={20} style={{ textTransform: 'capitalize' }}>
                {b.name}
              </Txt>
            </Bouncy>
          </Animated.View>
        ))}
      </View>
    );
  } else {
    body = (
      <Builder
        key={build.id + huntKey}
        build={build}
        onBuilt={async () => {
          await celebrate(true);
          setHuntKey((k) => k + 1);
          setMode('pick');
          speak(say.line('questBuild'));
        }}
      />
    );
  }

  return (
    <GameScreen
      title="Shape Quest"
      background="#E2F2FC"
      onRepeat={() => speak(say.line(mode === 'hunt' ? 'questHunt' : mode === 'menu' ? 'questPick' : 'questBuild'))}
      progress={mode === 'hunt' ? { done: round.done, total: round.total } : undefined}>
      {mode !== 'menu' && (
        <Bouncy accessibilityLabel="Back to the start" style={styles.back} onPress={() => setMode('menu')}>
          <Txt size={16} color={Colors.textSoft}>
            ‹ Hunt or build
          </Txt>
        </Bouncy>
      )}
      {body}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  menu: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  menuCard: { borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, ...cardShadow },
  bubble: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, padding: Spacing.md },
  back: { alignSelf: 'center', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
  // Anchored to the top so the board never moves as pieces leave the tray: drop targets
  // remember where they are on screen.
  builder: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: Spacing.lg, padding: Spacing.md, paddingTop: Spacing.lg },
  area: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 28 },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: Spacing.md, maxWidth: 520 },
});
