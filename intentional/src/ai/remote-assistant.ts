import { callFunction } from '@/backend/supabase';

import type { Assistant } from './assistant';
import { contextForServer, interpretModelOutput } from './interpret-output';
import { respondLocally } from './mock-assistant';

/**
 * Claude via the `assistant` Edge Function. Falls back to the on-device
 * assistant if the server is unreachable or the output doesn't validate,
 * and says so.
 */
export const remoteAssistant: Assistant = {
  async respond(input, ctx) {
    try {
      const r = await callFunction<{ output: unknown }>('assistant', { input, context: contextForServer(ctx) });
      const interpreted = interpretModelOutput(r.output, ctx);
      if (interpreted) return interpreted;
    } catch {
      // fall through to the local assistant
    }
    const local = respondLocally(input, ctx);
    return { ...local, message: `${local.message} (Claude was unavailable, so this used the on-device assistant.)` };
  },
};
