import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

import { requireEnv } from './http.ts';

/** The signed-in user making this request, or null. */
export async function getUser(req: Request): Promise<User | null> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return null;
  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  return error ? null : data.user;
}

/** Service-role client: bypasses RLS. Only ever used server-side, scoped by user id in every query. */
export function adminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}
