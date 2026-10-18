/* eslint-disable react-hooks/refs, react-hooks/purity -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { Canvas, Circle, DiscretePathEffect, FillType, Group, LinearGradient, Path, Skia, vec, type SkPath, type SkPathBuilder } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { Bouncy } from '@/components/bouncy';
import { GameScreen } from '@/components/game-screen';
import { Pic } from '@/components/pic';
import { Txt } from '@/components/txt';
import { Colors, Spacing, cardShadow, gradient } from '@/constants/theme';
import { say } from '@/content/learning';
import OUTLINES from '@/content/coloring-outlines.json';
import { COLORING_CATEGORIES, COLORING_FILES } from '@/content/picture-files';
import { playSfx, speak } from '@/lib/audio';

const PALETTE = ['#F2545B', '#FF9F43', '#FFD23F', '#3CC47C', '#2EC4B6', '#4D9DE0', '#9B6DE3', '#FF7EB6', '#8B5A3C', '#3B2A5C'];
const STAMPS = [
  'unicorn', 'heart', 'star', 'butterfly', 'flower', 'rainbow', 'crown', 'cat', 'fish', 'sun', 'dinosaur', 'dragon',
  'mermaid', 'rocket', 'tree', 'snowflake', 'balloon', 'cupcake', 'ladybug', 'gem',
];
/** The "rainbow" color paints a rainbow that runs across the whole page. */
const RAINBOW = 'rainbow';
const RAINBOW_COLORS = ['#F2545B', '#FF9F43', '#FFD23F', '#3CC47C', '#4D9DE0', '#9B6DE3', '#FF7EB6'];
const SIZES = [8, 18, 34];
const GLITTER = ['#FFD23F', '#FF7EB6', '#FFFFFF', '#9B6DE3', '#4D9DE0', '#FFB3D9'];

type Tool = 'crayon' | 'marker' | 'glitter' | 'stamp' | 'eraser';
type Dot = { x: number; y: number; r: number; color: string };
// Marks made in mirror mode are drawn twice: once where she drew, and flipped across the middle.
type Mark = (
  | { kind: 'line'; tool: 'crayon' | 'marker' | 'eraser'; path: SkPath; color: string; width: number }
  | { kind: 'glitter'; dots: Dot[] }
  | { kind: 'stamp'; name: string; x: number; y: number; size: number }
) & { mirror?: boolean };

const TOOLS: { id: Tool; picture: string; label: string }[] = [
  { id: 'crayon', picture: 'crayon', label: 'Crayon' },
  { id: 'marker', picture: 'brush', label: 'Marker' },
  { id: 'glitter', picture: 'sparkles', label: 'Glitter' },
  { id: 'stamp', picture: 'heart', label: 'Stamps' },
  { id: 'eraser', picture: 'eraser', label: 'Eraser' },
];

function LineMark({ mark, page }: { mark: Extract<Mark, { kind: 'line' }>; page: { width: number; height: number } }) {
  const rainbow = mark.tool !== 'eraser' && mark.color === RAINBOW;
  const color = mark.tool === 'eraser' ? '#FFFFFF' : rainbow ? '#FFFFFF' : mark.color;
  return (
    <Path
      path={mark.path}
      color={color}
      style="stroke"
      strokeWidth={mark.width}
      strokeCap="round"
      strokeJoin="round"
      opacity={mark.tool === 'crayon' ? 0.82 : 1}>
      {mark.tool === 'crayon' ? <DiscretePathEffect length={6} deviation={1.6} /> : null}
      {rainbow ? <LinearGradient start={vec(0, 0)} end={vec(page.width, page.height)} colors={RAINBOW_COLORS} /> : null}
    </Path>
  );
}

// Each page's outline as a Skia path, made the first time the page is opened.
const outlinePaths = new Map<string, SkPath>();

