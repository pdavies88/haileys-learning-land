import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { Draggable } from '@/components/draggable';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Shape } from '@/components/shape';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { COLORS, JIGSAW_PICTURES, SHAPES, say, type ShapeName } from '@/content/learning';
import { useDropTargets } from '@/hooks/use-drop-targets';
import { useRound } from '@/hooks/use-round';
import { pick, playSfx, speak } from '@/lib/audio';
import { sample, shuffle } from '@/lib/random';

type Solved = () => void;

// ---------------------------------------------------------------------------
// Shape sorter: drag each shape to its home.
// ---------------------------------------------------------------------------

function Sorter({ level, onSolved }: { level: number; onSolved: Solved }) {
  const { width } = useWindowDimensions();
  const [pieces] = useState(() =>
    sample(SHAPES, 3 + level).map((shape) => ({ shape, color: pick(COLORS) })),
  );
  const [holes] = useState(() => shuffle(pieces.map((p) => p.shape)));
  const [placed, setPlaced] = useState<ShapeName[]>([]);
  const [trayOrder] = useState(() => shuffle(pieces));
  const targets = useDropTargets();
  const size = Math.min((width - 60) / pieces.length - Spacing.md, 110);

  useEffect(() => {
    speak(say.line('shapeIntro'));
  }, []);

  const drop = (piece: { shape: ShapeName; color: { name: string } }, x: number, y: number) => {
    if (targets.hit(x, y) !== piece.shape) {
      playSfx('bloop');
      return false;
    }
    playSfx('snap');
    const nowPlaced = [...placed, piece.shape];
    setPlaced(nowPlaced);
    if (nowPlaced.length === pieces.length) onSolved();
    else speak(say.shape(piece.shape));
    return true;
  };

  return (
    <View style={styles.sorter}>
      <View style={styles.holes}>
        {holes.map((shape) => {
          const piece = pieces.find((p) => p.shape === shape)!;
          return (
            <View key={shape} ref={targets.register(shape)} onLayout={targets.measure(shape)} style={styles.hole}>
              {placed.includes(shape) ? (
                <Animated.View entering={ZoomIn.springify()}>
                  <Shape shape={shape} color={piece.color.hex} size={size} />
                </Animated.View>
              ) : (
                <Shape shape={shape} color="" size={size} hole />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.tray}>
        {trayOrder.map((piece) =>
          placed.includes(piece.shape) ? (
            <View key={piece.shape} style={{ width: size, height: size }} />
          ) : (
            <Draggable
              key={piece.shape}
              onPickUp={() => speak(say.shapeHome(piece.color.name, piece.shape))}
              onDrop={(x, y) => drop(piece, x, y)}>
              <Shape shape={piece.shape} color={piece.color.hex} size={size} />
            </Draggable>
          ),
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Jigsaw: drag the pieces into place to finish the picture.
// ---------------------------------------------------------------------------

function Jigsaw({ level, onSolved }: { level: number; onSolved: Solved }) {
  const { width, height } = useWindowDimensions();
  const grid = level < 2 ? 2 : 3;
  const [picture] = useState(() => pick(JIGSAW_PICTURES));
  const [order] = useState(() => shuffle(Array.from({ length: grid * grid }, (_, i) => i)));
  const [placed, setPlaced] = useState<number[]>([]);
  const targets = useDropTargets();
  const wide = width > height;
  const board = Math.min(wide ? width * 0.42 : width * 0.8, height * (wide ? 0.62 : 0.4), 420);
  const tile = board / grid;

  useEffect(() => {
    speak(say.line('jigsawIntro'));
  }, []);

  // One square of the picture. Pieces in the tray are drawn smaller so they all fit.
  const piece = (i: number, scale = 1) => {
    const row = Math.floor(i / grid);
    const col = i % grid;
    const t = tile * scale;
    return (
      <View style={{ width: t, height: t, overflow: 'hidden', borderRadius: 6 }}>
        <Pic name={picture} size={board * scale} style={{ marginLeft: -col * t, marginTop: -row * t }} />
      </View>
    );
  };
  const trayScale = Math.min(1, (wide ? width * 0.4 : width - 40) / ((tile + 12) * Math.min(grid * grid, wide ? 3 : 4)));

  const drop = (i: number, x: number, y: number) => {
    if (targets.hit(x, y, 10) !== String(i)) {
      playSfx('bloop');
      return false;
    }
    playSfx('snap');
    const now = [...placed, i];
    setPlaced(now);
    if (now.length === grid * grid) onSolved();
    return true;
  };

  return (
    <View style={[styles.jigsaw, wide && { flexDirection: 'row' }]}>
      <View style={[styles.board, { width: board, height: board }]}>
        <Pic name={picture} size={board} style={styles.ghost} />
        {Array.from({ length: grid * grid }, (_, i) => (
          <View
            key={i}
            ref={targets.register(String(i))}
            onLayout={targets.measure(String(i))}
            style={[styles.slot, { left: (i % grid) * tile, top: Math.floor(i / grid) * tile, width: tile, height: tile }]}>
            {placed.includes(i) ? <Animated.View entering={ZoomIn}>{piece(i)}</Animated.View> : null}
          </View>
        ))}
      </View>
      <View style={[styles.pieces, { maxWidth: wide ? width * 0.4 : width - 40 }]}>
        {order.map((i) =>
          placed.includes(i) ? null : (
            <Draggable key={i} onDrop={(x, y) => drop(i, x, y)}>
              <View style={styles.pieceCard}>{piece(i, trayScale)}</View>
            </Draggable>
          ),
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

const KINDS = ['sorter', 'jigsaw'] as const;

export default function Puzzles() {
  const round = useRound({ total: 3, maxLevel: 3 });
  const [puzzle, setPuzzle] = useState(0);
  const { celebrate, overlay } = useCelebration();
  const kind = KINDS[puzzle % KINDS.length];

  useEffect(() => {
    speak(say.line('puzzleIntro'));
  }, []);

  const solved = async () => {
    await round.success(celebrate);
    setPuzzle((p) => p + 1);
  };

  return (
    <GameScreen
      title="Puzzle World"
      background="#DDF7F4"
      onRepeat={() => speak(say.line(kind === 'sorter' ? 'shapeIntro' : 'jigsawIntro'))}
      progress={{ done: round.done, total: round.total }}>
      {kind === 'sorter' && <Sorter key={puzzle} level={round.level} onSolved={solved} />}
      {kind === 'jigsaw' && <Jigsaw key={puzzle} level={round.level} onSolved={solved} />}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  // Anchored to the top so the targets never move as pieces leave the tray.
  sorter: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', gap: Spacing.xl * 2, padding: Spacing.md, paddingTop: Spacing.xl * 2 },
  holes: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 28, padding: Spacing.md },
  hole: { alignItems: 'center', justifyContent: 'center' },
  tray: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  jigsaw: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: Spacing.md, paddingTop: Spacing.lg, gap: Spacing.lg },
  board: { backgroundColor: Colors.white, borderRadius: 16, ...cardShadow },
  ghost: { position: 'absolute', opacity: 0.15 },
  slot: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(59,42,92,0.15)' },
  pieces: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  pieceCard: { backgroundColor: Colors.white, borderRadius: 10, padding: 3, ...cardShadow },
});
