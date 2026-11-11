import { adminClient } from './auth.ts';
import { decrypt } from './crypto.ts';
import { requireEnv } from './http.ts';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const PROVIDER = 'google_calendar';

export function redirectUri(): string {
  return `${requireEnv('SUPABASE_URL')}/functions/v1/google-oauth-callback`;
}

/** Only deep links back into the app are acceptable return targets. */
export function isAllowedReturnUrl(url: string): boolean {
  return /^(intentional|exp|exps):\/\//.test(url);
}

export class ReconnectRequired extends Error {}

/** A fresh access token for the user's Google connection. */
export async function accessTokenFor(userId: string): Promise<string> {
  const db = adminClient();
  const { data: conn } = await db
    .from('integration_connections')
    .select('id, status, integration_secrets(encrypted_refresh_token)')
    .eq('user_id', userId)
    .eq('provider', PROVIDER)
    .maybeSingle();
  const secretRow = (conn?.integration_secrets as unknown as { encrypted_refresh_token: string }[] | { encrypted_refresh_token: string } | null) ?? null;
  const encrypted = Array.isArray(secretRow) ? secretRow[0]?.encrypted_refresh_token : secretRow?.encrypted_refresh_token;
  if (!conn || conn.status !== 'connected' || !encrypted) throw new ReconnectRequired('not connected');

  const refreshToken = await decrypt(encrypted, requireEnv('TOKEN_ENCRYPTION_KEY'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    // invalid_grant: revoked, or expired (Google expires tokens after 7 days while the app is in Testing).
    if (body?.error === 'invalid_grant') {
      await db.from('integration_connections').update({ status: 'error', updated_at: new Date().toISOString() }).eq('id', conn.id);
      throw new ReconnectRequired('google token expired or revoked');
    }
    throw new Error(`Google token refresh failed: ${res.status}`);
  }
  return body.access_token as string;
}

export interface MinimalEvent {
  id: string;
  title: string;
  allDay: boolean;
  /** ISO timestamps for timed events. */
  start?: string;
  end?: string;
  /** YYYY-MM-DD for all-day events (end exclusive). */
  startDate?: string;
  endDate?: string;
  location?: string;
  /** "Show as free" in Google Calendar: doesn't block time. */
  free: boolean;
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

/** Keep only what planning needs: no descriptions, attendees or links leave this function. */
export function toMinimalEvents(items: GoogleEvent[]): MinimalEvent[] {
  const out: MinimalEvent[] = [];
  for (const e of items) {
    if (e.status === 'cancelled') continue;
    if (e.attendees?.some((a) => a.self && a.responseStatus === 'declined')) continue;
    const allDay = Boolean(e.start?.date && !e.start?.dateTime);
    out.push({
      id: e.id,
      title: e.summary?.trim() || '(No title)',
      allDay,
      ...(allDay ? { startDate: e.start?.date, endDate: e.end?.date } : { start: e.start?.dateTime, end: e.end?.dateTime }),
      ...(e.location ? { location: e.location.slice(0, 120) } : {}),
      free: e.transparency === 'transparent',
    });
  }
  return out;
}

export async function listEvents(accessToken: string, timeMin: string, timeMax: string): Promise<MinimalEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    fields: 'items(id,status,summary,location,start,end,transparency,attendees(self,responseStatus))',
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 || res.status === 403) throw new ReconnectRequired('google rejected the token');
  if (!res.ok) throw new Error(`Google Calendar error: ${res.status}`);
  const body = await res.json();
  return toMinimalEvents(body.items ?? []);
}
