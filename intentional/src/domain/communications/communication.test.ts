import { generateMockQueue } from '@/integrations/mail/mock-mail';

import { buildQueue, needsReplyCount, windowStatus } from './communication';

const NOW = new Date(2026, 10, 9, 10, 0);
const items = generateMockQueue(NOW);
const windows = [
  { start: '11:30', durationMinutes: 30 },
  { start: '16:30', durationMinutes: 30 },
];

describe('windowStatus', () => {
  it('is open inside a window', () => {
    const s = windowStatus(windows, new Date(2026, 10, 9, 11, 45));
    expect(s.open).toBe(true);
    if (s.open) expect(s.closesAt).toEqual(new Date(2026, 10, 9, 12, 0));
  });

  it('points to the next window later today, or tomorrow', () => {
    const before = windowStatus(windows, NOW);
    expect(before).toEqual({ open: false, nextOpensAt: new Date(2026, 10, 9, 11, 30) });
    const evening = windowStatus(windows, new Date(2026, 10, 9, 20, 0));
    expect(evening).toEqual({ open: false, nextOpensAt: new Date(2026, 10, 10, 11, 30) });
  });

  it('treats no windows as always open', () => {
    expect(windowStatus([], NOW).open).toBe(true);
  });
});

describe('buildQueue', () => {
  it('groups by triage in a fixed order', () => {
    const q = buildQueue(items, { handledIds: new Set(), windowOpen: true });
    expect(q.sections.map((s) => s.triage)).toEqual(['needs_reply', 'review', 'fyi']);
    expect(q.pendingCount).toBe(items.length);
    expect(q.heldCount).toBe(0);
    // Time-sensitive first within a section.
    expect(q.sections[0]!.items[0]!.timeSensitive).toBe(true);
  });

  it('holds non-urgent items outside a window unless asked', () => {
    const held = buildQueue(items, { handledIds: new Set(), windowOpen: false });
    expect(held.sections.flatMap((s) => s.items).every((i) => i.timeSensitive)).toBe(true);
    expect(held.heldCount).toBe(items.length - 1);
    const shown = buildQueue(items, { handledIds: new Set(), windowOpen: false, showAllOutsideWindow: true });
    expect(shown.heldCount).toBe(0);
  });

  it('excludes handled items', () => {
    const q = buildQueue(items, { handledIds: new Set(['mock-mail-1', 'mock-mail-2']), windowOpen: true });
    expect(q.sections.map((s) => s.triage)).toEqual(['review', 'fyi']);
    expect(needsReplyCount(items, new Set(['mock-mail-1']))).toBe(1);
  });

  it('marks all sample items as mock', () => {
    expect(items.every((i) => i.isMock)).toBe(true);
  });
});
