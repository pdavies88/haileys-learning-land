/**
 * The busy picture for I spy: one of ten drawn places (a park, a town square, a beach, a farm, a
 * forest, a snowy hill, a playground, a garden, the bottom of the sea or a campsite), crowded with
 * drawn people, animals and things, with one small target hidden somewhere in it.
 *
 * This file only decides what goes where. `src/components/spy-scene.tsx` draws it with Skia. Keeping
 * the layout as plain data means it can be tested without a screen, and the same seed gives the
 * same picture, so turning the tablet re-lays the picture without changing the round.
 */

export type SceneKind = 'park' | 'town' | 'beach' | 'farm' | 'forest' | 'snow' | 'playground' | 'garden' | 'ocean' | 'camp';
export const SCENE_KINDS: SceneKind[] = ['park', 'town', 'beach', 'farm', 'forest', 'snow', 'playground', 'garden', 'ocean', 'camp'];

export type ThingKind =
  | 'person' | 'tree' | 'pine' | 'bush' | 'flower' | 'dog' | 'cat' | 'duck' | 'bird' | 'bench' | 'lamp'
  | 'house' | 'car' | 'stall' | 'umbrella' | 'castle' | 'crab' | 'ball' | 'boat' | 'swimmer'
  | 'barn' | 'cow' | 'pig' | 'sheep' | 'chicken' | 'hay' | 'tractor'
  | 'mushroom' | 'rabbit' | 'fox' | 'log' | 'rock'
  | 'snowman' | 'sled' | 'slide' | 'swing'
  | 'sunflower' | 'butterfly' | 'gnome'
  | 'seafish' | 'coral' | 'seaweed' | 'shell' | 'turtle' | 'jellyfish'
  | 'tent' | 'campfire' | 'canoe'
  | 'target';

/** One drawn thing. (x, y) is where it stands: the middle of its bottom edge. `s` is its height. */
export type Thing = { kind: ThingKind; x: number; y: number; s: number; colors: string[]; flip: boolean; pose: number };

/** Flat things on the ground, drawn first and never in front of anything. */
export type Ground =
  | { kind: 'path'; points: [number, number][]; width: number }
  | { kind: 'pond' | 'fountain' | 'bed' | 'ice'; cx: number; cy: number; rx: number; ry: number; colors: string[] }
  /** A flat patch: a sandpit, or a field of crops when `rows` is set. */
  | { kind: 'patch'; x: number; y: number; w: number; h: number; colors: string[]; rows?: boolean }
  | { kind: 'seabed'; height: number }
  | { kind: 'road'; y: number; height: number }
  | { kind: 'sea'; height: number }
  | { kind: 'towel'; x: number; y: number; w: number; h: number; colors: string[] }
  | { kind: 'specks'; points: [number, number][]; r: number; color: string };

export type Target = { name: string; x: number; y: number; size: number };

export type Scene = {
  kind: SceneKind;
  width: number;
  height: number;
  background: string;
  ground: Ground[];
  /** In drawing order: things further down the picture stand in front. Includes the target. */
  things: Thing[];
  /** Where the target is drawn: (x, y) is its middle. */
  target: Target;
};

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const SHIRTS = ['#E63946', '#3A86FF', '#8338EC', '#FFBE0B', '#06D6A0', '#FB5607', '#FF6FB5', '#2EC4B6', '#5E60CE', '#FFFFFF', '#F4A261', '#90BE6D', '#FFD23F', '#118AB2'];
const PANTS = ['#264653', '#1D3557', '#6D597A', '#3D405B', '#7F5539', '#2B2D42', '#457B9D', '#BC4749'];
const SKIN = ['#FFDBC4', '#F9D3B4', '#E8B48A', '#C68863', '#8D5524', '#A86B4C'];
const HAIR = ['#2B1B10', '#6B3E1E', '#E3B23C', '#C1440E', '#151515', '#9A9A9A', '#F2D16B'];
const GREENS = ['#3C9D4E', '#5DBB63', '#2E7D32', '#7CC576', '#4CAF50'];
const PETALS = ['#FF5D8F', '#FFD23F', '#FFFFFF', '#B388EB', '#FF8C42', '#EF476F'];
const WALLS = ['#F4D35E', '#EE964B', '#F7EDE2', '#A8DADC', '#F28482', '#CDB4DB', '#B5E48C', '#FFAFCC'];
const ROOFS = ['#9D0208', '#3D405B', '#6A4C93', '#BC6C25', '#264653', '#E76F51'];
const ANIMALS = ['#8D6E63', '#F4E1C1', '#3E2723', '#D7A86E', '#FFFFFF', '#5D4037', '#E0E0E0'];
const BRIGHTS = ['#E63946', '#3A86FF', '#FFBE0B', '#06D6A0', '#FB5607', '#FF6FB5', '#8338EC', '#FFFFFF'];
// Sea fish are never the orange of the fish she is looking for.
const FISH = ['#3A86FF', '#FFD23F', '#FF6FB5', '#8338EC', '#06D6A0', '#90E0EF', '#E63946'];
const CORAL = ['#FF6F91', '#FF9671', '#C34A36', '#F9F871', '#B388EB', '#FFC75F'];

