import type { KeyValueStore } from './key-value-store';

/**
 * A versioned JSON document in a key-value store. Corrupt or
 * unknown-version data falls back to the default rather than crashing.
 */
export interface StoredDocument<T> {
  load(): Promise<T>;
  save(value: T): Promise<void>;
}

export function createDocument<T>(
  store: KeyValueStore,
  key: string,
  version: number,
  fallback: () => T,
  isValid: (value: unknown) => value is T,
): StoredDocument<T> {
  return {
    async load() {
      try {
        const raw = await store.getItem(key);
        if (!raw) return fallback();
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return fallback();
        const envelope = parsed as { version?: unknown; data?: unknown };
        if (envelope.version !== version || !isValid(envelope.data)) return fallback();
        return envelope.data;
      } catch {
        return fallback();
      }
    },
    async save(value) {
      await store.setItem(key, JSON.stringify({ version, data: value }));
    },
  };
}
