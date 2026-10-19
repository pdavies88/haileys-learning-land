import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useCelebration } from '@/components/celebration';
import { Choice } from '@/components/choice';
import { Draggable } from '@/components/draggable';
import { GameScreen } from '@/components/game-screen';
import { HelpButton } from '@/components/help-button';
import { Pic } from '@/components/pic';
import { Shape } from '@/components/shape';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { COLORS, JIGSAW_PICTURES, SHAPES, say, type ShapeName } from '@/content/learning';
import { useDropTargets } from '@/hooks/use-drop-targets';
import { useHelp } from '@/hooks/use-help';
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
    sample(SHAPES, Math.min(4 + level, SHAPES.length)).map((shape) => ({ shape, color: pick(COLORS) })),
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
  const grid = level < 1 ? 2 : level < 3 ? 3 : 4;
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
// Patterns: work out the rule and pick what comes next.
// ---------------------------------------------------------------------------

type Token = { shape: ShapeName; color: string };
// Each rule is a repeating unit of token indexes: AB, AAB, ABB, ABC, AABB.
const RULES = [[[0, 1]], [[0, 1], [0, 0, 1], [0, 1, 1]], [[0, 1, 2], [0, 0, 1], [0, 1, 1]], [[0, 1, 2], [0, 0, 1, 1], [0, 1, 2, 2]]];

function Pattern({ level, onSolved, onMiss }: { level: number; onSolved: Solved; onMiss: () => number }) {
  const { width } = useWindowDimensions();
  const [puzzle] = useState(() => {
    const rule = pick(RULES[level]);
    const kinds = Math.max(...rule) + 1;
    // Early levels change shape and color together; later ones keep the color and vary the shape.
    const shapes = sample(SHAPES, kinds);
    const colors = sample(COLORS, kinds).map((c) => c.hex);
    const sameColor = level >= 2 && Math.random() < 0.5 ? colors[0] : null;
    const tokens: Token[] = shapes.map((shape, i) => ({ shape, color: sameColor ?? colors[i] }));
    const length = rule.length * 2 + Math.min(level, 2);
    const row = Array.from({ length: length + 1 }, (_, i) => rule[i % rule.length]);
    const answer = row[length];
    const extra = SHAPES.filter((sh) => !shapes.includes(sh));
    const decoy: Token = { shape: pick(extra), color: sameColor ?? pick(COLORS).hex };
    const options = shuffle([...tokens.map((_, i) => i), ...(kinds < 3 ? [-1] : [])]);
    return { tokens, decoy, row: row.slice(0, length), answer, options };
  });
  const [wiggles, setWiggles] = useState<Record<number, number>>({});
  const help = useHelp<number>();
  const [done, setDone] = useState(false);
  const tokenOf = (i: number) => (i === -1 ? puzzle.decoy : puzzle.tokens[i]);
  const size = Math.min((width - 60) / (puzzle.row.length + 1) - 6, 64);
  const option = Math.min((width - 80) / puzzle.options.length - Spacing.md, 110);

  useEffect(() => {
    speak(say.line('patternIntro'), say.line('whatNext'));
  }, []);

  const choose = (i: number) => {
    if (done) return;
    if (i === puzzle.answer) {
      setDone(true);
      playSfx('snap');
      onSolved();
      return;
    }
    playSfx('bloop');
    setWiggles((w) => ({ ...w, [i]: (w[i] ?? 0) + 1 }));
    const offer = help.miss(onMiss(), i);
    speak(say.line('tryAgain'), say.line('whatNext'), ...offer);
  };

  return (
    <View style={styles.pattern}>
      <View style={styles.patternRow}>
        {puzzle.row.map((t, i) => (
          <Animated.View key={i} entering={ZoomIn.delay(i * 70)}>
            <Shape shape={tokenOf(t).shape} color={tokenOf(t).color} size={size} />
          </Animated.View>
        ))}
        <View style={[styles.patternGap, { width: size + 12, height: size + 12 }]}>
          {done ? (
            <Animated.View entering={ZoomIn.springify()}>
              <Shape shape={tokenOf(puzzle.answer).shape} color={tokenOf(puzzle.answer).color} size={size} />
            </Animated.View>
          ) : (
            <Txt size={size * 0.6} weight="heavy" color={Colors.teal}>
              ?
            </Txt>
          )}
        </View>
      </View>
      <View style={styles.tray}>
        {puzzle.options.map((i) => (
          <Choice
            key={i}
            accessibilityLabel={tokenOf(i).shape}
            wiggle={wiggles[i] ?? 0}
            glow={done && i === puzzle.answer}
            gone={help.isGone(i)}
            style={{ width: option + 20, height: option + 20 }}
            onPress={() => choose(i)}>
            <Shape shape={tokenOf(i).shape} color={tokenOf(i).color} size={option * 0.8} />
          </Choice>
        ))}
      </View>
      <HelpButton visible={!done && help.canHelp(puzzle.options, puzzle.answer)} onPress={() => help.help(puzzle.options, puzzle.answer)} />
    </View>
  );
}

// ---------------------------------------------------------------------------

const KINDS = ['pattern', 'jigsaw', 'sorter', 'pattern', 'jigsaw'] as const;

export default function Puzzles() {
  const round = useRound({ total: 4, maxLevel: 3, start: 1 });
  const [puzzle, setPuzzle] = useState(0);
  const { celebrate, overlay } = useCelebration();
  const kind = KINDS[puzzle % KINDS.length];

  // Each puzzle says its own instruction when it appears.
  const solved = async () => {
    await round.success(celebrate);
    setPuzzle((p) => p + 1);
  };

  return (
    <GameScreen
      title="Puzzle world"
      background="#CFF5EF"
      onRepeat={() => speak(say.line(kind === 'sorter' ? 'shapeIntro' : kind === 'pattern' ? 'whatNext' : 'jigsawIntro'))}
      level={round.level}
      progress={{ done: round.done, total: round.total }}>
      {kind === 'sorter' && <Sorter key={puzzle} level={round.level} onSolved={solved} />}
      {kind === 'jigsaw' && <Jigsaw key={puzzle} level={round.level} onSolved={solved} />}
      {kind === 'pattern' && <Pattern key={puzzle} level={round.level} onSolved={solved} onMiss={round.miss} />}
      {overlay}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  pattern: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl * 1.5, padding: Spacing.md },
  patternRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 28, padding: Spacing.md },
  patternGap: { borderRadius: 16, borderWidth: 3, borderStyle: 'dashed', borderColor: Colors.teal, alignItems: 'center', justifyContent: 'center' },
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
