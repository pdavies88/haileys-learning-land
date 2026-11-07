import { Canvas, PaintStyle, Picture, Skia, StrokeCap, StrokeJoin, type SkCanvas, type SkPaint } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import type { Ground, Scene, Thing } from '@/lib/spy-scene';

/**
 * Draws an I spy scene (see `src/lib/spy-scene.ts`) with Skia.
 *
 * The whole picture is recorded once into a Skia picture and then shown as a single image, so a
 * crowd of a few hundred drawn things costs no more to show than one photo, even on a Fire tablet.
 */

const INK = '#3B2A3F'; // the outline round everything, so each thing reads clearly against the rest

// Paints are reused: a scene asks for the same few colours hundreds of times.
const paints = new Map<string, SkPaint>();
function fill(color: string): SkPaint {
  let p = paints.get(color);
  if (!p) {
    p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    paints.set(color, p);
  }
  return p;
}
function stroke(color: string, width: number): SkPaint {
  const key = `${color}/${width.toFixed(1)}`;
  let p = paints.get(key);
  if (!p) {
    p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    p.setStyle(PaintStyle.Stroke);
    p.setStrokeWidth(width);
    p.setStrokeCap(StrokeCap.Round);
    p.setStrokeJoin(StrokeJoin.Round);
    paints.set(key, p);
  }
  return p;
}

// Skia's functions are native and must be called on `Skia` itself, so this wraps rather than copies.
const rect = (x: number, y: number, w: number, h: number) => Skia.XYWHRect(x, y, w, h);

/** A small set of drawing helpers that fill a shape and then outline it. */
function pen(c: SkCanvas, ow: number) {
  return {
    circle(x: number, y: number, r: number, color: string, outline = true) {
      c.drawCircle(x, y, r, fill(color));
      if (outline) c.drawCircle(x, y, r, stroke(INK, ow));
    },
    oval(x: number, y: number, rx: number, ry: number, color: string, outline = true) {
      const r = rect(x - rx, y - ry, rx * 2, ry * 2);
      c.drawOval(r, fill(color));
      if (outline) c.drawOval(r, stroke(INK, ow));
    },
    box(x: number, y: number, w: number, h: number, radius: number, color: string, outline = true) {
      const r = Skia.RRectXY(rect(x, y, w, h), radius, radius);
      c.drawRRect(r, fill(color));
      if (outline) c.drawRRect(r, stroke(INK, ow));
    },
    shape(points: [number, number][], color: string, outline = true) {
      const b = Skia.PathBuilder.Make();
      points.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y)));
      const path = b.close().build();
      c.drawPath(path, fill(color));
      if (outline) c.drawPath(path, stroke(INK, ow));
    },
    /** A thick line with an outline: an arm, a leg, a stalk. */
    limb(x0: number, y0: number, x1: number, y1: number, width: number, color: string) {
      c.drawLine(x0, y0, x1, y1, stroke(INK, width + ow * 2));
      c.drawLine(x0, y0, x1, y1, stroke(color, width));
    },
    line(x0: number, y0: number, x1: number, y1: number, width: number, color = INK) {
      c.drawLine(x0, y0, x1, y1, stroke(color, width));
    },
  };
}
type Pen = ReturnType<typeof pen>;

// ---------------------------------------------------------------------------
// The targets, drawn in a square of `size` centred on (x, y)
// ---------------------------------------------------------------------------

