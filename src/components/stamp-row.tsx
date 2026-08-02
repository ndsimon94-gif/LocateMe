import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StampRowProps = {
  name: string;
  whereAndWhen: string;
};

export function StampRow({ name, whereAndWhen }: StampRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderColor: theme.line }]}>
      <View style={[styles.dot, { backgroundColor: theme.brass }]} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>{whereAndWhen}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 6,
  },
  body: {
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
  },
});
