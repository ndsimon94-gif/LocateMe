import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ChatBubbleProps = {
  body: string;
  mine: boolean;
};

export function ChatBubble({ body, mine }: ChatBubbleProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bubble,
        mine
          ? { alignSelf: 'flex-end', backgroundColor: theme.accent, borderBottomRightRadius: 4 }
          : {
              alignSelf: 'flex-start',
              backgroundColor: theme.backgroundElement,
              borderColor: theme.line,
              borderWidth: 1,
              borderBottomLeftRadius: 4,
            },
      ]}>
      <Text style={[styles.body, { color: mine ? theme.backgroundElement : theme.text }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  body: {
    fontSize: 15,
  },
});