export function drawTarget(c: SkCanvas, name: string, x: number, y: number, size: number) {
  const ow = Math.max(1.6, size * 0.05);
  const p = pen(c, ow);
  const r = size / 2;
  if (name === 'star') {
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const d = i % 2 ? r * 0.45 : r * 0.98;
      pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.98 + r * 0.06]);
    }
    p.shape(pts, '#FFD23F');
    p.circle(x - r * 0.18, y - r * 0.02, r * 0.07, INK, false);
    p.circle(x + r * 0.18, y - r * 0.02, r * 0.07, INK, false);
  } else if (name === 'heart') {
    const b = Skia.PathBuilder.Make();
    b.moveTo(x, y + r * 0.85);
    b.cubicTo(x - r * 1.25, y + r * 0.05, x - r * 0.75, y - r * 0.95, x, y - r * 0.4);
    b.cubicTo(x + r * 0.75, y - r * 0.95, x + r * 1.25, y + r * 0.05, x, y + r * 0.85);
    const path = b.close().build();
    c.drawPath(path, fill('#FF4D6D'));
    c.drawPath(path, stroke(INK, ow));
    p.oval(x - r * 0.38, y - r * 0.3, r * 0.14, r * 0.09, '#FFB3C1', false);
  } else if (name === 'ladybug') {
    p.circle(x, y - r * 0.62, r * 0.3, '#2B2D42');
    p.limb(x - r * 0.1, y - r * 0.85, x - r * 0.3, y - r * 1.0, ow * 0.6, INK);
    p.limb(x + r * 0.1, y - r * 0.85, x + r * 0.3, y - r * 1.0, ow * 0.6, INK);
    p.oval(x, y + r * 0.1, r * 0.78, r * 0.72, '#E63946');
    p.line(x, y - r * 0.6, x, y + r * 0.8, ow);
    for (const [dx, dy] of [[-0.42, -0.1], [0.42, -0.1], [-0.35, 0.38], [0.35, 0.38], [-0.12, 0.62], [0.12, 0.62]])
      p.circle(x + dx * r, y + dy * r, r * 0.12, '#2B2D42', false);
  } else if (name === 'strawberry') {
    const b = Skia.PathBuilder.Make();
    b.moveTo(x, y + r * 0.95);
    b.cubicTo(x - r * 0.6, y + r * 0.6, x - r * 0.95, y - r * 0.1, x - r * 0.7, y - r * 0.5);
    b.cubicTo(x - r * 0.4, y - r * 0.75, x + r * 0.4, y - r * 0.75, x + r * 0.7, y - r * 0.5);
    b.cubicTo(x + r * 0.95, y - r * 0.1, x + r * 0.6, y + r * 0.6, x, y + r * 0.95);
    const path = b.close().build();
    c.drawPath(path, fill('#E5383B'));
    c.drawPath(path, stroke(INK, ow));
    for (const [dx, dy] of [[-0.4, -0.25], [0, -0.3], [0.4, -0.25], [-0.25, 0.1], [0.25, 0.1], [0, 0.45], [-0.45, 0.15], [0.45, 0.15]])
      p.oval(x + dx * r, y + dy * r, r * 0.05, r * 0.08, '#FFE066', false);
    p.shape([[x - r * 0.55, y - r * 0.6], [x - r * 0.2, y - r * 0.95], [x, y - r * 0.68], [x + r * 0.2, y - r * 0.95], [x + r * 0.55, y - r * 0.6], [x, y - r * 0.5]], '#38B000');
  } else {
    // fish
    p.shape([[x + r * 0.45, y], [x + r * 0.98, y - r * 0.5], [x + r * 0.98, y + r * 0.5]], '#FF9F1C');
    p.oval(x - r * 0.15, y, r * 0.7, r * 0.48, '#FF9F1C');
    p.line(x + r * 0.1, y - r * 0.38, x + r * 0.1, y + r * 0.38, ow * 0.8);
    p.circle(x - r * 0.5, y - r * 0.1, r * 0.11, '#FFFFFF');
    p.circle(x - r * 0.5, y - r * 0.1, r * 0.05, INK, false);
  }
}

// ---------------------------------------------------------------------------
// The things in the crowd. Each stands at (x, y) and is `s` tall.
// ---------------------------------------------------------------------------

