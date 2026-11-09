import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { defaultPreferences, type AttentionPreferences } from '@/data/repositories';

import { useServices } from './services';

interface PreferencesApi {
  preferences: AttentionPreferences;
  updatePreferences(patch: Partial<AttentionPreferences>): void;
}

const PreferencesContext = createContext<PreferencesApi | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { repositories } = useServices();
  const [preferences, setPreferences] = useState<AttentionPreferences>(defaultPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    repositories.preferences.load().then((p) => {
      setPreferences({ ...defaultPreferences, ...p });
      setHydrated(true);
    });
  }, [repositories]);

  useEffect(() => {
    if (hydrated) void repositories.preferences.save(preferences);
  }, [hydrated, preferences, repositories]);

  const updatePreferences = useCallback((patch: Partial<AttentionPreferences>) => {
    setPreferences((p) => ({ ...p, ...patch }));
  }, []);

  const value = useMemo(() => ({ preferences, updatePreferences }), [preferences, updatePreferences]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesApi {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}
