/* eslint-disable react-hooks/refs -- the flagged code runs in finger handlers handed to a
 gesture builder, not during render. The component opts out of React Compiler with 'use no memo'. */
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Bouncy } from '@/components/bouncy';
import { Pic } from '@/components/pic';
import { Colors, Spacing, cardShadow } from '@/constants/theme';

export type Stroke = { points: { x: number; y: number }[]; color: string };
const COLORS = ['#F2545B', '#FF9F43', '#FFD23F', '#3CC47C', '#4D9DE0', '#9B6DE3', '#FF7EB6', '#3B2A5C'];

function strokePath(stroke: Stroke, scale: number) {
  const builder = Skia.PathBuilder.Make();
  stroke.points.forEach((p, i) => (i === 0 ? builder.moveTo(p.x * scale, p.y * scale) : builder.lineTo(p.x * scale, p.y * scale)));
  if (stroke.points.length === 1) builder.lineTo(stroke.points[0].x * scale + 0.1, stroke.points[0].y * scale);
  return builder.build();
}

/** A drawing shown smaller somewhere else, such as on a story page. Drawn on a `size` square. */
export function Drawing({ strokes, size, drawnAt }: { strokes: Stroke[]; size: number; drawnAt: number }) {
  const scale = size / drawnAt;
  return (
    <Canvas style={{ width: size, height: size }}>
      {strokes.map((stroke, i) => (
        <Path key={i} path={strokePath(stroke, scale)} color={stroke.color} style="stroke" strokeWidth={14 * scale} strokeCap="round" strokeJoin="round" />
      ))}
    </Canvas>
  );
}

type Props = { size: number; strokes: Stroke[]; onChange: (strokes: Stroke[]) => void; color: string; onColor: (color: string) => void };

/** A square drawing pad with a marker, a row of colors and a clear button. */
export function DrawPad({ size, strokes, onChange, color, onColor }: Props) {
  'use no memo';
  const latest = useRef(strokes);
  latest.current = strokes;

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => onChange([...latest.current, { points: [{ x: e.x, y: e.y }], color }]))
    .onUpdate((e) => {
      const all = latest.current;
      const last = all[all.length - 1];
      if (!last) return;
      onChange([...all.slice(0, -1), { ...last, points: [...last.points, { x: e.x, y: e.y }] }]);
    });

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={pan}>
        <View style={[styles.paper, { width: size, height: size }]}>
          <Drawing strokes={strokes} size={size} drawnAt={size} />
        </View>
      </GestureDetector>
      <View style={styles.colors}>
        {COLORS.map((c) => (
          <Bouncy key={c} accessibilityLabel="Color" onPress={() => onColor(c)} style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]}>
            <View />
          </Bouncy>
        ))}
        <Bouncy accessibilityLabel="Start over" onPress={() => onChange([])} style={styles.clear}>
          <Pic name="eraser" size={26} />
        </Bouncy>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm },
  paper: { backgroundColor: Colors.white, borderRadius: 24, overflow: 'hidden', ...cardShadow },
  colors: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, alignItems: 'center' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: Colors.white, ...cardShadow },
  swatchOn: { borderColor: Colors.text, transform: [{ scale: 1.15 }] },
  clear: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...cardShadow },
});
