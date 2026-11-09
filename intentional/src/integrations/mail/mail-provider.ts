import type { CommunicationItem } from '@/domain/communications/communication';

import type { IntegrationInfo } from '../types';

export interface MailProvider {
  info(): IntegrationInfo;
  /** Messages that may need attention, already triaged and summarised (server-side, later). */
  listQueue(): Promise<CommunicationItem[]>;
  /** Must reject unless connected and the user reviewed and confirmed this exact message. */
  sendReply(input: { itemId: string; body: string }, confirmation: { confirmedByUser: true }): Promise<void>;
}
