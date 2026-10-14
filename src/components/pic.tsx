import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { PICTURE_FILES } from '@/content/picture-files';

/** One of the app's pictures (Noto Emoji artwork), by name. */
export function Pic({ name, size, style }: { name: string; size: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={PICTURE_FILES[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
