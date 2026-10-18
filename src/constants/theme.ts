import { Platform } from 'react-native';

/** A bright, friendly palette with deeper inks. The app always uses its light, colorful look. */
export const Colors = {
  text: '#2A1E4F',
  textSoft: '#6B6390',
  background: '#F6F3FF',
  card: '#FFFFFF',
  line: 'rgba(42, 30, 79, 0.08)',
  purple: '#8B5CF6',
  purpleDark: '#5B32C8',
  pink: '#FF5FA2',
  yellow: '#FFC93C',
  green: '#22C17A',
  blue: '#3B8EF0',
  orange: '#FF8A3D',
  teal: '#14B8A6',
  sky: '#DDF1FF',
  shadow: 'rgba(60, 30, 120, 0.16)',
  white: '#FFFFFF',
};

export const Fonts = {
  regular: 'Fredoka_500Medium',
  bold: 'Fredoka_600SemiBold',
  heavy: 'Fredoka_700Bold',
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const Radius = { sm: 14, md: 22, lg: 28, xl: 36 };

/** Smallest comfortable tap target for little fingers. */
export const MIN_TAP = 64;

/** A soft, layered shadow that lifts cards off the page. */
export const cardShadow = Platform.select({
  default: { boxShadow: `0 2px 4px rgba(60, 30, 120, 0.06), 0 10px 24px ${Colors.shadow}` },
});

/**
 * A chunky "3D" edge under a button, like a toy key. `edge` is a darker shade of the button color.
 * The button sinks into the edge when pressed (see Bouncy).
 */
export function raised(edge: string, depth = 6) {
  return { boxShadow: `0 ${depth}px 0 ${edge}, 0 ${depth + 8}px 20px rgba(60, 30, 120, 0.18)` };
}

/** A diagonal gradient between two colors. Falls back to the first color where gradients aren't drawn. */
export function gradient(from: string, to: string, angle = 160) {
  return { backgroundColor: from, experimental_backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` };
}

/** Darkens (negative) or lightens (positive) a #RRGGBB color by `amount` (-1 to 1). */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
