/**
 * How to write each letter and digit, stroke by stroke, in the order children are taught (a
 * ball-and-stick print style: start at the top, pull down, circle back around).
 *
 * Each shape is a list of strokes, each an SVG path drawn in the direction the pen moves. The grid
 * is the one on handwriting paper: y 0 is the top line, 50 the dashed middle line, 100 the
 * baseline and 145 the bottom of a tail (g, j, p, q, y). `w` is the shape's width. A stroke that
 * goes nowhere (the dot of an i) is a dot: one tap on it is enough.
 */
export type Glyph = { w: number; strokes: string[] };

export const TOP = 0;
export const MIDDLE = 50;
export const BASELINE = 100;
export const TAIL = 145;

export const UPPER: Record<string, Glyph> = {
  A: { w: 80, strokes: ['M40 0 L0 100', 'M40 0 L80 100', 'M16 62 L64 62'] },
  B: { w: 62, strokes: ['M0 0 L0 100', 'M0 0 L32 0 C62 0 62 50 32 50 L0 50', 'M0 50 L36 50 C68 50 68 100 36 100 L0 100'] },
  C: { w: 74, strokes: ['M72 20 A40 50 0 1 0 72 80'] },
  D: { w: 68, strokes: ['M0 0 L0 100', 'M0 0 L22 0 C80 0 80 100 22 100 L0 100'] },
  E: { w: 58, strokes: ['M0 0 L0 100', 'M0 0 L58 0', 'M0 50 L48 50', 'M0 100 L58 100'] },
  F: { w: 56, strokes: ['M0 0 L0 100', 'M0 0 L56 0', 'M0 50 L46 50'] },
  G: { w: 78, strokes: ['M72 20 A40 50 0 1 0 78 62 L48 62'] },
  H: { w: 64, strokes: ['M0 0 L0 100', 'M64 0 L64 100', 'M0 50 L64 50'] },
  I: { w: 40, strokes: ['M20 0 L20 100', 'M0 0 L40 0', 'M0 100 L40 100'] },
  J: { w: 52, strokes: ['M46 0 L46 72 A23 28 0 0 1 0 76'] },
  K: { w: 60, strokes: ['M0 0 L0 100', 'M60 0 L0 52 L60 100'] },
  L: { w: 54, strokes: ['M0 0 L0 100 L54 100'] },
  M: { w: 84, strokes: ['M0 0 L0 100', 'M0 0 L42 70 L84 0', 'M84 0 L84 100'] },
  N: { w: 66, strokes: ['M0 0 L0 100', 'M0 0 L66 100', 'M66 0 L66 100'] },
  O: { w: 80, strokes: ['M40 0 A40 50 0 1 0 40 100 A40 50 0 1 0 40 0'] },
  P: { w: 60, strokes: ['M0 0 L0 100', 'M0 0 L30 0 C62 0 62 54 30 54 L0 54'] },
  Q: { w: 80, strokes: ['M40 0 A40 50 0 1 0 40 100 A40 50 0 1 0 40 0', 'M46 68 L80 104'] },
  R: { w: 62, strokes: ['M0 0 L0 100', 'M0 0 L30 0 C62 0 62 54 30 54 L0 54', 'M28 54 L62 100'] },
  S: { w: 60, strokes: ['M56 14 C48 -2 6 -4 6 24 C6 48 56 46 56 74 C56 104 8 106 2 84'] },
  T: { w: 64, strokes: ['M0 0 L64 0', 'M32 0 L32 100'] },
  U: { w: 64, strokes: ['M0 0 L0 66 A32 34 0 0 0 64 66 L64 0'] },
  V: { w: 74, strokes: ['M0 0 L37 100 L74 0'] },
  W: { w: 104, strokes: ['M0 0 L26 100 L52 30 L78 100 L104 0'] },
  X: { w: 66, strokes: ['M0 0 L66 100', 'M66 0 L0 100'] },
  Y: { w: 70, strokes: ['M0 0 L35 50', 'M70 0 L35 50 L35 100'] },
  Z: { w: 64, strokes: ['M0 0 L64 0 L0 100 L64 100'] },
};

// The round part of a, d, g and q: start at its right side, circle back around to the left.
const BOWL = 'M48 62 A24 25 0 1 0 48 88';