// ---------------------------------------------------------------------------
// Randomness that can be repeated
// ---------------------------------------------------------------------------

/** A small seeded random number generator (mulberry32): the same seed gives the same numbers. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = ReturnType<typeof seeded>;
const pick = <T>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const between = (rand: Rand, a: number, b: number) => a + rand() * (b - a);

function weighted<T extends string>(rand: Rand, weights: Partial<Record<T, number>>): T {
  const entries = Object.entries(weights) as [T, number][];
  let roll = rand() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [kind, w] of entries) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return entries[0][0];
}

// ---------------------------------------------------------------------------
// What covers what
// ---------------------------------------------------------------------------

type Box = [number, number, number, number]; // left, top, right, bottom

/** How wide each thing is, compared with its height, for working out what it hides. */
const WIDTH: Record<ThingKind, number> = {
  person: 0.4, tree: 0.9, pine: 0.7, bush: 1.6, flower: 0.6, dog: 1.5, cat: 1.3, duck: 1.2, bird: 1.3,
  bench: 2.2, lamp: 0.3, house: 0.85, car: 2, stall: 1.25, umbrella: 1.1, castle: 1.3, crab: 1.6,
  ball: 1, boat: 1.3, swimmer: 1.2,
  barn: 1, cow: 1.6, pig: 1.5, sheep: 1.4, chicken: 1, hay: 1.4, tractor: 1.5,
  mushroom: 0.9, rabbit: 1, fox: 1.6, log: 2.6, rock: 1.5,
  snowman: 0.65, sled: 2, slide: 1.6, swing: 1.6,
  sunflower: 0.5, butterfly: 1.2, gnome: 0.6,
  seafish: 1.6, coral: 1, seaweed: 0.4, shell: 1.1, turtle: 1.7, jellyfish: 0.8,
  tent: 1.4, campfire: 1.2, canoe: 2.6,
  target: 1,
};

/** The solid parts of a thing: the boxes that hide whatever is behind them. */
export function solidBoxes(t: Thing): Box[] {
  const { x, y, s } = t;
  switch (t.kind) {
    case 'tree':
      return [[x - 0.45 * s, y - s, x + 0.45 * s, y - 0.42 * s], [x - 0.07 * s, y - 0.45 * s, x + 0.07 * s, y]];
    case 'umbrella':
      return [[x - 0.55 * s, y - s, x + 0.55 * s, y - 0.6 * s], [x - 0.03 * s, y - 0.6 * s, x + 0.03 * s, y]];
    case 'lamp':
      return [[x - 0.15 * s, y - s, x + 0.15 * s, y - 0.8 * s], [x - 0.04 * s, y - 0.8 * s, x + 0.04 * s, y]];
    case 'flower':
      return [[x - 0.3 * s, y - s, x + 0.3 * s, y - 0.5 * s]];
    case 'sunflower':
      return [[x - 0.25 * s, y - s, x + 0.25 * s, y - 0.55 * s]];
    case 'seaweed':
      return [[x - 0.15 * s, y - s, x + 0.15 * s, y]];
    case 'butterfly':
      // It flies above the spot it is placed at.
      return [[x - 0.6 * s, y - 1.5 * s, x + 0.6 * s, y - 0.5 * s]];
    default: {
      const half = (WIDTH[t.kind] * s) / 2;
      return [[x - half, y - s, x + half, y]];
    }
  }
}

