// JSON schema for the assistant's structured output (Claude structured outputs).
// Plain data, no runtime imports, so the app's tests can import it too.
// Every object: all properties required + additionalProperties:false; optional
// values are expressed as nullable. Numeric ranges are validated in the app.

const str = { type: 'string' } as const;
const int = { type: 'integer' } as const;
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
const obj = (properties: Record<string, object>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const habit = obj({
  title: str,
  kind: { type: 'string', enum: ['exercise', 'focus', 'personal'] },
  minutes: int,
  frequency: { anyOf: [{ type: 'string', enum: ['daily', 'weekdays'] }, obj({ timesPerWeek: int })] },
  preferred: { type: 'string', enum: ['morning', 'midday', 'afternoon', 'evening', 'any'] },
});

const planRequest = obj({
  horizon: obj({ from: { type: 'string', format: 'date' }, days: int }),
  priorities: nullable(obj({ perDay: int })),
  habits: { type: 'array', items: habit },
  communicationWindows: nullable(obj({ perDay: int, minutes: int })),
  reminders: nullable(obj({ importantEvents: { type: 'boolean' } })),
});

const action = {
  anyOf: [
    obj({ type: { type: 'string', const: 'none' } }),
    obj({
      type: { type: 'string', const: 'create_task' },
      title: str,
      kind: { type: 'string', enum: ['task', 'reminder'] },
      dueDate: nullable({ type: 'string', format: 'date' }),
      dueTime: nullable(str),
      isPriority: { type: 'boolean' },
    }),
    obj({ type: { type: 'string', const: 'start_focus' }, minutes: int, intention: str }),
    obj({
      type: { type: 'string', const: 'navigate' },
      to: { type: 'string', enum: ['/', '/communications', '/plan', '/focus'] },
      view: nullable({ type: 'string', enum: ['day', 'week'] }),
    }),
    obj({ type: { type: 'string', const: 'propose_plan' }, request: planRequest }),
    obj({
      type: { type: 'string', const: 'external_request' },
      integration: { type: 'string', enum: ['google_calendar', 'gmail'] },
      summary: str,
    }),
  ],
};

export const ASSISTANT_OUTPUT_SCHEMA = obj({ message: str, action });
