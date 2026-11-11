// Google Calendar connection for the signed-in user.
// POST { action: 'start', returnUrl } -> { url }        (begin OAuth)
// POST { action: 'status' }           -> { status, connectedAt }
// POST { action: 'events', timeMin, timeMax } -> { events }   (read-only, minimal fields)
// POST { action: 'disconnect' }       -> { status: 'not_connected' }

import { adminClient, getUser } from '../_shared/auth.ts';
import { signState } from '../_shared/crypto.ts';
import { accessTokenFor, CALENDAR_SCOPE, isAllowedReturnUrl, listEvents, PROVIDER, ReconnectRequired, redirectUri } from '../_shared/google.ts';
import { corsHeaders, json, requireEnv } from '../_shared/http.ts';

const MAX_RANGE_DAYS = 42;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  try {
    switch (body.action) {
      case 'start': {
        const returnUrl = String(body.returnUrl ?? '');
        if (!isAllowedReturnUrl(returnUrl)) return json({ error: 'invalid_return_url' }, 400);
        const state = await signState(
          { uid: user.id, ret: returnUrl, exp: Date.now() + 10 * 60_000, n: crypto.randomUUID() },
          requireEnv('TOKEN_ENCRYPTION_KEY'),
        );
        const params = new URLSearchParams({
          client_id: requireEnv('GOOGLE_CLIENT_ID'),
          redirect_uri: redirectUri(),
          response_type: 'code',
          scope: CALENDAR_SCOPE,
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
          state,
        });
        return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
      }

      case 'status': {
        const { data } = await adminClient()
          .from('integration_connections')
          .select('status, connected_at')
          .eq('user_id', user.id)
          .eq('provider', PROVIDER)
          .maybeSingle();
        return json({ status: data?.status ?? 'not_connected', connectedAt: data?.connected_at ?? null });
      }

      case 'events': {
        const timeMin = new Date(String(body.timeMin));
        const timeMax = new Date(String(body.timeMax));
        if (Number.isNaN(timeMin.getTime()) || Number.isNaN(timeMax.getTime()) || timeMax <= timeMin) {
          return json({ error: 'invalid_range' }, 400);
        }
        if (timeMax.getTime() - timeMin.getTime() > MAX_RANGE_DAYS * 86_400_000) return json({ error: 'range_too_large' }, 400);
        const token = await accessTokenFor(user.id);
        return json({ events: await listEvents(token, timeMin.toISOString(), timeMax.toISOString()) });
      }

      case 'disconnect': {
        const db = adminClient();
        try {
          // Best effort: revoke at Google too.
          const token = await accessTokenFor(user.id);
          await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
        } catch {
          // Already invalid; deleting our copy is what matters.
        }
        await db.from('integration_connections').delete().eq('user_id', user.id).eq('provider', PROVIDER);
        return json({ status: 'not_connected' });
      }

      default:
        return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) {
    if (e instanceof ReconnectRequired) return json({ error: 'reconnect_required' }, 409);
    console.error('google function error', e);
    return json({ error: 'server_error' }, 500);
  }
});
