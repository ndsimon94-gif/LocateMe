import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/state/auth-store';
import { useConnections } from '@/state/connections-store';
import { colors, space } from '@/theme/tokens';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { ModalScreen } from '@/ui/modal-screen';
import { Text } from '@/ui/text';
import { TextField } from '@/ui/text-field';

export default function SettingsScreen() {
  return (
    <ModalScreen title="Account & connections">
      <AccountCard />
      <GoogleCard />
      <AssistantCard />
      <Text variant="small" muted>
        Intentional keeps your tasks and plans on this phone. Signing in is only needed for Google Calendar and the
        Claude assistant, which run on Intentional&apos;s server so no keys or tokens are stored on your phone.
      </Text>
    </ModalScreen>
  );
}

function AccountCard() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth.available) {
    return (
      <Card>
        <Text variant="heading">Account</Text>
        <Text muted>Sign-in isn&apos;t configured in this build.</Text>
      </Card>
    );
  }

  if (auth.session) {
    return (
      <Card>
        <Text variant="heading">Account</Text>
        <Text>Signed in as {auth.email}</Text>
        <Button compact tone="quiet" label="Sign out" style={styles.left} onPress={() => void auth.signOut()} />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text variant="heading">Sign in</Text>
      {sent ? (
        <>
          <Text>Check your email on this phone and tap the link. It brings you straight back here.</Text>
          <Button compact tone="quiet" label="Use a different email" style={styles.left} onPress={() => setSent(false)} />
        </>
      ) : (
        <>
          <Text variant="small" muted>
            No password. We&apos;ll email you a link.
          </Text>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
          />
          <Button
            label={busy ? 'Sending…' : 'Email me a sign-in link'}
            disabled={busy || !email.trim()}
            onPress={async () => {
              setBusy(true);
              const e = await auth.sendSignInLink(email);
              setBusy(false);
              setError(e);
              if (!e) setSent(true);
            }}
          />
        </>
      )}
      {error ? (
        <Text variant="small" style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

function GoogleCard() {
  const { session } = useAuth();
  const c = useConnections();
  const { refresh } = c;
  // Re-check on open: the user may be returning from Google's consent screen.
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const status = {
    unavailable: 'Not available in this build.',
    signed_out: 'Sign in first to connect your calendar.',
    checking: 'Checking…',
    not_connected: 'Not connected. Plans use sample events.',
    connected: 'Connected (read-only). Plans use your real free time.',
    needs_reconnect: 'Google needs you to reconnect. While the app is in testing, Google ends access after 7 days.',
  }[c.google];

  return (
    <Card style={styles.card}>
      <Text variant="heading">Google Calendar</Text>
      <Text muted={c.google !== 'connected'}>{status}</Text>
      {session && (c.google === 'not_connected' || c.google === 'needs_reconnect') ? (
        <>
          <Text variant="small" muted>
            Intentional only reads event times, titles and locations from your main calendar, to find free time. It
            can&apos;t change your calendar.
          </Text>
          <Button label={c.connecting ? 'Waiting for Google…' : c.google === 'needs_reconnect' ? 'Reconnect Google Calendar' : 'Connect Google Calendar'} disabled={c.connecting} onPress={() => void c.connectGoogle()} />
        </>
      ) : null}
      {c.google === 'connected' ? <Button compact tone="danger" label="Disconnect" style={styles.left} onPress={() => void c.disconnectGoogle()} /> : null}
      {c.error ? (
        <Text variant="small" style={{ color: colors.danger }} accessibilityRole="alert">
          {c.error}
        </Text>
      ) : null}
    </Card>
  );
}

function AssistantCard() {
  const { session } = useAuth();
  return (
    <Card>
      <Text variant="heading">Assistant</Text>
      <View style={styles.row}>
        <Text style={styles.flex}>{session ? 'Claude' : 'On-device (basic)'}</Text>
      </View>
      <Text variant="small" muted>
        {session
          ? 'Requests go to Claude with today’s event titles, your priorities and some counts. Never your messages. Claude only suggests; you confirm every change.'
          : 'Sign in to use Claude. Without it, a simple on-device assistant understands a few phrasings.'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  left: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
