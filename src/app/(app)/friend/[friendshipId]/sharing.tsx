import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/loading-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useFriendsWithLocation } from '@/hooks/use-friends-with-location';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Level = 'default' | 'off' | 'country' | 'city';

const OPTIONS: { value: Level; title: string }[] = [
  { value: 'default', title: 'Use my default' },
  { value: 'off', title: 'Off' },
  { value: 'country', title: 'Country only' },
  { value: 'city', title: 'City' },
];

const DEFAULT_LEVEL_LABEL: Record<'off' | 'country' | 'city', string> = {
  off: 'Off',
  country: 'Country',
  city: 'City',
};

export default function FriendSharingScreen() {
  const { friendshipId } = useLocalSearchParams<{ friendshipId: string }>();
  const theme = useTheme();
  const { session, profile } = useAuth();
  const { friends } = useFriendsWithLocation();
  const friend = friends.find((item) => item.friendship_id === friendshipId);
  const [level, setLevel] = useState<Level>('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!friendshipId || !session) return;
      const { data } = await supabase
        .from('friendship_settings')
        .select('sharing_level')
        .eq('friendship_id', friendshipId)
        .eq('owner_id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setLevel(data?.sharing_level ?? 'default');
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [friendshipId, session]);

  async function handleSelect(next: Level) {
    if (!friendshipId || !session) return;
    setLevel(next);
    await supabase
      .from('friendship_settings')
      .upsert({ friendship_id: friendshipId, owner_id: session.user.id, sharing_level: next });
  }

  if (isLoading) return <LoadingScreen />;

  const name = friend?.display_name ?? friend?.username ?? 'this friend';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle" style={styles.title}>
          Sharing with {name}
        </ThemedText>

        <View style={styles.list}>
          {OPTIONS.map((option) => {
            const checked = level === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.row, { borderColor: theme.line }]}
                onPress={() => handleSelect(option.value)}>
                <View style={[styles.dot, { borderColor: checked ? theme.accent : theme.textSecondary }]}>
                  {checked && <View style={[styles.dotFill, { backgroundColor: theme.accent }]} />}
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{option.title}</Text>
                  {option.value === 'default' && (
                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                      Currently: {DEFAULT_LEVEL_LABEL[profile?.location_sharing_default ?? 'off']}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  title: {
    marginBottom: Spacing.three,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowBody: {
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
  },
});
