import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TOUCH, radius, space } from '@/theme/tokens';

import { Text } from './text';

type Tone = 'primary' | 'secondary' | 'quiet' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function Button({ label, onPress, tone = 'primary', disabled, accessibilityHint, style, compact }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={compact ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        styles[tone],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text variant="heading" style={[styles.label, { color: tone === 'primary' ? colors.onAccent : tone === 'danger' ? colors.danger : colors.accent }, compact && styles.compactLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 36, paddingHorizontal: space.md },
  compactLabel: { fontSize: 14 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.accentSoft },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  label: { textAlign: 'center' },
});