export const LOWER: Record<string, Glyph> = {
  a: { w: 50, strokes: [BOWL, 'M48 50 L48 100'] },
  b: { w: 52, strokes: ['M0 0 L0 100', 'M0 64 C18 42 52 46 52 75 C52 104 18 108 0 88'] },
  c: { w: 48, strokes: ['M46 58 A24 25 0 1 0 46 92'] },
  d: { w: 50, strokes: [BOWL, 'M48 0 L48 100'] },
  e: { w: 50, strokes: ['M4 75 L48 75 C48 40 2 40 2 74 C2 104 38 106 48 90'] },
  f: { w: 40, strokes: ['M38 8 C30 -4 14 -2 14 18 L14 100', 'M0 50 L34 50'] },
  g: { w: 50, strokes: [BOWL, 'M48 50 L48 124 C48 150 10 150 2 132'] },
  h: { w: 50, strokes: ['M0 0 L0 100', 'M0 68 C8 46 48 44 48 70 L48 100'] },
  i: { w: 20, strokes: ['M10 50 L10 100', 'M10 28'] },
  j: { w: 32, strokes: ['M28 50 L28 124 C28 150 2 148 -4 132', 'M28 28'] },
  k: { w: 48, strokes: ['M0 0 L0 100', 'M44 50 L2 76 L46 100'] },
  l: { w: 12, strokes: ['M6 0 L6 100'] },
  m: { w: 78, strokes: ['M0 50 L0 100', 'M0 66 C6 46 38 44 38 66 L38 100', 'M38 66 C44 46 76 44 76 66 L76 100'] },
  n: { w: 50, strokes: ['M0 50 L0 100', 'M0 68 C8 46 48 44 48 70 L48 100'] },
  o: { w: 50, strokes: ['M25 50 A24 25 0 1 0 25 100 A24 25 0 1 0 25 50'] },
  p: { w: 52, strokes: ['M0 50 L0 145', 'M0 64 C18 42 52 46 52 75 C52 104 18 108 0 88'] },
  q: { w: 50, strokes: [BOWL, 'M48 50 L48 145'] },
  r: { w: 38, strokes: ['M0 50 L0 100', 'M0 68 C8 50 26 46 38 54'] },
  s: { w: 42, strokes: ['M40 57 C34 46 4 46 4 62 C4 76 40 72 40 88 C40 104 6 104 2 92'] },
  t: { w: 36, strokes: ['M16 10 L16 100', 'M0 50 L34 50'] },
  u: { w: 50, strokes: ['M0 50 L0 80 C0 104 48 104 48 80', 'M48 50 L48 100'] },
  v: { w: 52, strokes: ['M0 50 L26 100 L52 50'] },
  w: { w: 78, strokes: ['M0 50 L19 100 L39 62 L59 100 L78 50'] },
  x: { w: 48, strokes: ['M0 50 L48 100', 'M48 50 L0 100'] },
  y: { w: 52, strokes: ['M0 50 L26 100', 'M52 50 L14 145'] },
  z: { w: 48, strokes: ['M0 50 L48 50 L0 100 L48 100'] },
};

export const DIGITS: Record<string, Glyph> = {
  '0': { w: 56, strokes: ['M28 0 A28 50 0 1 0 28 100 A28 50 0 1 0 28 0'] },
  '1': { w: 36, strokes: ['M6 20 L28 0 L28 100'] },
  '2': { w: 58, strokes: ['M4 24 C6 -6 56 -6 54 26 C52 50 6 80 2 100 L58 100'] },
  '3': { w: 56, strokes: ['M6 12 C20 -6 54 -2 50 24 C47 44 30 48 22 48 C36 48 56 56 54 76 C52 104 12 106 2 88'] },
  '4': { w: 58, strokes: ['M40 0 L0 66 L58 66', 'M40 0 L40 100'] },
  '5': { w: 56, strokes: ['M8 0 L4 46 C22 30 56 36 54 68 C52 104 12 104 2 88', 'M8 0 L52 0'] },
  '6': { w: 54, strokes: ['M48 6 C30 -6 4 10 2 56 C0 104 52 106 52 70 C52 40 10 40 3 64'] },
  '7': { w: 56, strokes: ['M0 0 L56 0 L18 100'] },
  '8': { w: 54, strokes: ['M48 16 C42 -4 6 -2 6 22 C6 46 52 50 52 76 C52 104 2 104 2 76 C2 50 48 46 48 16'] },
  '9': { w: 54, strokes: ['M50 24 C50 -6 2 -6 2 24 C2 52 50 52 50 24', 'M50 24 L50 100'] },
};

/** The glyph for one character, or null if there is none. */
export function glyphFor(char: string): Glyph | null {
  return UPPER[char] ?? LOWER[char] ?? DIGITS[char] ?? null;
}
