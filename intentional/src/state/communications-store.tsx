import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { CommunicationItem } from '@/domain/communications/communication';
import type { IntegrationInfo } from '@/integrations/types';

import { useServices } from './services';

interface CommunicationsApi {
  loaded: boolean;
  items: CommunicationItem[];
  handledIds: ReadonlySet<string>;
  integration: IntegrationInfo;
  markHandled(id: string): void;
  undoHandled(id: string): void;
}

const CommunicationsContext = createContext<CommunicationsApi | null>(null);

export function CommunicationsProvider({ children }: { children: ReactNode }) {
  const { mail, repositories } = useServices();
  const [items, setItems] = useState<CommunicationItem[]>([]);
  const [handled, setHandled] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([mail.listQueue(), repositories.handledCommunications.load()]).then(([queue, done]) => {
      setItems(queue);
      // Drop handled ids for messages that no longer exist, so the list doesn't grow forever.
      const ids = new Set(queue.map((q) => q.id));
      setHandled(done.filter((id) => ids.has(id)));
      setLoaded(true);
    });
  }, [mail, repositories]);

  useEffect(() => {
    if (loaded) void repositories.handledCommunications.save(handled);
  }, [loaded, handled, repositories]);

  const markHandled = useCallback((id: string) => setHandled((h) => (h.includes(id) ? h : [...h, id])), []);
  const undoHandled = useCallback((id: string) => setHandled((h) => h.filter((x) => x !== id)), []);

  const value = useMemo(
    () => ({ loaded, items, handledIds: new Set(handled), integration: mail.info(), markHandled, undoHandled }),
    [loaded, items, handled, mail, markHandled, undoHandled],
  );
  return <CommunicationsContext.Provider value={value}>{children}</CommunicationsContext.Provider>;
}

export function useCommunications(): CommunicationsApi {
  const ctx = useContext(CommunicationsContext);
  if (!ctx) throw new Error('useCommunications must be used inside CommunicationsProvider');
  return ctx;
}
