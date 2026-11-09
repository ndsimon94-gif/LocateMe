import { extractDate, extractTime, parseIntent } from './intent-parser';

// Monday 9 Nov 2026, 10:00 local.
const NOW = new Date(2026, 10, 9, 10, 0);

describe('extractDate', () => {
  it.each([
    ['call mum today', '2026-11-09', 'call mum'],
    ['call mum tomorrow', '2026-11-10', 'call mum'],
    ['call mum on friday', '2026-11-13', 'call mum'],
    ['call mum monday', '2026-11-16', 'call mum'], // same weekday means next week
    ['call mum next wednesday', '2026-11-18', 'call mum'],
  ])('%s', (text, date, rest) => {
    expect(extractDate(text, NOW)).toEqual({ value: date, rest });
  });
});

describe('extractTime', () => {
  it.each([
    ['at 3pm', '15:00'],
    ['at 12am', '00:00'],
    ['at 12:15pm', '12:15'],
    ['at 9:30', '09:30'],
    ['around noon', '12:00'],
    ['no time here', null],
  ])('%s', (text, time) => {
    expect(extractTime(text).value).toBe(time);
  });
});

describe('parseIntent', () => {
  it('turns plain text into an undated task', () => {
    expect(parseIntent('buy stamps', NOW)).toEqual({ type: 'create_task', title: 'Buy stamps', kind: 'task', dueDate: null, dueTime: null, isPriority: false });
  });

  it('parses reminders with date and time', () => {
    expect(parseIntent('Remind me to call the dentist tomorrow at 10am', NOW)).toEqual({
      type: 'create_task',
      title: 'Call the dentist',
      kind: 'reminder',
      dueDate: '2026-11-10',
      dueTime: '10:00',
      isPriority: false,
    });
  });

  it('defaults reminders without a date to today, and past bare times to tomorrow', () => {
    expect(parseIntent('remind me to stretch', NOW)).toMatchObject({ dueDate: '2026-11-09' });
    expect(parseIntent('remind me to stretch at 9am', NOW)).toMatchObject({ dueDate: '2026-11-10', dueTime: '09:00' });
    expect(parseIntent('remind me to stretch at 4pm', NOW)).toMatchObject({ dueDate: '2026-11-09', dueTime: '16:00' });
  });

  it('detects priorities', () => {
    expect(parseIntent('add finish the report today as a priority', NOW)).toMatchObject({ title: 'Finish the report', isPriority: true, dueDate: '2026-11-09' });
    expect(parseIntent('finish the report!', NOW)).toMatchObject({ isPriority: true });
  });

  it('parses focus requests', () => {
    expect(parseIntent('focus', NOW)).toEqual({ type: 'start_focus', minutes: 25, intention: '' });
    expect(parseIntent('Focus for 45 minutes on the proposal', NOW)).toEqual({ type: 'start_focus', minutes: 45, intention: 'The proposal' });
    expect(parseIntent('start focus 1 hour', NOW)).toMatchObject({ type: 'start_focus', minutes: 60 });
  });

  it('routes questions and navigation', () => {
    expect(parseIntent("What's on today?", NOW)).toEqual({ type: 'show_today' });
    expect(parseIntent('plan my week', NOW)).toEqual({ type: 'plan_week' });
    expect(parseIntent('check my inbox', NOW)).toEqual({ type: 'open_communications' });
  });

  it('recognises requests that would need external services', () => {
    expect(parseIntent('email Priya about the budget', NOW)).toEqual({ type: 'send_message', recipient: 'Priya', about: 'the budget' });
    expect(parseIntent('schedule lunch with Sam on friday at 1pm', NOW)).toEqual({
      type: 'schedule_event',
      title: 'Lunch with Sam',
      dueDate: '2026-11-13',
      dueTime: '13:00',
    });
  });

  it('returns empty for blank input', () => {
    expect(parseIntent('   ', NOW)).toEqual({ type: 'empty' });
  });
});
