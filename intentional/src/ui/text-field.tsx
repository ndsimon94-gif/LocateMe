import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, MIN_TOUCH, radius, space, type as typeScale } from '@/theme/tokens';

import { Text } from './text';

export const TextField = forwardRef<TextInput, TextInputProps & { label: string }>(function TextField(
  { label, style, multiline, ...rest },
  ref,
) {
  return (
    <View style={styles.wrap}>
      <Text variant="label" muted>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...rest}
        style={[styles.input, multiline && styles.multiline, style]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    ...typeScale.body,
    color: colors.text,
    minHeight: MIN_TOUCH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
