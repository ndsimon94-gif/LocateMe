import { Text as RNText, type TextProps } from 'react-native';

import { colors, type as typeScale } from '@/theme/tokens';

type Variant = keyof typeof typeScale;

export function Text({ variant = 'body', muted, style, ...rest }: TextProps & { variant?: Variant; muted?: boolean }) {
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color: muted ? colors.textMuted : colors.text }, variant === 'label' && { textTransform: 'uppercase' }, style]}
    />
  );
}