function drawPerson(p: Pen, t: Thing) {
  const { x, y, s: h, pose, flip } = t;
  const [shirt, pants, skin, hair, extra] = t.colors;
  const dir = flip ? -1 : 1;
  const armUp = pose < 0.25;
  const dress = pose > 0.82;
  const hat = pose > 0.5 && pose < 0.62;
  const balloon = pose > 0.62 && pose < 0.7;
  // legs
  p.limb(x - h * 0.08, y - h * 0.34, x - h * 0.09, y - h * 0.03, h * 0.1, pants);
  p.limb(x + h * 0.08, y - h * 0.34, x + h * 0.09, y - h * 0.03, h * 0.1, pants);
  // arms
  const sy = y - h * 0.66;
  if (armUp) {
    p.limb(x - h * 0.16, sy, x - h * 0.3, y - h * 0.95, h * 0.08, skin);
    p.limb(x + h * 0.16, sy, x + h * 0.3, y - h * 0.95, h * 0.08, skin);
  } else {
    p.limb(x - h * 0.16, sy, x - h * 0.27, y - h * 0.4, h * 0.08, skin);
    p.limb(x + h * 0.16, sy, x + h * 0.27, y - h * 0.4, h * 0.08, skin);
  }
  if (balloon) {
    p.line(x + dir * h * 0.27, y - h * 0.4, x + dir * h * 0.42, y - h * 1.15, Math.max(1, h * 0.02));
    p.oval(x + dir * h * 0.42, y - h * 1.27, h * 0.13, h * 0.15, extra);
  }
  // body
  if (dress) p.shape([[x - h * 0.17, y - h * 0.72], [x + h * 0.17, y - h * 0.72], [x + h * 0.26, y - h * 0.3], [x - h * 0.26, y - h * 0.3]], shirt);
  else p.box(x - h * 0.19, y - h * 0.73, h * 0.38, h * 0.42, h * 0.1, shirt);
  // head
  p.circle(x, y - h * 0.86, h * 0.15, hair);
  p.circle(x + dir * h * 0.01, y - h * 0.83, h * 0.125, skin, false);
  p.circle(x + dir * h * 0.05, y - h * 0.84, h * 0.018, INK, false);
  p.circle(x - dir * h * 0.03, y - h * 0.84, h * 0.018, INK, false);
  if (hat) {
    p.oval(x, y - h * 0.94, h * 0.22, h * 0.05, extra);
    p.box(x - h * 0.12, y - h * 1.07, h * 0.24, h * 0.13, h * 0.05, extra);
  }
}

function drawAnimal(p: Pen, t: Thing) {
  const { x, y, s, flip } = t;
  const dir = flip ? -1 : 1;
  const [fur, patch] = t.colors;
  if (t.kind === 'dog') {
    for (const dx of [-0.4, -0.2, 0.25, 0.42]) p.limb(x + dx * s, y - s * 0.4, x + dx * s, y - s * 0.05, s * 0.12, fur);
    p.line(x - dir * s * 0.55, y - s * 0.55, x - dir * s * 0.8, y - s * 0.85, s * 0.08, INK);
    p.oval(x, y - s * 0.5, s * 0.6, s * 0.24, fur);
    p.oval(x - dir * s * 0.15, y - s * 0.55, s * 0.18, s * 0.12, patch, false);
    p.circle(x + dir * s * 0.58, y - s * 0.75, s * 0.22, fur);
    p.oval(x + dir * s * 0.45, y - s * 0.72, s * 0.08, s * 0.16, patch);
    p.circle(x + dir * s * 0.78, y - s * 0.72, s * 0.05, INK, false);
    p.circle(x + dir * s * 0.62, y - s * 0.8, s * 0.035, INK, false);
  } else if (t.kind === 'cat') {
    for (const dx of [-0.35, 0.3]) p.limb(x + dx * s, y - s * 0.35, x + dx * s, y - s * 0.05, s * 0.12, fur);
    p.line(x - dir * s * 0.5, y - s * 0.4, x - dir * s * 0.65, y - s * 0.95, s * 0.09, INK);
    p.oval(x, y - s * 0.42, s * 0.5, s * 0.22, fur);
    p.shape([[x + dir * s * 0.32, y - s * 0.85], [x + dir * s * 0.38, y - s * 1.08], [x + dir * s * 0.5, y - s * 0.9]], fur);
    p.shape([[x + dir * s * 0.55, y - s * 0.9], [x + dir * s * 0.68, y - s * 1.08], [x + dir * s * 0.72, y - s * 0.85]], fur);
    p.circle(x + dir * s * 0.52, y - s * 0.72, s * 0.22, fur);
    p.circle(x + dir * s * 0.6, y - s * 0.75, s * 0.035, INK, false);
  } else if (t.kind === 'duck') {
    p.oval(x, y - s * 0.32, s * 0.5, s * 0.28, fur);
    p.circle(x + dir * s * 0.32, y - s * 0.72, s * 0.2, fur);
    p.shape([[x + dir * s * 0.48, y - s * 0.75], [x + dir * s * 0.72, y - s * 0.68], [x + dir * s * 0.48, y - s * 0.62]], '#FB8500');
    p.circle(x + dir * s * 0.36, y - s * 0.77, s * 0.04, INK, false);
  } else {
    // a pigeon or a gull
    p.oval(x, y - s * 0.4, s * 0.5, s * 0.3, fur);
    p.shape([[x - dir * s * 0.1, y - s * 0.5], [x - dir * s * 0.6, y - s * 0.75], [x - dir * s * 0.45, y - s * 0.35]], fur);
    p.circle(x + dir * s * 0.42, y - s * 0.72, s * 0.2, fur);
    p.shape([[x + dir * s * 0.58, y - s * 0.76], [x + dir * s * 0.8, y - s * 0.7], [x + dir * s * 0.58, y - s * 0.64]], '#FFB703');
    p.circle(x + dir * s * 0.46, y - s * 0.76, s * 0.05, INK, false);
  }
}

