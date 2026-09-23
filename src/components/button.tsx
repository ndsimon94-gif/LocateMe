import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function Button({ label, variant = 'primary', loading, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'primary' ? theme.accent : variant === 'danger' ? theme.danger : 'transparent';
  // backgroundElement is the app's "on-paper card" tone, which happens to be
  // the correct high-contrast text color against both accent and danger in
  // both themes (each pair flips lightness together) — reused here rather
  // than adding a redundant token.
  const textColor =
    variant === 'primary' || variant === 'danger' ? theme.backgroundElement : theme.text;
  const elevated = variant === 'primary' || variant === 'danger';

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        elevated && styles.elevated,
        elevated && { shadowColor: backgroundColor },
        {
          backgroundColor,
          borderColor: theme.line,
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: variant === 'ghost' ? theme.textSecondary : textColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