/** Points spread over the target, to measure how much of it shows. */
function targetPoints(target: Target): [number, number][] {
  const points: [number, number][] = [];
  const r = target.size * 0.42;
  for (let i = -4; i <= 4; i++)
    for (let j = -4; j <= 4; j++) {
      const dx = (i / 4) * r;
      const dy = (j / 4) * r;
      if (dx * dx + dy * dy <= r * r) points.push([target.x + dx, target.y + dy]);
    }
  return points;
}

const inside = ([px, py]: [number, number], [l, t, r, b]: Box) => px >= l && px <= r && py >= t && py <= b;

/** How much of the target can be seen, from 0 to 1, given what stands in front of it. */
export function visibleShare(scene: Pick<Scene, 'things' | 'target'>): number {
  const at = scene.things.findIndex((t) => t.kind === 'target');
  const front = scene.things.slice(at + 1).flatMap(solidBoxes);
  const points = targetPoints(scene.target);
  return points.filter((p) => !front.some((box) => inside(p, box))).length / points.length;
}

/** True when a tap at (x, y) lands on the target. Generous, so a small finger always gets it. */
export function hitsTarget(target: Target, x: number, y: number): boolean {
  const reach = target.size * 0.62 + 10;
  return (x - target.x) ** 2 + (y - target.y) ** 2 <= reach * reach;
}

// ---------------------------------------------------------------------------
// Building a scene
// ---------------------------------------------------------------------------

/** The size of the target for a picture this big: small, but never too small to see on a phone. */
export function targetSize(width: number, height: number) {
  return Math.max(34, Math.min(62, Math.min(width, height) * 0.09));
}

type Layout = {
  water: (x: number, y: number, margin?: number) => boolean;
  road: (x: number, y: number) => boolean;
  /** Places nothing ordinary goes: house fronts and the like. */
  reserved: (x: number, y: number) => boolean;
};

/**
 * One busy scene. `round` makes later scenes busier; `seed` picks the layout, so the same seed and
 * size always give the same picture.
 */