function drawThing(c: SkCanvas, p: Pen, t: Thing) {
  const { x, y, s } = t;
  const [a, b, d] = t.colors;
  switch (t.kind) {
    case 'person':
      return drawPerson(p, t);
    case 'dog':
    case 'cat':
    case 'duck':
    case 'bird':
      return drawAnimal(p, t);
    case 'swimmer': {
      p.oval(x, y - s * 0.3, s * 0.55, s * 0.18, d);
      p.oval(x, y - s * 0.3, s * 0.32, s * 0.08, '#7EC8E3', false);
      p.circle(x, y - s * 0.5, s * 0.24, b);
      p.circle(x, y - s * 0.46, s * 0.2, a, false);
      p.limb(x + s * 0.25, y - s * 0.4, x + s * 0.45, y - s * 0.85, s * 0.1, a);
      return;
    }
    case 'tree': {
      p.box(x - s * 0.07, y - s * 0.5, s * 0.14, s * 0.5, s * 0.03, '#8B5A2B');
      p.circle(x - s * 0.22, y - s * 0.6, s * 0.24, a);
      p.circle(x + s * 0.22, y - s * 0.62, s * 0.24, a);
      p.circle(x, y - s * 0.78, s * 0.27, b);
      if (d) for (const [dx, dy] of [[-0.2, -0.65], [0.15, -0.85], [0.25, -0.58], [-0.05, -0.7]]) p.circle(x + dx * s, y + dy * s, s * 0.035, d, false);
      return;
    }
    case 'pine': {
      p.box(x - s * 0.05, y - s * 0.25, s * 0.1, s * 0.25, s * 0.02, '#7F5539');
      for (const [top, base, half] of [[0.45, 0.2, 0.35], [0.7, 0.42, 0.28], [1, 0.64, 0.2]])
        p.shape([[x, y - s * top], [x + s * half, y - s * base], [x - s * half, y - s * base]], a);
      return;
    }
    case 'bush': {
      p.circle(x - s * 0.45, y - s * 0.36, s * 0.38, a);
      p.circle(x + s * 0.45, y - s * 0.36, s * 0.38, a);
      p.circle(x, y - s * 0.52, s * 0.46, a);
      if (b) for (const [dx, dy] of [[-0.5, -0.4], [0.1, -0.7], [0.5, -0.3], [-0.1, -0.35]]) p.circle(x + dx * s, y + dy * s, s * 0.07, b);
      return;
    }
    case 'flower': {
      p.limb(x, y, x, y - s * 0.6, s * 0.07, '#38B000');
      p.oval(x + s * 0.12, y - s * 0.3, s * 0.12, s * 0.06, '#38B000');
      const cy = y - s * 0.75;
      for (let i = 0; i < 5; i++) {
        const ang = (i * 2 * Math.PI) / 5 + t.pose;
        p.circle(x + Math.cos(ang) * s * 0.15, cy + Math.sin(ang) * s * 0.15, s * 0.12, a);
      }
      p.circle(x, cy, s * 0.09, b);
      return;
    }
    case 'bench': {
      p.limb(x - s * 0.85, y - s * 0.4, x - s * 0.85, y, s * 0.1, '#5D4037');
      p.limb(x + s * 0.85, y - s * 0.4, x + s * 0.85, y, s * 0.1, '#5D4037');
      p.box(x - s * 1.1, y - s, s * 2.2, s * 0.25, s * 0.06, a);
      p.box(x - s * 1.1, y - s * 0.55, s * 2.2, s * 0.2, s * 0.06, a);
      return;
    }
    case 'lamp': {
      p.limb(x, y, x, y - s * 0.85, s * 0.05, a);
      p.box(x - s * 0.1, y - s, s * 0.2, s * 0.17, s * 0.05, '#FFF3B0');
      p.box(x - s * 0.06, y - s * 0.03, s * 0.12, s * 0.03, 0, a);
      return;
    }
    case 'house': {
      const half = s * 0.42;
      p.box(x - half, y - s * 0.62, half * 2, s * 0.62, 0, a);
      p.box(x + half * 0.4, y - s * 0.98, s * 0.1, s * 0.25, 0, '#9C6644');
      p.shape([[x - half - s * 0.07, y - s * 0.6], [x, y - s], [x + half + s * 0.07, y - s * 0.6]], b);
      p.box(x - s * 0.08, y - s * 0.28, s * 0.16, s * 0.28, s * 0.03, d);
      for (const [dx, dy] of [[-0.25, -0.5], [0.13, -0.5], [-0.25, -0.3], [0.17, -0.3]]) p.box(x + dx * s, y + dy * s, s * 0.12, s * 0.12, s * 0.02, '#BDE0FE');
      return;
    }
    case 'car': {
      p.box(x - s * 0.55, y - s, s * 1.1, s * 0.5, s * 0.18, a);
      p.box(x - s * 0.42, y - s * 0.9, s * 0.38, s * 0.3, s * 0.06, '#BDE0FE');
      p.box(x + s * 0.04, y - s * 0.9, s * 0.38, s * 0.3, s * 0.06, '#BDE0FE');
      p.box(x - s, y - s * 0.6, s * 2, s * 0.42, s * 0.16, a);
      p.circle(x + (t.flip ? -0.9 : 0.9) * s, y - s * 0.42, s * 0.07, '#FFE066');
      for (const dx of [-0.55, 0.55]) {
        p.circle(x + dx * s, y - s * 0.17, s * 0.17, '#2B2D42');
        p.circle(x + dx * s, y - s * 0.17, s * 0.07, '#ADB5BD', false);
      }
      return;
    }
    case 'stall': {
      p.limb(x - s * 0.55, y - s * 0.4, x - s * 0.55, y - s * 0.95, s * 0.04, '#6D4C41');
      p.limb(x + s * 0.55, y - s * 0.4, x + s * 0.55, y - s * 0.95, s * 0.04, '#6D4C41');
      p.box(x - s * 0.62, y - s * 0.45, s * 1.24, s * 0.45, s * 0.03, '#C08552');
      for (let i = 0; i < 5; i++) p.circle(x - s * 0.44 + i * s * 0.22, y - s * 0.5, s * 0.09, b);
      for (let i = 0; i < 6; i++) p.box(x - s * 0.66 + i * s * 0.22, y - s, s * 0.22, s * 0.2, 0, i % 2 ? '#FFFFFF' : a);
      for (let i = 0; i < 6; i++) p.circle(x - s * 0.55 + i * s * 0.22, y - s * 0.8, s * 0.11, i % 2 ? '#FFFFFF' : a);
      return;
    }
    case 'umbrella': {
      p.limb(x, y, x, y - s * 0.62, s * 0.035, '#6D4C41');
      const oval = rect(x - s * 0.55, y - s, s * 1.1, s * 0.8);
      const cy = y - s * 0.6;
      for (let i = 0; i < 5; i++) {
        const wedge = Skia.PathBuilder.Make().moveTo(x, cy).arcToOval(oval, 180 + i * 36, 36, false).close().build();
        c.drawPath(wedge, fill(i % 2 ? b : a));
      }
      const dome = Skia.PathBuilder.Make().addArc(oval, 180, 180).close().build();
      c.drawPath(dome, stroke(INK, Math.max(1.4, s * 0.025)));
      return;
    }
    case 'castle': {
      p.box(x - s * 0.62, y - s * 0.55, s * 1.24, s * 0.55, 0, '#E0B867');
      for (const dx of [-0.62, 0.3]) {
        p.box(x + dx * s, y - s * 0.85, s * 0.32, s * 0.85, 0, '#E9C46A');
        p.box(x + dx * s, y - s * 0.95, s * 0.1, s * 0.12, 0, '#E9C46A');
        p.box(x + (dx + 0.22) * s, y - s * 0.95, s * 0.1, s * 0.12, 0, '#E9C46A');
      }
      p.box(x - s * 0.1, y - s * 0.3, s * 0.2, s * 0.3, s * 0.08, '#8B5A2B');
      p.line(x + s * 0.46, y - s * 0.95, x + s * 0.46, y - s * 1.25, Math.max(1, s * 0.04));
      p.shape([[x + s * 0.46, y - s * 1.25], [x + s * 0.72, y - s * 1.17], [x + s * 0.46, y - s * 1.09]], a);
      return;
    }
    case 'crab': {
      for (const dx of [-1, 1]) {
        p.line(x + dx * s * 0.3, y - s * 0.3, x + dx * s * 0.75, y - s * 0.05, s * 0.07);
        p.limb(x + dx * s * 0.35, y - s * 0.5, x + dx * s * 0.6, y - s * 0.85, s * 0.08, a);
        p.circle(x + dx * s * 0.62, y - s * 0.9, s * 0.15, a);
        p.line(x + dx * s * 0.12, y - s * 0.55, x + dx * s * 0.15, y - s * 0.8, s * 0.05);
        p.circle(x + dx * s * 0.15, y - s * 0.82, s * 0.06, '#FFFFFF');
      }
      p.oval(x, y - s * 0.35, s * 0.48, s * 0.3, a);
      return;
    }
    case 'ball': {
      const cy = y - s / 2;
      p.circle(x, cy, s / 2, '#FFFFFF');
      const r = rect(x - s / 2, cy - s / 2, s, s);
      for (const [start, color] of [[t.pose * 360, a], [t.pose * 360 + 120, b]] as const)
        c.drawPath(Skia.PathBuilder.Make().moveTo(x, cy).arcToOval(r, start, 60, false).close().build(), fill(color));
      c.drawCircle(x, cy, s / 2, stroke(INK, Math.max(1.2, s * 0.06)));
      return;
    }
    case 'boat': {
      p.limb(x, y - s * 0.3, x, y - s, s * 0.04, '#6D4C41');
      p.shape([[x + s * 0.04, y - s * 0.95], [x + s * 0.5, y - s * 0.38], [x + s * 0.04, y - s * 0.38]], b);
      p.shape([[x - s * 0.04, y - s * 0.8], [x - s * 0.04, y - s * 0.38], [x - s * 0.36, y - s * 0.38]], '#FFFFFF');
      p.shape([[x - s * 0.6, y - s * 0.35], [x + s * 0.6, y - s * 0.35], [x + s * 0.42, y - s * 0.05], [x - s * 0.42, y - s * 0.05]], a);
      return;
    }
    default:
      return;
  }
}

