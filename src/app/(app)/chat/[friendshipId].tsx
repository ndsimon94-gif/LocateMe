import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble } from '@/components/chat-bubble';
import { LoadingScreen } from '@/components/loading-screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useConversationMessages } from '@/hooks/use-conversation-messages';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/types/database';

type Message = Database['public']['Tables']['messages']['Row'];

export default function ChatScreen() {
  const { friendshipId } = useLocalSearchParams<{ friendshipId: string }>();
  const theme = useTheme();
  const { friends } = useFriendsWithLocation();
  const friend = friends.find((item) => item.friendship_id === friendshipId);
  const { messages, isLoading, sendMessage, myUserId } = useConversationMessages(friendshipId);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  if (isLoading) return <LoadingScreen />;

  const name = friend?.display_name ?? friend?.username ?? 'Chat';

  function handleSend() {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft('');
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle" style={styles.header}>
            {name}
          </ThemedText>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ChatBubble body={item.body} mine={item.sender_id === myUserId} />
            )}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.composer}>
            <View style={styles.composerField}>
              <TextField
                value={draft}
                onChangeText={setDraft}
                placeholder="Message"
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
            </View>
            <Pressable
              onPress={handleSend}
              style={[styles.sendButton, { backgroundColor: theme.accent }]}
              accessibilityLabel="Send">
              <Text style={[styles.sendIcon, { color: theme.backgroundElement }]}>{'›'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  header: {
    paddingVertical: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  composerField: {
    flex: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 18,
  },
});
