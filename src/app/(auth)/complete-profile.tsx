import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { mapProfileSaveError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function CompleteProfileScreen() {
  const { session, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDone() {
    if (!session) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim(), display_name: displayName.trim() || null })
      .eq('id', session.user.id);
    setLoading(false);
    if (error) {
      setError(mapProfileSaveError(error));
      return;
    }
    await refreshProfile();
    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.hero}>
            <ThemedText type="title" style={styles.title}>
              Set up your profile
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.tagline}>
              This is what friends see. Nothing else.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextField label="Username" value={username} onChangeText={setUsername} />
            <TextField
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
            {error ? (
              <ThemedText themeColor="danger" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
            <Button
              label="Done"
              onPress={handleDone}
              loading={loading}
              disabled={!username.trim()}
            />
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  hero: {
    gap: Spacing.one,
  },
  title: {
    textAlign: 'left',
  },
  tagline: {
    fontSize: 15,
  },
  form: {
    gap: Spacing.three,
  },
  error: {
    fontSize: 13,
  },
});