function drawGround(c: SkCanvas, p: Pen, g: Ground, scene: Scene, ow: number) {
  const { width: w } = scene;
  switch (g.kind) {
    case 'specks':
      for (const [x, y] of g.points) c.drawCircle(x, y, g.r, fill(g.color));
      return;
    case 'path': {
      const [p0, p1, p2, p3] = g.points;
      const path = Skia.PathBuilder.Make().moveTo(p0[0], p0[1]).cubicTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]).build();
      c.drawPath(path, stroke('#C9A66B', g.width + ow * 2));
      c.drawPath(path, stroke('#EBD5A7', g.width));
      return;
    }
    case 'pond':
    case 'fountain': {
      if (g.kind === 'fountain') p.oval(g.cx, g.cy, g.rx, g.ry, '#B0A99F');
      const inner = g.kind === 'fountain' ? 0.82 : 1;
      p.oval(g.cx, g.cy, g.rx * inner, g.ry * inner, '#4FB3E8');
      p.oval(g.cx - g.rx * 0.1, g.cy - g.ry * 0.1, g.rx * 0.7 * inner, g.ry * 0.6 * inner, '#79CBF0', false);
      for (let i = 0; i < 4; i++) {
        const x = g.cx + (i - 1.5) * g.rx * 0.35;
        const y = g.cy + ((i % 2) - 0.5) * g.ry * 0.5;
        c.drawPath(Skia.PathBuilder.Make().addArc(rect(x - g.rx * 0.12, y - g.ry * 0.08, g.rx * 0.24, g.ry * 0.16), 200, 140).build(), stroke('#FFFFFF', Math.max(1.4, ow * 0.8)));
      }
      if (g.kind === 'fountain') {
        p.box(g.cx - g.rx * 0.08, g.cy - g.ry * 0.9, g.rx * 0.16, g.ry * 0.9, g.rx * 0.04, '#B0A99F');
        p.oval(g.cx, g.cy - g.ry * 0.95, g.rx * 0.28, g.ry * 0.14, '#79CBF0');
      }
      return;
    }
    case 'bed': {
      p.oval(g.cx, g.cy, g.rx, g.ry, '#8D5B3C');
      for (let i = 0; i < 9; i++) {
        const ang = i * 2.4;
        c.drawCircle(g.cx + Math.cos(ang) * g.rx * 0.65 * ((i % 3) / 3 + 0.4), g.cy + Math.sin(ang) * g.ry * 0.55, g.ry * 0.22, fill(g.colors[i % 2]));
      }
      return;
    }
    case 'road': {
      c.drawRect(rect(-10, g.y, w + 20, g.height), fill('#5C677D'));
      c.drawRect(rect(-10, g.y - ow, w + 20, ow * 2.5), fill('#ADB5BD'));
      c.drawRect(rect(-10, g.y + g.height - ow, w + 20, ow * 2.5), fill('#ADB5BD'));
      for (let x = 0; x < w; x += g.height * 1.1) c.drawRect(rect(x, g.y + g.height / 2 - ow * 0.7, g.height * 0.55, ow * 1.4), fill('#FFFFFF'));
      return;
    }
    case 'sea': {
      c.drawRect(rect(0, 0, w, g.height), fill('#3FA7D6'));
      c.drawRect(rect(0, g.height * 0.55, w, g.height * 0.45), fill('#59C3E8'));
      const wave = stroke('#FFFFFF', Math.max(1.6, ow));
      for (let y = g.height * 0.15; y < g.height; y += g.height * 0.22)
        for (let x = ((y / 7) % 40) - 40; x < w; x += 46)
          c.drawPath(Skia.PathBuilder.Make().addArc(rect(x, y, 22, 10), 200, 140).build(), wave);
      c.drawRect(rect(0, g.height - ow * 1.5, w, ow * 3), fill('#FFFFFF'));
      return;
    }
    case 'towel': {
      c.save();
      c.rotate(-8 + (g.x % 16), g.x, g.y);
      p.box(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h, 4, g.colors[0]);
      for (let i = 1; i < 4; i += 2) c.drawRect(rect(g.x - g.w / 2 + 1, g.y - g.h / 2 + (i * g.h) / 4, g.w - 2, g.h / 8), fill(g.colors[1]));
      c.restore();
      return;
    }
  }
}

