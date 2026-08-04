import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { mapSignUpError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(mapSignUpError(error.message));
    }
    // No manual navigation on success: once the session lands, the (auth)
    // group's own guard redirects to complete-profile reactively — avoids
    // racing an imperative push against that guard re-rendering at the
    // same time.
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.hero}>
            <ThemedText type="title" style={styles.title}>
              Welcome to Orbit
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.tagline}>
              See where your friends are. Nothing else.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
            />
            {error ? (
              <ThemedText themeColor="danger" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
            <Button label="Continue" onPress={handleSignUp} loading={loading} />
            <Link href="/(auth)/sign-in" asChild>
              <Button label="Already on Orbit? Sign in" variant="ghost" />
            </Link>
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