export function buildScene(opts: { kind: SceneKind; targetName: string; width: number; height: number; round: number; seed: number }): Scene {
  const { kind, targetName, width: w, height: h, round, seed } = opts;
  const rand = seeded(seed);
  const T = targetSize(w, h);
  const u = T * 1.2; // the height of a grown-up
  const busy = 0.8 + 0.12 * Math.min(round, 6); // later rounds pack more in
  const ground: Ground[] = [];
  const things: Thing[] = [];

  // The playground is mostly children.
  const kids = kind === 'playground' ? 0.65 : 0.3;
  const person = (x: number, y: number, scale = 1): Thing => {
    const child = rand() < kids;
    return {
      kind: 'person', x, y, s: u * scale * (child ? between(rand, 0.62, 0.75) : between(rand, 0.88, 1.08)),
      // shirt, trousers, skin, hair, and an extra colour for a hat or a balloon
      colors: [pick(rand, SHIRTS), pick(rand, PANTS), pick(rand, SKIN), pick(rand, HAIR), pick(rand, BRIGHTS)],
      flip: rand() < 0.5, pose: rand(),
    };
  };
  const make = (k: ThingKind, x: number, y: number): Thing => {
    if (k === 'person') return person(x, y);
    const f = { kind: k, x, y, flip: rand() < 0.5, pose: rand() };
    switch (k) {
      case 'tree': return { ...f, s: u * between(rand, 1.8, 2.3), colors: [pick(rand, GREENS), pick(rand, GREENS), rand() < 0.25 ? pick(rand, ['#E63946', '#FF8C42', '#FFFFFF']) : ''] };
      case 'pine': return { ...f, s: u * between(rand, 1.7, 2.2), colors: [pick(rand, ['#2D6A4F', '#40916C', '#1B4332']), kind === 'snow' ? '#FFFFFF' : ''] };
      case 'bush': return { ...f, s: u * between(rand, 0.55, 0.75), colors: [pick(rand, GREENS), rand() < 0.5 ? pick(rand, PETALS) : ''] };
      case 'flower': return { ...f, s: u * between(rand, 0.35, 0.5), colors: [pick(rand, PETALS), pick(rand, ['#FFD23F', '#FB5607', '#6D4C41'])] };
      case 'dog': return { ...f, s: u * between(rand, 0.38, 0.5), colors: [pick(rand, ANIMALS), pick(rand, ANIMALS), pick(rand, BRIGHTS)] };
      case 'cat': return { ...f, s: u * between(rand, 0.32, 0.4), colors: [pick(rand, ['#FF9F1C', '#3E2723', '#9E9E9E', '#FFFFFF', '#F4E1C1'])] };
      case 'duck': return { ...f, s: u * 0.38, colors: [pick(rand, ['#FFFFFF', '#FFE066', '#8D6E63'])] };
      case 'bird': return { ...f, s: u * 0.24, colors: [kind === 'beach' ? '#FFFFFF' : pick(rand, ['#9E9E9E', '#78909C', '#BDBDBD'])] };
      case 'bench': return { ...f, s: u * 0.45, colors: [pick(rand, ['#A0522D', '#2A9D8F', '#BC4749'])] };
      case 'lamp': return { ...f, s: u * between(rand, 1.5, 1.8), colors: ['#37474F'] };
      case 'car': return { ...f, s: u * 0.62, colors: [pick(rand, BRIGHTS.filter((c) => c !== '#FFFFFF'))] };
      case 'stall': return { ...f, s: u * 1.3, colors: [pick(rand, ['#E63946', '#3A86FF', '#06D6A0', '#8338EC']), pick(rand, ['#FFBE0B', '#FB5607', '#E63946', '#90BE6D'])] };
      case 'umbrella': return { ...f, s: u * between(rand, 1.3, 1.6), colors: [pick(rand, BRIGHTS), pick(rand, BRIGHTS)] };
      case 'castle': return { ...f, s: u * between(rand, 0.5, 0.7), colors: [pick(rand, BRIGHTS)] };
      case 'crab': return { ...f, s: u * 0.28, colors: [pick(rand, ['#E63946', '#FB5607'])] };
      case 'ball': return { ...f, s: u * between(rand, 0.3, 0.4), colors: [pick(rand, BRIGHTS), pick(rand, BRIGHTS)] };
      case 'boat': return { ...f, s: u * between(rand, 1, 1.3), colors: [pick(rand, BRIGHTS), pick(rand, ['#FFFFFF', '#FFBE0B', '#E63946'])] };
      case 'swimmer': return { ...f, s: u * 0.4, colors: [pick(rand, SKIN), pick(rand, HAIR), pick(rand, BRIGHTS)] };
      case 'house': return { ...f, s: u * between(rand, 2.1, 2.6), colors: [pick(rand, WALLS), pick(rand, ROOFS), pick(rand, BRIGHTS)] };
      case 'barn': return { ...f, s: u * between(rand, 2, 2.4), colors: [pick(rand, ['#C1121F', '#BC4749', '#9D0208']), pick(rand, ['#3D405B', '#6D597A', '#7F5539'])] };
      case 'cow': return { ...f, s: u * between(rand, 0.55, 0.65), colors: ['#FFFFFF', pick(rand, ['#2B2D42', '#6D4C41'])] };
      case 'pig': return { ...f, s: u * between(rand, 0.38, 0.45), colors: [pick(rand, ['#FFB3C6', '#FF8FAB', '#F4ACB7'])] };
      case 'sheep': return { ...f, s: u * between(rand, 0.42, 0.5), colors: [pick(rand, ['#FFFFFF', '#F1EDE4', '#E8E2D0'])] };
      case 'chicken': return { ...f, s: u * between(rand, 0.28, 0.34), colors: [pick(rand, ['#FFFFFF', '#D4A373', '#8D5B3C'])] };
      case 'hay': return { ...f, s: u * between(rand, 0.4, 0.5), colors: ['#E9C46A'] };
      case 'tractor': return { ...f, s: u * between(rand, 0.75, 0.85), colors: [pick(rand, ['#2A9D8F', '#E63946', '#3A86FF', '#FFBE0B'])] };
      case 'mushroom': return { ...f, s: u * between(rand, 0.3, 0.42), colors: [pick(rand, ['#E63946', '#C1440E', '#A0522D', '#FFBE0B'])] };
      case 'rabbit': return { ...f, s: u * between(rand, 0.32, 0.4), colors: [pick(rand, ['#FFFFFF', '#D7A86E', '#9E9E9E', '#8D6E63'])] };
      case 'fox': return { ...f, s: u * between(rand, 0.4, 0.46), colors: ['#F77F00'] };
      case 'log': return { ...f, s: u * between(rand, 0.26, 0.34), colors: ['#8B5A2B'] };
      case 'rock': return { ...f, s: u * between(rand, 0.28, 0.4), colors: [pick(rand, ['#9E9E9E', '#ADB5BD', '#8D99AE'])] };
      case 'snowman': return { ...f, s: u * between(rand, 0.85, 1.05), colors: [pick(rand, BRIGHTS.filter((c) => c !== '#FFFFFF'))] };
      case 'sled': return { ...f, s: u * 0.4, colors: [pick(rand, ['#E63946', '#3A86FF', '#8338EC', '#06D6A0'])] };
      case 'slide': return { ...f, s: u * between(rand, 1.2, 1.4), colors: [pick(rand, ['#FFBE0B', '#E63946', '#3A86FF', '#06D6A0'])] };
      case 'swing': return { ...f, s: u * between(rand, 1.4, 1.6), colors: [pick(rand, ['#E63946', '#3A86FF', '#FB5607', '#8338EC'])] };
      case 'sunflower': return { ...f, s: u * between(rand, 0.95, 1.2), colors: ['#FFD23F'] };
      case 'butterfly': return { ...f, s: u * between(rand, 0.24, 0.3), colors: [pick(rand, ['#FF6FB5', '#3A86FF', '#FFBE0B', '#B388EB', '#FB5607']), pick(rand, BRIGHTS)] };
      case 'gnome': return { ...f, s: u * between(rand, 0.45, 0.55), colors: [pick(rand, ['#E63946', '#3A86FF', '#06D6A0']), pick(rand, ['#3A86FF', '#2A9D8F', '#8338EC'])] };
      case 'seafish': return { ...f, s: u * between(rand, 0.26, 0.38), colors: [pick(rand, FISH), pick(rand, FISH)] };
      case 'coral': return { ...f, s: u * between(rand, 0.6, 0.85), colors: [pick(rand, CORAL)] };
      case 'seaweed': return { ...f, s: u * between(rand, 0.8, 1.2), colors: [pick(rand, ['#2A9D8F', '#38B000', '#4CAF50', '#2D6A4F'])] };
      case 'shell': return { ...f, s: u * between(rand, 0.24, 0.32), colors: [pick(rand, ['#FFE5D9', '#FFCAD4', '#F4E1C1', '#FFFFFF'])] };
      case 'turtle': return { ...f, s: u * between(rand, 0.4, 0.5), colors: [pick(rand, ['#2D6A4F', '#40916C', '#606C38'])] };
      case 'jellyfish': return { ...f, s: u * between(rand, 0.5, 0.6), colors: [pick(rand, ['#FFAFCC', '#CDB4DB', '#BDE0FE', '#FFC8DD'])] };
      case 'tent': return { ...f, s: u * between(rand, 0.9, 1.1), colors: [pick(rand, ['#E76F51', '#2A9D8F', '#FFBE0B', '#3A86FF', '#8338EC'])] };
      case 'campfire': return { ...f, s: u * 0.45, colors: [] };
      case 'canoe': return { ...f, s: u * 0.35, colors: [pick(rand, ['#E63946', '#FFBE0B', '#2A9D8F', '#BC6C25'])] };
      default: return { ...f, s: u, colors: [] };
    }
  };

  const specks = (count: number, color: string, r: number) =>
    ground.push({ kind: 'specks', r, color, points: Array.from({ length: count }, () => [rand() * w, rand() * h] as [number, number]) });

  /** A pond (or a frozen one) kept clear of the edges. Returns a test for points inside it. */
  const addPond = (k: 'pond' | 'ice', scale = 1) => {
    const rx = Math.min(w * 0.3, Math.max(T * 2.8, w * 0.2 * scale));
    const ry = Math.min(h * 0.18 * scale, rx * 0.6);
    const g = { kind: k, cx: between(rand, rx + 8, w - rx - 8), cy: between(rand, ry + h * 0.1, h - ry - h * 0.1), rx, ry, colors: [] };
    ground.push(g);
    return (x: number, y: number, m = 0) => ((x - g.cx) / (g.rx - m)) ** 2 + ((y - g.cy) / (g.ry - m)) ** 2 <= 1;
  };
  /** A winding path across the picture, left to right. */
  const addPath = (width: number) => {
    const across = h * between(rand, 0.25, 0.75);
    ground.push({ kind: 'path', width, points: [[-u, across], [w * 0.3, across + between(rand, -1, 1) * u * 2], [w * 0.7, across + between(rand, -1, 1) * u * 2], [w + u, across + between(rand, -1, 1) * u]] });
  };
  const nothing = () => false;

  // Each kind of place lays out its ground first, then says what grows where.
  let layout: Layout;
  let weights: Partial<Record<ThingKind, number>>;
  let background: string;
  let waterThings: Partial<Record<ThingKind, number>> = {};

  if (kind === 'park') {
    background = '#8CCB6A';
    specks(Math.round((w * h) / 900), '#7AB95A', 2.2);
    // Two winding paths: one across, one down.
    const across = h * between(rand, 0.25, 0.75);
    ground.push({ kind: 'path', width: u * 0.85, points: [[-u, across], [w * 0.3, across + between(rand, -1, 1) * u * 2], [w * 0.7, across + between(rand, -1, 1) * u * 2], [w + u, across + between(rand, -1, 1) * u]] });
    const down = w * between(rand, 0.25, 0.75);
    ground.push({ kind: 'path', width: u * 0.7, points: [[down, -u], [down + between(rand, -1, 1) * u * 2, h * 0.35], [down + between(rand, -1, 1) * u * 2, h * 0.7], [down + between(rand, -1, 1) * u, h + u]] });
    // A pond, kept clear of the edges.
    const rx = Math.min(w * 0.3, Math.max(T * 2.8, w * 0.2));
    const ry = Math.min(h * 0.18, rx * 0.6);
    const pond = { kind: 'pond' as const, cx: between(rand, rx + 8, w - rx - 8), cy: between(rand, ry + h * 0.1, h - ry - h * 0.1), rx, ry, colors: [] };
    ground.push(pond);
    for (let i = 0; i < 3; i++) ground.push({ kind: 'bed', cx: rand() * w, cy: rand() * h, rx: u * between(rand, 0.6, 1), ry: u * 0.35, colors: [pick(rand, PETALS), pick(rand, PETALS)] });
    const inPond = (x: number, y: number, m = 0) => ((x - pond.cx) / (pond.rx - m)) ** 2 + ((y - pond.cy) / (pond.ry - m)) ** 2 <= 1;
    layout = { water: inPond, road: () => false, reserved: () => false };
    weights = { person: 40, tree: 7, pine: 3, bush: 12, flower: 14, dog: 7, cat: 3, bench: 4, lamp: 3, ball: 3, bird: 4 };
    waterThings = { duck: 1 };
  } else if (kind === 'town') {
    background = '#E8DCCB';
    // A row of houses along the top, a road across, and a fountain in the square.
    const street = u * 2.3;
    const roadH = u * 1.3;
    const roadY = between(rand, Math.max(street + u * 2, h * 0.5), h - roadH - u * 1.5);
    ground.push({ kind: 'road', y: roadY, height: roadH });
    const fr = Math.max(T * 1.6, Math.min(w, h) * 0.12);
    const fountain = { kind: 'fountain' as const, cx: between(rand, fr + 10, w - fr - 10), cy: between(rand, street + fr + u * 0.5, Math.max(street + fr + u * 0.6, roadY - fr - u * 0.4)), rx: fr, ry: fr * 0.62, colors: [] };
    ground.push(fountain);
    for (let x = -u * 0.5; x < w + u; x += u * between(rand, 1.5, 2)) things.push(make('house', x, street));
    const inFountain = (x: number, y: number, m = 0) => ((x - fountain.cx) / (fountain.rx - m)) ** 2 + ((y - fountain.cy) / (fountain.ry - m)) ** 2 <= 1;
    layout = {
      water: (x, y, m = 0) => inFountain(x, y, m + fountain.rx * 0.18),
      road: (x, y) => y > roadY && y < roadY + roadH,
      reserved: (x, y) => y < street + u * 0.15 || inFountain(x, y),
    };
    weights = { person: 50, tree: 5, bush: 4, flower: 5, dog: 6, cat: 5, bench: 4, lamp: 6, stall: 5, bird: 8, ball: 2 };
  } else if (kind === 'farm') {
    background = '#A7D46F';
    specks(Math.round((w * h) / 900), '#94C25D', 2);
    // Barns along the top, a field of crops and a duck pond.
    const yard = u * 2.2;
    const fw = Math.min(w * 0.45, u * 5);
    ground.push({ kind: 'patch', rows: true, x: between(rand, 0, w - fw), y: between(rand, yard + u, Math.max(yard + u, h - u * 3)), w: fw, h: u * 2, colors: ['#8D5B3C', '#6A994E'] });
    const inPond = addPond('pond', 0.8);
    for (let x = -u * 0.3; x < w + u; x += u * between(rand, 2.4, 3)) things.push(make('barn', x, yard));
    layout = { water: inPond, road: nothing, reserved: (x, y) => y < yard + u * 0.15 || inPond(x, y) };
    weights = { person: 18, cow: 10, pig: 8, sheep: 10, chicken: 12, hay: 6, tractor: 3, tree: 4, dog: 4, cat: 3, flower: 5, bush: 3 };
    waterThings = { duck: 1 };
  } else if (kind === 'forest') {
    background = '#6BA84F';
    specks(Math.round((w * h) / 800), '#5E9944', 2.4);
    addPath(u * 0.7);
    const inPond = addPond('pond', 0.75);
    layout = { water: inPond, road: nothing, reserved: nothing };
    weights = { pine: 16, tree: 10, bush: 12, mushroom: 12, rabbit: 7, fox: 4, log: 6, rock: 5, person: 16, bird: 4, flower: 6 };
    waterThings = { duck: 1 };
  } else if (kind === 'snow') {
    background = '#EEF5FB';
    specks(Math.round((w * h) / 700), '#D6E6F2', 2.2);
    // A frozen pond: people skate on it, so it is ground, not water.
    addPond('ice');
    layout = { water: nothing, road: nothing, reserved: nothing };
    weights = { person: 40, snowman: 12, pine: 12, sled: 6, dog: 6, bird: 3, rock: 3 };
  } else if (kind === 'playground') {
    background = '#9BD27A';
    specks(Math.round((w * h) / 900), '#8BC46A', 2);
    const sw = Math.min(w * 0.4, u * 4);
    ground.push({ kind: 'patch', x: between(rand, 0, w - sw), y: between(rand, u, Math.max(u, h - u * 3)), w: sw, h: u * 2.2, colors: ['#F6DFA1', '#C08552'] });
    addPath(u * 0.8);
    layout = { water: nothing, road: nothing, reserved: nothing };
    weights = { person: 50, slide: 3, swing: 3, ball: 6, bench: 4, tree: 4, bush: 5, dog: 3, bird: 3, flower: 3 };
  } else if (kind === 'garden') {
    background = '#7FBF5F';
    specks(Math.round((w * h) / 900), '#6FAE50', 2);
    addPath(u * 0.6);
    for (let i = 0; i < 2; i++) {
      const fw = Math.min(w * 0.35, u * 4);
      ground.push({ kind: 'patch', rows: true, x: between(rand, 0, w - fw), y: between(rand, 0, h - u * 1.6), w: fw, h: u * 1.6, colors: ['#8D5B3C', '#F77F00'] });
    }
    for (let i = 0; i < 5; i++) ground.push({ kind: 'bed', cx: rand() * w, cy: rand() * h, rx: u * between(rand, 0.6, 1), ry: u * 0.35, colors: [pick(rand, PETALS), pick(rand, PETALS)] });
    layout = { water: nothing, road: nothing, reserved: nothing };
    weights = { flower: 28, sunflower: 10, bush: 12, butterfly: 10, gnome: 4, person: 14, cat: 4, bird: 4, tree: 3 };
  } else if (kind === 'ocean') {
    // Under the sea: everything is in the water, so it is all "ground" for the crowd.
    background = '#2E86C1';
    ground.push({ kind: 'seabed', height: h * 0.2 });
    specks(Math.round((w * h) / 2500), '#7FC8F8', 3);
    layout = { water: nothing, road: nothing, reserved: nothing };
    weights = { seafish: 30, coral: 12, seaweed: 16, rock: 5, shell: 5, turtle: 4, jellyfish: 6, crab: 4 };
  } else if (kind === 'camp') {
    background = '#86B85A';
    specks(Math.round((w * h) / 900), '#77A84D', 2.2);
    addPath(u * 0.6);
    const inLake = addPond('pond', 1.1);
    layout = { water: inLake, road: nothing, reserved: nothing };
    weights = { person: 30, tent: 8, campfire: 3, pine: 14, tree: 6, log: 6, rock: 5, dog: 4, bush: 6, flower: 4, bird: 3 };
    waterThings = { canoe: 2, duck: 1 };
  } else {
    background = '#F6DFA1';
    specks(Math.round((w * h) / 700), '#E9C979', 1.6);
    const sea = h * between(rand, 0.24, 0.3);
    ground.push({ kind: 'sea', height: sea });
    for (let i = 0; i < Math.round((w * h) / (u * u * 14)); i++) {
      const tw = u * between(rand, 0.6, 0.8);
      ground.push({ kind: 'towel', x: rand() * w, y: sea + rand() * (h - sea), w: tw, h: tw * 1.5, colors: [pick(rand, BRIGHTS), pick(rand, BRIGHTS)] });
    }
    layout = { water: (x, y, m = 0) => y < sea - m - u * 0.2, road: () => false, reserved: (x, y) => y < sea + u * 0.1 && y >= sea - u * 0.2 };
    weights = { person: 42, umbrella: 12, castle: 8, crab: 8, ball: 8, dog: 4, bird: 6, bush: 0 };
    waterThings = { boat: 1, swimmer: 2 };
  }

  // Fill the whole picture: one thing per cell of a jittered grid, so nowhere is empty.
  const cell = u / Math.sqrt(busy);
  for (let gy = -cell * 0.3; gy < h + cell * 0.6; gy += cell * 0.85)
    for (let gx = -cell * 0.3; gx < w + cell * 0.3; gx += cell) {
      const x = gx + rand() * cell;
      const y = gy + rand() * cell * 0.85;
      if (layout.reserved(x, y)) continue;
      if (layout.water(x, y)) {
        if (Object.keys(waterThings).length && rand() < 0.35) things.push(make(weighted(rand, waterThings), x, y));
        continue;
      }
      if (layout.road(x, y)) {
        if (rand() < 0.45) things.push(make('car', x, y));
        continue;
      }
      things.push(make(weighted(rand, weights), x, y));
    }

  // Hide the target. Fish swim in the water when there is some; everything else sits on dry land.
  // Under the sea the whole picture is water, so a fish can go anywhere there.
  const swims = targetName === 'fish' && Object.keys(waterThings).length > 0;
  let tx = w / 2;
  let ty = h / 2;
  for (let tries = 0; tries < 400; tries++) {
    tx = between(rand, T * 0.9, w - T * 0.9);
    ty = between(rand, T * 0.9, h - T * 0.9);
    const wet = layout.water(tx, ty, T * 0.6);
    const ok = swims ? wet : !layout.water(tx, ty) && !layout.road(tx, ty) && !layout.road(tx, ty + T / 2) && !layout.reserved(tx, ty);
    if (ok) break;
  }
  const target: Target = { name: targetName, x: tx, y: ty, size: T };
  things.push({ kind: 'target', x: tx, y: ty + T / 2, s: T, colors: [], flip: false, pose: 0 });

  // Tuck it partly behind something: a bush, a person or a sandcastle just in front of one side.
  const side = rand() < 0.5 ? -1 : 1;
  const TUCK: Record<SceneKind, ThingKind> = {
    park: 'bush', town: 'person', beach: 'castle', farm: 'hay', forest: 'bush', snow: 'snowman',
    playground: 'person', garden: 'bush', ocean: 'coral', camp: 'bush',
  };
  const tuckKind: ThingKind = swims ? (kind === 'beach' ? 'swimmer' : 'duck') : TUCK[kind];
  const tuck = make(tuckKind, tx + side * T * 0.85, ty + T * 0.5 + T * 0.35);
  things.push(tuck);

  things.sort((a, b) => a.y - b.y);
  const scene: Scene = { kind, width: w, height: h, background, ground, things, target };

  // Take away whatever hides too much of it, so at least two thirds of it always shows.
  const minShare = round === 0 ? 0.8 : 0.68;
  while (visibleShare(scene) < minShare) {
    const at = scene.things.findIndex((t) => t.kind === 'target');
    const points = targetPoints(target);
    let worst = -1;
    let most = 0;
    scene.things.forEach((t, i) => {
      if (i <= at) return;
      const covered = points.filter((p) => solidBoxes(t).some((box) => inside(p, box))).length;
      if (covered > most) [worst, most] = [i, covered];
    });
    if (worst < 0) break;
    scene.things.splice(worst, 1);
  }
  return scene;
}
