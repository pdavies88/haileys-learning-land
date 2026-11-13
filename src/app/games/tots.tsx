import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Shape } from '@/components/shape';
import { TouchPad } from '@/components/touch-pad';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow } from '@/constants/theme';
import { COLORS, SHAPES, say } from '@/content/learning';
import { playSfx, prepare, speak, speakNext } from '@/lib/audio';

const ANIMALS = ['dog', 'cat', 'cow', 'pig', 'duck', 'horse', 'sheep', 'lion', 'elephant', 'frog', 'monkey', 'penguin'];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Board = 'colors' | 'shapes' | 'animals' | 'numbers';
/** The four boards, each picked by a picture so a toddler can choose without reading. */
const BOARDS: { id: Board; picture: string; label: string }[] = [
  { id: 'colors', picture: 'paint', label: 'Colors' },
  { id: 'shapes', picture: 'blue diamond', label: 'Shapes' },
  { id: 'animals', picture: 'dog', label: 'Animals' },
  { id: 'numbers', picture: 'abacus', label: 'Numbers' },
];

type Tile = { key: string; label: string; line: string; draw: (size: number) => React.ReactNode };

function tilesFor(board: Board): Tile[] {
  switch (board) {
    case 'colors':
      return COLORS.map((c) => ({
        key: c.name,
        label: c.name,
        line: say.color(c.name),
        draw: (size) => <View style={{ width: size * 0.78, height: size * 0.78, borderRadius: size, backgroundColor: c.hex }} />,
      }));
    case 'shapes':
      return SHAPES.map((shape, i) => ({
        key: shape,
        label: shape,
        line: say.shape(shape),
        draw: (size) => <Shape shape={shape} color={COLORS[i % COLORS.length].hex} size={size * 0.78} />,
      }));
    case 'animals':
      return ANIMALS.map((name) => ({ key: name, label: name, line: say.picture(name), draw: (size) => <Pic name={name} size={size * 0.78} /> }));
    case 'numbers':
      return NUMBERS.map((n, i) => ({
        key: String(n),
        label: String(n),
        line: say.number(n),
        draw: (size) => (
          <Txt size={size * 0.56} weight="heavy" color={COLORS[i % COLORS.length].hex}>
            {n}
          </Txt>
        ),
      }));
  }
}

/**
 * Tiny tots, a sound board for toddlers. Pick a board by its picture (colors, shapes, animals or
 * numbers), then tap anything to hear its name: a green circle says "green", the cow says "cow".
 * Nothing to get wrong and nothing to read.
 */
export default function Tots() {
  const { width } = useWindowDimensions();
  const [board, setBoard] = useState<Board>('colors');
  const [last, setLast] = useState<string | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });

  useEffect(() => {
    speak(say.line('totsIntro'));
  }, []);

  const tiles = tilesFor(board);
  // Load this board's names as it opens, so the first tap on each speaks straight away.
  useEffect(() => {
    prepare(...tilesFor(board).map((t) => t.line));
  }, [board]);
  // Every tile fits on the screen at once: three across on a phone, four on a tablet.
  const columns = area.width >= 700 ? 4 : 3;
  const rows = Math.ceil(tiles.length / columns);
  const gap = Spacing.md;
  const tile = area.width > 0 ? Math.min((area.width - gap * (columns - 1)) / columns, (area.height - gap * (rows - 1)) / rows, 220) : 0;

  const tap = (t: Tile) => {
    playSfx('pop');
    setLast(t.key);
    speakNext(t.line);
  };

  return (
    <GameScreen title="Tiny tots" background="#FFF6E5" onRepeat={() => speak(say.line('totsIntro'))}>
      <View style={styles.body}>
        <View style={styles.boards}>
          {BOARDS.map((b) => (
            <Bouncy
              key={b.id}
              accessibilityLabel={b.label}
              style={[styles.board, { width: Math.min(84, (width - 80) / 4) }, board === b.id && styles.boardOn]}
              onPress={() => {
                setBoard(b.id);
                setLast(null);
              }}>
              <Pic name={b.picture} size={Math.min(52, (width - 80) / 4 - 24)} />
            </Bouncy>
          ))}
        </View>
        <View style={styles.grid} onLayout={(e: LayoutChangeEvent) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {tile > 0 && (
            <View key={board} style={[styles.tiles, { gap, width: tile * columns + gap * (columns - 1) }]}>
              {tiles.map((t, i) => (
                <Animated.View key={t.key} entering={ZoomIn.delay(i * 30).springify()}>
                  <TouchPad label={t.label} onTouch={() => tap(t)} style={[styles.tile, { width: tile, height: tile }, last === t.key && styles.tileOn]}>
                    {t.draw(tile)}
                  </TouchPad>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </View>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  boards: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  board: { aspectRatio: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 3, borderColor: 'transparent' },
  boardOn: { backgroundColor: Colors.white, borderColor: Colors.ink, ...cardShadow },
  grid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  tile: { borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white, borderWidth: 3, borderColor: 'transparent', ...cardShadow },
  tileOn: { borderColor: Colors.ink },
});

export { GameError as ErrorBoundary } from '@/components/game-error';
