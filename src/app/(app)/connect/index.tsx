import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { CONNECT_CODE_PREFIX } from '@/lib/connect';
import { supabase } from '@/lib/supabase';

export default function MyCodeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const expiresAtMs = useRef<number | null>(null);

  const generateCode = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('connect_codes')
      .insert({ user_id: session.user.id })
      .select('token, expires_at')
      .single();
    if (!data) return;
    setToken(data.token);
    expiresAtMs.current = new Date(data.expires_at).getTime();
    setSecondsLeft(Math.max(0, Math.round((expiresAtMs.current - Date.now()) / 1000)));
  }, [session]);

  useEffect(() => {
    async function initialize() {
      await generateCode();
    }
    initialize();
  }, [generateCode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (expiresAtMs.current === null) return;
      const remaining = Math.max(0, Math.round((expiresAtMs.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) generateCode();
    }, 1000);
    return () => clearInterval(interval);
  }, [generateCode]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          My code
        </ThemedText>
        <View style={styles.body}>
          {token && (
            <View style={[styles.qrCard, { backgroundColor: theme.backgroundElement }]}>
              <QRCode
                value={`${CONNECT_CODE_PREFIX}${token}`}
                size={200}
                backgroundColor={theme.backgroundElement}
                color={theme.text}
              />
            </View>
          )}
          <ThemedText style={[styles.countdown, { color: theme.accent }]}>
            {`${minutes}:${seconds.toString().padStart(2, '0')}`}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.helper}>
            Show this to a friend to connect. Gone in three minutes — nothing left to leak.
          </ThemedText>
        </View>
        <Link href="/(app)/connect/scan" asChild>
          <Button label="Scan a code instead" variant="ghost" />
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'left',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  qrCard: {
    padding: Spacing.four,
    borderRadius: 16,
  },
  countdown: {
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  helper: {
    textAlign: 'center',
    maxWidth: 260,
  },
});
