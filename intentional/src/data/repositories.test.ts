import { IntegrationNotAuthorizedError } from '@/integrations/types';
import { mockCalendarProvider } from '@/integrations/calendar/mock-calendar';
import { mockMailProvider } from '@/integrations/mail/mock-mail';

import { createMemoryStore } from './key-value-store';
import { createLocalRepositories, defaultPreferences } from './repositories';


describe('local repositories', () => {
  it('round-trips data', async () => {
    const repos = createLocalRepositories(createMemoryStore());
    expect(await repos.tasks.load()).toEqual([]);
    const task = {
      id: '1',
      title: 'x',
      notes: '',
      kind: 'task' as const,
      dueDate: null,
      dueTime: null,
      isPriority: false,
      completedAt: null,
      createdAt: 'a',
      updatedAt: 'a',
      source: 'manual' as const,
    };
    await repos.tasks.save([task]);
    expect(await repos.tasks.load()).toEqual([task]);
  });

  it('falls back to defaults on corrupt or unknown-version data', async () => {
    const store = createMemoryStore({
      'intentional.tasks': '{not json',
      'intentional.preferences': JSON.stringify({ version: 99, data: {} }),
    });
    const repos = createLocalRepositories(store);
    expect(await repos.tasks.load()).toEqual([]);
    expect(await repos.preferences.load()).toEqual(defaultPreferences);
  });
});

describe('mock integrations', () => {
  it('report not connected and refuse writes', async () => {
    expect(mockCalendarProvider.info()).toMatchObject({ status: 'not_connected', isMock: true });
    expect(mockMailProvider.info()).toMatchObject({ status: 'not_connected', isMock: true });
    await expect(mockMailProvider.sendReply({ itemId: 'x', body: 'hi' }, { confirmedByUser: true })).rejects.toBeInstanceOf(IntegrationNotAuthorizedError);
    await expect(mockCalendarProvider.createEvent({ title: 'x', start: '', end: '' }, { confirmedByUser: true })).rejects.toBeInstanceOf(
      IntegrationNotAuthorizedError,
    );
  });
});
