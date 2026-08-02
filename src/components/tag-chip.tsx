import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type TagChipProps = {
  label: string;
  onPress?: () => void;
  variant?: 'default' | 'add';
};

export function TagChip({ label, onPress, variant = 'default' }: TagChipProps) {
  const theme = useTheme();
  const isAdd = variant === 'add';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: isAdd ? theme.accent : theme.line,
          borderStyle: isAdd ? 'dashed' : 'solid',
          backgroundColor: isAdd ? 'transparent' : theme.background,
        },
      ]}>
      <Text style={[styles.label, { color: isAdd ? theme.accent : theme.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
