import { Platform } from 'react-native';

/** A bright, friendly palette. The app always uses its light, colorful look. */
export const Colors = {
  text: '#3B2A5C',
  textSoft: '#6E5E8C',
  background: '#FFF6FB',
  card: '#FFFFFF',
  purple: '#9B6DE3',
  purpleDark: '#6F45C4',
  pink: '#FF7EB6',
  yellow: '#FFD23F',
  green: '#3CC47C',
  blue: '#4D9DE0',
  orange: '#FF9F43',
  sky: '#DDF1FF',
  shadow: 'rgba(80, 40, 120, 0.18)',
  white: '#FFFFFF',
};

export const Fonts = {
  regular: 'Fredoka_500Medium',
  bold: 'Fredoka_600SemiBold',
  heavy: 'Fredoka_700Bold',
};

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

/** Smallest comfortable tap target for little fingers. */
export const MIN_TAP = 64;

export const cardShadow = Platform.select({
  default: { boxShadow: `0 6px 16px ${Colors.shadow}` },
});
