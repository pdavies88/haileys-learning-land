import { Text, type TextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type Props = TextProps & { size?: number; weight?: keyof typeof Fonts; color?: string };

/** Text in the app's rounded, friendly font. */
export function Txt({ size = 22, weight = 'bold', color = Colors.text, style, ...rest }: Props) {
  return (
    <Text
      allowFontScaling={false}
      style={[{ fontFamily: Fonts[weight], fontSize: size, color, lineHeight: Math.round(size * 1.25) }, style]}
      {...rest}
    />
  );
}
