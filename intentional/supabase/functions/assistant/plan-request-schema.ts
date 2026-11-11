// JSON schema for a plan request, used by the assistant's propose_plan tool.
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

export const PLAN_REQUEST_SCHEMA = obj({
  horizon: obj({ from: { type: 'string', format: 'date' }, days: int }),
  priorities: nullable(obj({ perDay: int })),
  habits: { type: 'array', items: habit },
  communicationWindows: nullable(obj({ perDay: int, minutes: int })),
  reminders: nullable(obj({ importantEvents: { type: 'boolean' } })),
});
