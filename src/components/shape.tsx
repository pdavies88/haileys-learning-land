import { Canvas, DashPathEffect, Path, Skia } from '@shopify/react-native-skia';

import type { ShapeName } from '@/content/learning';

// Each shape as an SVG path on a 100 x 100 box.
const SHAPE_PATHS: Record<ShapeName, string> = {
  circle: 'M50 6a44 44 0 1 1 0 88a44 44 0 1 1 0-88z',
  square: 'M12 12h76v76h-76z',
  triangle: 'M50 8l44 80h-88z',
  star: 'M50 5l13 28l31 4l-23 21l6 31l-27-15l-27 15l6-31l-23-21l31-4z',
  heart: 'M50 88c-30-20-44-36-44-54c0-14 10-24 22-24c10 0 17 6 22 14c5-8 12-14 22-14c12 0 22 10 22 24c0 18-14 34-44 54z',
  diamond: 'M50 4l40 46l-40 46l-40-46z',
};

/** A filled shape, or its dashed "home" outline when `hole` is set. */
export function Shape({ shape, color, size, hole }: { shape: ShapeName; color: string; size: number; hole?: boolean }) {
  const m = Skia.Matrix();
  m.scale(size / 100, size / 100);
  const path = Skia.PathBuilder.MakeFromPath(Skia.Path.MakeFromSVGString(SHAPE_PATHS[shape])!).transform(m).build();
  return (
    <Canvas style={{ width: size, height: size }}>
      {hole ? (
        <>
          <Path path={path} color="rgba(59,42,92,0.12)" />
          <Path path={path} color="rgba(59,42,92,0.45)" style="stroke" strokeWidth={3}>
            <DashPathEffect intervals={[8, 6]} />
          </Path>
        </>
      ) : (
        <>
          <Path path={path} color={color} />
          <Path path={path} color="rgba(255,255,255,0.35)" style="stroke" strokeWidth={4} />
        </>
      )}
    </Canvas>
  );
}
