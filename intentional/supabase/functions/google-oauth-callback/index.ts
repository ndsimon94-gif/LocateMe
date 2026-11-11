// Google redirects here after the user approves (or declines) calendar access.
// Exchanges the code server-side, stores the refresh token encrypted, then
// sends the browser back into the app. No user JWT: identity comes from the
// HMAC-signed state created by the `google` function.

import { adminClient } from '../_shared/auth.ts';
import { encrypt, KEY_ID, verifyState } from '../_shared/crypto.ts';
import { CALENDAR_SCOPE, isAllowedReturnUrl, PROVIDER, redirectUri } from '../_shared/google.ts';
import { requireEnv } from '../_shared/http.ts';

interface State {
  uid: string;
  ret: string;
  exp: number;
}

function backToApp(returnUrl: string, result: 'connected' | 'error', reason?: string): Response {
  const url = new URL(returnUrl);
  url.searchParams.set('google', result);
  if (reason) url.searchParams.set('reason', reason);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  const params = new URL(req.url).searchParams;
  const state = await verifyState<State>(params.get('state') ?? '', requireEnv('TOKEN_ENCRYPTION_KEY'));
  if (!state || state.exp < Date.now() || !isAllowedReturnUrl(state.ret)) {
    return new Response('This sign-in link has expired. Return to Intentional and try connecting again.', { status: 400 });
  }

  const error = params.get('error');
  if (error) return backToApp(state.ret, 'error', error === 'access_denied' ? 'declined' : 'google_error');

  const code = params.get('code');
  if (!code) return backToApp(state.ret, 'error', 'missing_code');

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: requireEnv('GOOGLE_CLIENT_ID'),
        client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await res.json();
    if (!res.ok || !tokens.refresh_token) {
      console.error('token exchange failed', res.status, tokens?.error);
      return backToApp(state.ret, 'error', 'exchange_failed');
    }
    const scopes = String(tokens.scope ?? '').split(' ').filter(Boolean);
    if (!scopes.includes(CALENDAR_SCOPE)) return backToApp(state.ret, 'error', 'scope_not_granted');

    const db = adminClient();
    const now = new Date().toISOString();
    const { data: conn, error: connError } = await db
      .from('integration_connections')
      .upsert(
        { user_id: state.uid, provider: PROVIDER, status: 'connected', scopes, connected_at: now, updated_at: now },
        { onConflict: 'user_id,provider' },
      )
      .select('id')
      .single();
    if (connError || !conn) throw connError ?? new Error('no connection row');

    const { error: secretError } = await db.from('integration_secrets').upsert({
      connection_id: conn.id,
      encrypted_refresh_token: await encrypt(tokens.refresh_token, requireEnv('TOKEN_ENCRYPTION_KEY')),
      key_id: KEY_ID,
      updated_at: now,
    });
    if (secretError) throw secretError;

    return backToApp(state.ret, 'connected');
  } catch (e) {
    console.error('google callback error', e);
    return backToApp(state.ret, 'error', 'server_error');
  }
});
