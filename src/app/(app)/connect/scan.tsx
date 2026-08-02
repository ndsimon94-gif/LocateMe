import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CONNECT_CODE_PREFIX } from '@/lib/connect';
import { mapRedeemError } from '@/lib/connect-errors';
import { supabase } from '@/lib/supabase';

type ScanResult =
  | { kind: 'success'; name: string }
  | { kind: 'already'; name: string }
  | { kind: 'error'; message: string };

export default function ScanScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleScan(data: string) {
    if (scanned || !data.startsWith(CONNECT_CODE_PREFIX)) return;
    setScanned(true);
    const token = data.slice(CONNECT_CODE_PREFIX.length);
    const { data: rows, error } = await supabase.rpc('redeem_connect_code', { p_token: token });

    if (error) {
      setResult({ kind: 'error', message: mapRedeemError(error.message) });
      return;
    }
    const row = rows?.[0];
    if (!row) {
      setResult({ kind: 'error', message: 'Something went wrong. Try again.' });
      return;
    }
    const name = row.friend_display_name ?? row.friend_username ?? 'your friend';
    setResult({ kind: row.already_connected ? 'already' : 'success', name });
  }

  function handleRetry() {
    setScanned(false);
    setResult(null);
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.body}>
            <ThemedText type="title" style={styles.title}>
              Scan
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.helper}>
              Orbit only uses your camera to scan a code — nothing is recorded.
            </ThemedText>
            <Button label="Continue" onPress={requestPermission} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Scan
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.helper}>
          Point your camera at their code.
        </ThemedText>

        <View style={[styles.cameraFrame, { borderColor: theme.line }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : (event) => handleScan(event.data)}
          />
          {[styles.cornerTl, styles.cornerTr, styles.cornerBl, styles.cornerBr].map((corner, i) => (
            <View key={i} style={[styles.corner, corner, { borderColor: theme.brass }]} />
          ))}
        </View>

        {result && (
          <View style={[styles.resultCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.resultText}>
              {result.kind === 'success' && `Connected with ${result.name}`}
              {result.kind === 'already' && `You and ${result.name} are already connected.`}
              {result.kind === 'error' && result.message}
            </ThemedText>
            {result.kind === 'error' ? (
              <Button label="Try again" variant="outline" onPress={handleRetry} />
            ) : (
              <Button label="Done" onPress={() => router.back()} />
            )}
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const CORNER_SIZE = 24;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'left',
  },
  helper: {
    fontSize: 14,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  cameraFrame: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0b1512',
    borderWidth: 1,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderWidth: 3,
  },
  cornerTl: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTr: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBl: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBr: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  resultCard: {
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.two,
  },
  resultText: {
    fontSize: 15,
  },
});