/** A coloring page's outlines, drawn as vectors on top of her coloring so they stay sharp at any size. */
function ColoringPage({ name, width, height }: { name: string; width: number; height: number }) {
  const outline = OUTLINES[name as keyof typeof OUTLINES];
  if (!outline) return null;
  if (!outlinePaths.has(name)) {
    const path = Skia.Path.MakeFromSVGString(outline.d)!;
    // The tracer nests each line's inner edge inside its outer edge: even-odd fill leaves the gap.
    path.setFillType(FillType.EvenOdd);
    outlinePaths.set(name, path);
  }
  const fit = Math.min(width, height) * 0.92;
  const scale = fit / outline.size;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={[{ translateX: (width - fit) / 2 }, { translateY: (height - fit) / 2 }, { scale }]}>
        <Path path={outlinePaths.get(name)!} color="#2B2B3A" />
      </Group>
    </Canvas>
  );
}

export default function Art() {
  // The finger handlers below only run on touches, but React Compiler can't tell that from a gesture
  // builder. This screen redraws on every move anyway, so it opts out of the compiler.
  'use no memo';
  const { width } = useWindowDimensions();
  const [tool, setTool] = useState<Tool>('crayon');
  const [color, setColor] = useState(PALETTE[6]);
  const [size, setSize] = useState(1);
  const [stamp, setStamp] = useState(STAMPS[0]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [active, setActive] = useState<Mark | null>(null);
  const [page, setPage] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [category, setCategory] = useState(COLORING_CATEGORIES[0].id);
  const [paper, setPaper] = useState({ width: 0, height: 0 });
  const [mirror, setMirror] = useState(false);
  const current = useRef<{ path: SkPathBuilder; dots: Dot[]; last: { x: number; y: number }; mark?: Mark } | null>(null);

  useEffect(() => {
    speak(say.line('artIntro'));
  }, []);

  const begin = (x: number, y: number) => {
    if (tool === 'stamp') {
      playSfx('pop');
      setMarks((m) => [...m, { kind: 'stamp', name: stamp, x, y, size: 40 + size * 26, mirror }]);
      return;
    }
    const path = Skia.PathBuilder.Make().moveTo(x, y).lineTo(x + 0.1, y);
    current.current = { path, dots: [], last: { x, y } };
    update(x, y);
  };

  const update = (x: number, y: number) => {
    const c = current.current;
    if (!c || tool === 'stamp') return;
    if (tool === 'glitter') {
      const step = Math.hypot(x - c.last.x, y - c.last.y);
      if (step < 6 && c.dots.length) return;
      for (let i = 0; i < 3; i++) {
        c.dots.push({
          x: x + (Math.random() - 0.5) * SIZES[size] * 1.4,
          y: y + (Math.random() - 0.5) * SIZES[size] * 1.4,
          r: 1.5 + Math.random() * (SIZES[size] / 6),
          color: GLITTER[Math.floor(Math.random() * GLITTER.length)],
        });
      }
      c.last = { x, y };
      c.mark = { kind: 'glitter', dots: [...c.dots], mirror };
      setActive(c.mark);
      return;
    }
    c.path.lineTo(x, y);
    const lineTool = tool === 'eraser' ? 'eraser' : tool;
    c.mark = { kind: 'line', tool: lineTool, path: c.path.build(), color, width: SIZES[size] * (tool === 'eraser' ? 1.6 : 1), mirror };
    setActive(c.mark);
  };

  const end = () => {
    const finished = current.current?.mark;
    if (finished) setMarks((m) => [...m, finished]);
    setActive(null);
    current.current = null;
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => begin(e.x, e.y))
    .onUpdate((e) => update(e.x, e.y))
    .onFinalize(() => end());

  const choosePage = (name: string | null) => {
    playSfx('sparkle');
    setPage(name);
    setMarks([]);
    setChoosing(false);
    speak(name ? say.line('artColoring') : say.line('artBlank'));
  };

  const swatch = Math.min(46, (width - 200) / (PALETTE.length + 1));
  // Eight tool buttons and a divider fit on one row, even on a phone.
  const toolSize = Math.min(56, (width - 32 - 8 * 6 - 14) / 8);
  const flip = [{ translateX: paper.width }, { scaleX: -1 }];
  const drawMark = (mark: Mark, key: string) =>
    mark.kind === 'line' ? (
      <LineMark key={key} mark={mark} page={paper} />
    ) : mark.kind === 'glitter' ? (
      mark.dots.map((d, j) => <Circle key={`${key}-${j}`} cx={d.x} cy={d.y} r={d.r} color={d.color} />)
    ) : null;
  const toolStyle = { width: toolSize, height: toolSize, borderRadius: toolSize * 0.32 };
  return (
    <GameScreen title="Art Studio" background="#EADFFF" onRepeat={() => speak(say.line('artIntro'))}>
      <View style={styles.body}>
        <View style={styles.tools}>
          {TOOLS.map((t) => (
            <Bouncy key={t.id} accessibilityLabel={t.label} style={[styles.tool, toolStyle, tool === t.id && styles.selected]} onPress={() => setTool(t.id)}>
              <Pic name={t.picture} size={toolSize * 0.6} />
            </Bouncy>
          ))}
          <View style={styles.divider} />
          <Bouncy
            accessibilityLabel="Magic mirror"
            style={[styles.tool, toolStyle, mirror && styles.selected]}
            onPress={() => {
              if (!mirror) speak(say.line('mirrorOn'));
              setMirror(!mirror);
            }}>
            <Pic name="butterfly" size={toolSize * 0.6} />
          </Bouncy>
          <Bouncy accessibilityLabel="Undo" style={[styles.tool, toolStyle]} onPress={() => setMarks((m) => m.slice(0, -1))}>
            <Pic name="undo" size={toolSize * 0.54} />
          </Bouncy>
          <Bouncy accessibilityLabel="Pictures to color" style={[styles.tool, toolStyle]} onPress={() => setChoosing(true)}>
            <Pic name="paper" size={toolSize * 0.58} />
          </Bouncy>
        </View>

        <View style={styles.paperArea} onLayout={(e: LayoutChangeEvent) => setPaper({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          <GestureDetector gesture={pan}>
            <View style={styles.paper}>
              <Canvas style={StyleSheet.absoluteFill}>
                {[...marks, ...(active ? [active] : [])].map((mark, i) => (
                  <Group key={i}>
                    {drawMark(mark, `m${i}`)}
                    {mark.mirror ? <Group transform={flip}>{drawMark(mark, `f${i}`)}</Group> : null}
                  </Group>
                ))}
              </Canvas>
              {marks.flatMap((mark, i) =>
                mark.kind === 'stamp'
                  ? [mark.x, ...(mark.mirror ? [paper.width - mark.x] : [])].map((x, j) => (
                      <Animated.View
                        key={`${i}-${j}`}
                        entering={ZoomIn.springify()}
                        pointerEvents="none"
                        style={{ position: 'absolute', left: x - mark.size / 2, top: mark.y - mark.size / 2, transform: j ? [{ scaleX: -1 }] : [] }}>
                        <Pic name={mark.name} size={mark.size} />
                      </Animated.View>
                    ))
                  : [],
              )}
              {mirror && <View pointerEvents="none" style={styles.mirrorLine} />}
              {page && paper.width > 0 && <ColoringPage name={page} width={paper.width} height={paper.height} />}
            </View>
          </GestureDetector>
        </View>

        <View style={styles.bottom}>
          {tool === 'stamp' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {STAMPS.map((name) => (
                <Bouncy key={name} accessibilityLabel={name} style={[styles.stampChoice, stamp === name && styles.selected]} onPress={() => setStamp(name)}>
                  <Pic name={name} size={38} />
                </Bouncy>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.row}>
              <Bouncy
                accessibilityLabel="Rainbow"
                style={[styles.swatch, styles.rainbow, { width: swatch, height: swatch }, color === RAINBOW && styles.swatchOn]}
                onPress={() => {
                  if (color !== RAINBOW) speak(say.line('rainbowOn'));
                  setColor(RAINBOW);
                  if (tool === 'eraser' || tool === 'glitter') setTool('marker');
                }}>
                <View />
              </Bouncy>
              {PALETTE.map((c) => (
                <Bouncy
                  key={c}
                  accessibilityLabel="Color"
                  style={[styles.swatch, { width: swatch, height: swatch, backgroundColor: c }, color === c && styles.swatchOn]}
                  onPress={() => {
                    setColor(c);
                    if (tool === 'eraser') setTool('crayon');
                  }}>
                  <View />
                </Bouncy>
              ))}
            </View>
          )}
          <View style={styles.row}>
            {SIZES.map((s, i) => (
              <Bouncy key={s} accessibilityLabel={['Small', 'Medium', 'Big'][i]} style={[styles.sizeButton, size === i && styles.selected]} onPress={() => setSize(i)}>
                <View style={[{ width: s * 0.9 + 6, height: s * 0.9 + 6, borderRadius: 99, backgroundColor: tool === 'eraser' ? '#CCC' : color }, color === RAINBOW && tool !== 'eraser' && styles.rainbow]} />
              </Bouncy>
            ))}
          </View>
        </View>
      </View>

      {choosing && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.chooser}>
          <View style={styles.chooserCard}>
            <Txt size={26} weight="heavy">
              What would you like to color?
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
              {COLORING_CATEGORIES.map((c) => (
                <Bouncy
                  key={c.id}
                  accessibilityLabel={c.title}
                  style={[styles.tab, category === c.id && styles.tabOn]}
                  onPress={() => setCategory(c.id)}>
                  <Pic name={c.icon} size={30} />
                  <Txt size={15} color={category === c.id ? Colors.white : Colors.text}>
                    {c.title}
                  </Txt>
                </Bouncy>
              ))}
            </ScrollView>
            <ScrollView key={category} contentContainerStyle={styles.pages}>
              <Bouncy accessibilityLabel="Blank paper" style={styles.pageThumb} onPress={() => choosePage(null)}>
                <Txt size={18} color={Colors.textSoft}>
                  Blank
                </Txt>
              </Bouncy>
              {COLORING_CATEGORIES.find((c) => c.id === category)!.pages.map((name) => (
                <Bouncy key={name} accessibilityLabel={name} style={styles.pageThumb} onPress={() => choosePage(name)}>
                  <Image source={COLORING_FILES[name]} style={{ width: 80, height: 80 }} contentFit="contain" />
                </Bouncy>
              ))}
            </ScrollView>
            <Bouncy accessibilityLabel="Close" style={styles.closeChooser} onPress={() => setChoosing(false)}>
              <Txt size={20} color={Colors.white}>
                Keep drawing
              </Txt>
            </Bouncy>
          </View>
        </Animated.View>
      )}
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: Spacing.sm, gap: Spacing.sm },
  tools: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  tool: { width: 56, height: 56, borderRadius: 18, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  selected: { backgroundColor: '#FFF3B0', borderWidth: 3, borderColor: Colors.yellow },
  divider: { width: 2, height: 36, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 4 },
  paperArea: { flex: 1 },
  paper: { flex: 1, backgroundColor: Colors.white, borderRadius: 28, overflow: 'hidden', ...cardShadow },
  bottom: { gap: Spacing.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm },
  swatch: { borderRadius: 99, borderWidth: 3, borderColor: Colors.white, ...cardShadow },
  swatchOn: { borderColor: Colors.text, transform: [{ scale: 1.15 }] },
  rainbow: gradient('#F2545B', '#9B6DE3', 135),
  mirrorLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(139,92,246,0.35)' },
  sizeButton: { width: 56, height: 48, borderRadius: 16, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  stampChoice: { width: 56, height: 56, borderRadius: 18, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
  chooser: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(59,42,92,0.35)', alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  chooserCard: { backgroundColor: Colors.white, borderRadius: 32, padding: Spacing.md, gap: Spacing.md, alignItems: 'center', maxWidth: 640, maxHeight: '90%', width: '100%' },
  pages: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md, paddingBottom: Spacing.sm },
  tabsScroll: { flexGrow: 0, flexShrink: 0, height: 62, alignSelf: 'stretch' },
  tabs: { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: Colors.background },
  tabOn: { backgroundColor: Colors.purple },
  pageThumb: { width: 96, height: 96, borderRadius: 22, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#EEE' },
  closeChooser: { backgroundColor: Colors.purple, borderRadius: 999, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
});
