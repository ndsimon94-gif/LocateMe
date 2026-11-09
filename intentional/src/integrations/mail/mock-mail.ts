import type { CommunicationItem } from '@/domain/communications/communication';

import { IntegrationNotAuthorizedError } from '../types';
import type { MailProvider } from './mail-provider';

const hoursAgo = (now: Date, h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

/** Sample queue. Senders and content are fictional; summaries are pre-written, not AI output. */
export function generateMockQueue(now: Date): CommunicationItem[] {
  return [
    {
      id: 'mock-mail-1',
      channel: 'email',
      from: 'Priya Natarajan',
      subject: 'Draft proposal — your comments?',
      receivedAt: hoursAgo(now, 3),
      summary: 'Priya wants your comments on section 2 of the proposal before Thursday. Two specific questions on budget.',
      triage: 'needs_reply',
      timeSensitive: true,
      suggestedReply: "Thanks Priya — I'll send comments on section 2 by Wednesday evening.",
      isMock: true,
    },
    {
      id: 'mock-mail-2',
      channel: 'message',
      from: 'Sam',
      subject: 'Lunch this week?',
      receivedAt: hoursAgo(now, 5),
      summary: 'Sam is confirming lunch and asks if the Corner Café still works.',
      triage: 'needs_reply',
      timeSensitive: false,
      suggestedReply: 'Corner Café works for me. See you then!',
      isMock: true,
    },
    {
      id: 'mock-mail-3',
      channel: 'email',
      from: 'Building management',
      subject: 'Water shut-off Friday 9–11am',
      receivedAt: hoursAgo(now, 20),
      summary: 'Water will be off Friday morning between 9 and 11. No action needed.',
      triage: 'review',
      timeSensitive: false,
      isMock: true,
    },
    {
      id: 'mock-mail-4',
      channel: 'email',
      from: 'Jordan Lee',
      subject: 'Notes from Tuesday',
      receivedAt: hoursAgo(now, 26),
      summary: 'Meeting notes with three action items; one is assigned to you (update the timeline).',
      triage: 'review',
      timeSensitive: false,
      isMock: true,
    },
    {
      id: 'mock-mail-5',
      channel: 'email',
      from: 'Newsletter',
      subject: 'This week in design',
      receivedAt: hoursAgo(now, 30),
      summary: 'Weekly newsletter. Five links, nothing addressed to you.',
      triage: 'fyi',
      timeSensitive: false,
      isMock: true,
    },
    {
      id: 'mock-mail-6',
      channel: 'email',
      from: 'Online store',
      subject: 'Your order has shipped',
      receivedAt: hoursAgo(now, 40),
      summary: 'Order shipped; expected delivery in 3 days.',
      triage: 'fyi',
      timeSensitive: false,
      isMock: true,
    },
  ];
}

export const mockMailProvider: MailProvider = {
  info: () => ({ id: 'gmail', displayName: 'Gmail', status: 'not_connected', isMock: true }),
  listQueue: async () => generateMockQueue(new Date()),
  sendReply: async () => {
    throw new IntegrationNotAuthorizedError('gmail');
  },
};
