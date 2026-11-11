import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/state/auth-store';
import { Button } from '@/ui/button';
import { ModalScreen } from '@/ui/modal-screen';
import { Text } from '@/ui/text';

/** Where the emailed sign-in link lands (intentional://auth-callback?code=…). */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const { completeSignIn } = useAuth();
  const [error, setError] = useState<string | null>(params.error_description ?? null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !params.code) return;
    started.current = true;
    void completeSignIn(params.code).then((e) => {
      if (e) setError(e);
      else router.replace('/settings');
    });
  }, [params.code, completeSignIn, router]);

  return (
    <ModalScreen title="Signing in">
      {error ? (
        <>
          <Text>{error}</Text>
          <Button label="Back to sign-in" onPress={() => router.replace('/settings')} />
        </>
      ) : (
        <Text muted>{params.code ? 'One moment…' : 'This link is missing its sign-in code.'}</Text>
      )}
    </ModalScreen>
  );
}
