// Tool definitions for the Intentional assistant. Plain data, shared by the
// Edge Function (sent to Claude) and the app (which executes the tools on the
// device, where the user's data lives). Changing anything here changes the
// tool list mid-conversation for in-flight chats, so the app starts a new
// conversation when TOOLS_VERSION changes.

import { PLAN_REQUEST_SCHEMA } from './plan-request-schema.ts';

export const TOOLS_VERSION = 1;

const str = (description: string) => ({ type: 'string', description });
const nullableStr = (description: string) => ({ anyOf: [{ type: 'string' }, { type: 'null' }], description });
const nullableBool = (description: string) => ({ anyOf: [{ type: 'boolean' }, { type: 'null' }], description });
const int = (description: string) => ({ type: 'integer', description });
const obj = (properties: Record<string, object>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const tool = (name: string, description: string, properties: Record<string, object>) => ({
  name,
  description,
  strict: true,
  input_schema: obj(properties),
});

const DATE = 'Local date, YYYY-MM-DD.';
const TIME = 'Local 24-hour time, HH:MM.';

export const ASSISTANT_TOOLS = [
  tool(
    'find_free_time',
    'Find free slots on a day, avoiding calendar events, set-aside time and message windows, within the user\'s planning hours. Use this instead of working out free time yourself.',
    {
      date: str(DATE),
      minutes: int('Length of slot needed, 10-240.'),
      part_of_day: { type: 'string', enum: ['morning', 'midday', 'afternoon', 'evening', 'any'] },
      count: int('How many options to return, 1-5.'),
    },
  ),
  tool(
    'propose_plan',
    'Arrange several things over one or more days in one go (priorities, habits like exercise, message windows, reminders before important events). The planner chooses the actual times from the calendar and stages the result. Prefer this for multi-day or multi-part requests.',
    { request: PLAN_REQUEST_SCHEMA },
  ),
  tool('add_task', 'Stage a new task or reminder.', {
    title: str('Short, in the user\'s words.'),
    kind: { type: 'string', enum: ['task', 'reminder'] },
    due_date: nullableStr(`${DATE} Null for no day. Reminders need a day.`),
    due_time: nullableStr(`${TIME} Null for no time. Needs a due_date.`),
    is_priority: { type: 'boolean', description: 'One of that day\'s three priorities.' },
    notes: nullableStr('Optional notes.'),
  }),
  tool('update_task', 'Stage a change to an existing task. Null fields stay unchanged.', {
    task_id: str('Task id from the state.'),
    title: nullableStr('New title, or null.'),
    due_date: nullableStr(`New ${DATE} or null to leave unchanged.`),
    clear_due_date: { type: 'boolean', description: 'True to remove the day (and time).' },
    due_time: nullableStr(`New ${TIME} or null to leave unchanged.`),
    clear_due_time: { type: 'boolean', description: 'True to remove the time.' },
    is_priority: nullableBool('Set or unset priority, or null to leave unchanged.'),
    notes: nullableStr('New notes, or null.'),
  }),
  tool('complete_task', 'Stage marking a task done.', { task_id: str('Task id from the state.') }),
  tool('delete_task', 'Stage removing a task. Only when the user asks to drop it.', { task_id: str('Task id from the state.') }),
  tool('schedule_block', 'Stage setting aside time (exercise, focus, personal). Check free time first.', {
    title: str('Short title, e.g. "Run" or "Deep work: report".'),
    kind: { type: 'string', enum: ['exercise', 'focus', 'personal'] },
    date: str(DATE),
    start: str(TIME),
    end: str(TIME),
  }),
  tool('move_block', 'Stage moving set-aside time.', { block_id: str('Block id from the state.'), date: str(DATE), start: str(TIME), end: str(TIME) }),
  tool('remove_block', 'Stage removing set-aside time.', { block_id: str('Block id from the state.') }),
  tool('set_message_windows', 'Stage the daily times for dealing with messages (replaces the current set).', {
    windows: { type: 'array', items: obj({ start: str(TIME), minutes: int('10-90.') }) },
  }),
  tool('update_settings', 'Stage attention settings changes. Null fields stay unchanged.', {
    wind_down_time: nullableStr(`${TIME} after which the app stops suggesting work, or null to leave unchanged.`),
    clear_wind_down: { type: 'boolean', description: 'True to turn wind-down off.' },
    notify_message_windows: nullableBool('Notify when a message window opens.'),
    notify_blocks: nullableBool('Notify when set-aside time starts.'),
    hold_messages_outside_windows: nullableBool('Hide non-urgent messages outside windows.'),
  }),
  tool('start_focus', 'Stage starting a focus session now.', { minutes: int('1-180.'), intention: str('What it is for; may be empty.') }),
];

export const ASSISTANT_TOOL_NAMES = ASSISTANT_TOOLS.map((t) => t.name);