/** Records the whole scene into one Skia picture. */
function record(scene: Scene) {
  const recorder = Skia.PictureRecorder();
  const c = recorder.beginRecording(rect(0, 0, scene.width, scene.height));
  const ow = Math.max(1.4, scene.target.size * 0.045);
  const p = pen(c, ow);
  c.drawRect(rect(0, 0, scene.width, scene.height), fill(scene.background));
  if (scene.kind === 'town') {
    // paving stones
    const step = scene.target.size * 0.9;
    const joint = stroke('#D6C7B2', 1.2);
    for (let x = 0; x < scene.width; x += step) c.drawLine(x, 0, x, scene.height, joint);
    for (let y = 0; y < scene.height; y += step) c.drawLine(0, y, scene.width, y, joint);
  }
  for (const g of scene.ground) drawGround(c, p, g, scene, ow);
  for (const t of scene.things) {
    if (t.kind === 'target') drawTarget(c, scene.target.name, scene.target.x, scene.target.y, scene.target.size);
    else drawThing(c, p, t);
  }
  return recorder.finishRecordingAsPicture();
}

export function SpySceneCanvas({ scene }: { scene: Scene }) {
  const picture = useMemo(() => record(scene), [scene]);
  return (
    <Canvas style={{ width: scene.width, height: scene.height }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

/** The thing to look for, drawn the same way as in the picture, for the question at the top. */
export function SpyTargetIcon({ name, size }: { name: string; size: number }) {
  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const c = recorder.beginRecording(rect(0, 0, size, size));
    drawTarget(c, name, size / 2, size / 2, size * 0.9);
    return recorder.finishRecordingAsPicture();
  }, [name, size]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
