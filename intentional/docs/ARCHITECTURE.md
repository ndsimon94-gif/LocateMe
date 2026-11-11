# Intentional: Design

> The best interaction with this app is a short one that helps someone return to their actual life.

This document covers the architecture, folder structure, database schema, screen and navigation spec, dependencies, implementation plan, and platform limitations and risks. It describes the code as built through **milestone 1.5** (real notifications and the planning foundation).

**Product direction.** Intentional is not trying to be the best task manager, calendar or blocker. Its value is the intelligence that connects them. The target experience is a single request such as *"I have a busy week. Organize my priorities, find time for exercise, remind me of anything important, and give me two windows each day to respond to messages."* The app then proposes a concrete plan, the user approves it, and the app helps carry it out. The task list stays deliberately simple.

---

## 1. Architecture overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ UI  (src/app routes, src/ui components)                              │
│   Renders state and collects input. No business rules.               │
├──────────────────────────────────────────────────────────────────────┤
│ State  (src/state)                                                   │
│   React context providers, persistence, action execution.            │
│   ServicesProvider is the one composition root that wires mocks.     │
├───────────────┬───────────────────┬──────────────────┬───────────────┤
│ Domain        │ AI orchestration  │ Integrations     │ Data          │
│ src/domain    │ src/ai            │ src/integrations │ src/data      │
│ Pure TS: tasks│ Assistant         │ CalendarProvider │ KeyValueStore │
│ planning,     │ interface, intent │ MailProvider     │ versioned     │
│ focus, comms, │ parser, mock      │ (mock impls,     │ documents,    │
│ next action.  │ assistant.        │ not_connected).  │ repositories. │
│ No React.     │ Proposes only.    │ Writes refuse.   │               │
└───────────────┴───────────────────┴──────────────────┴───────────────┘
```

**Layering rules**

- `domain/` has no React, React Native or I/O imports. Everything in it is a pure function of its inputs, with `now` always passed in, so it is fully unit-testable.
- `ai/` depends only on `domain/`. The assistant returns **proposals** (`ProposedAction[]`) and never executes anything itself.
- `integrations/` define provider interfaces. Milestone 1 ships only mock implementations. They report `status: 'not_connected'` and `isMock: true`, and their write methods (`sendReply` and `createEvent`) always throw `IntegrationNotAuthorizedError`.
- `state/execute-action.ts` is the only place proposals turn into effects. It runs local actions (create task, start focus, navigate) and refuses anything marked `requires_authorization`, whatever the assistant said. This is a second line of defence.
- `state/services.tsx` is the composition root. Moving to Supabase, the Google adapters or a server-side LLM means changing this file and adding new implementations. Screens and domain code stay the same.

**The AI provider abstraction**

```ts
interface Assistant {
  respond(input: string, context: AssistantContext): Promise<AssistantResponse>;
}
// AssistantResponse = { message, actions: ProposedAction[], provider: 'mock' | 'remote' }
```

Today `mockAssistant` is a deterministic, offline rule-based parser. Later, a `RemoteAssistant` will call a Supabase Edge Function. That function holds the LLM key, builds a minimal context (titles and counts, not message bodies), asks the model for structured output in the `ProposedAction` schema, and validates it before returning. LLM keys never ship in the app. `provider` is shown in the UI, so mock output is never presented as real AI.

**Authorization model for external actions**

1. An integration is `connected` only after a real OAuth flow succeeds server-side. Nothing in milestone 1 can set it.
2. The assistant can only *propose* external actions, as `requires_authorization`.
3. Provider write methods require `{ confirmedByUser: true }` at the type level, and real implementations must also check server-side.
4. Every executed or refused external action is written to `assistant_actions`, without its content.

**Persistence.** Tasks, focus history, the active focus timer, preferences and handled-message IDs are stored as versioned JSON documents in AsyncStorage (`data/document.ts`). If data is corrupt or has an unknown version, the app falls back to defaults instead of crashing. The focus timer stores absolute timestamps, so it survives the app being backgrounded or killed.

### The planning pipeline (milestone 1.5)

This is the core of the product and the seam where the real AI plugs in.

```
 "I have a busy week…"
        │
        ▼
 Assistant (mock rules now → LLM next)        language → intent
        │  emits PlanRequest (zod schema; validated)
        ▼
 buildPlan(request, context)                  deterministic scheduling
        │  reads: calendar events, tasks, blocks, preferences
        │  emits: PlanProposal { operations[], notes[], summary }
        ▼
 Review screen (/plan-review)                 the user unticks anything
        │
        ▼
 apply() → local changes + AppliedPlan record (for undo)
        │
        ▼
 Notification reconciler → OS schedule
```

- **The split between AI and code is deliberate.** LLMs are good at understanding requests and bad at calendar arithmetic. The model only fills in a `PlanRequest` (horizon, priorities per day, habits with frequency and preferred time of day, message windows, reminders). The planner (`domain/planning/plan.ts`) is pure, tested code that finds free time (`availability.ts`), works around events with a buffer, picks message-window times that clash with the fewest meetings, fills priorities from due, overdue and unplanned tasks, and adds "leave for…" reminders before events that have a location or look important.
- **`PlanRequest` is a zod schema** (`plan-request.ts`). The same schema becomes the LLM's structured-output/tool schema (`z.toJSONSchema`), and the app re-validates whatever comes back.
- **Every operation is shown before it runs** and can be unticked. Applying creates an `AppliedPlan` record so the whole plan can be **undone**: blocks and reminders removed, priorities cleared, previous message windows restored. Planning is idempotent, so running it again doesn't duplicate existing blocks, priorities or reminders.
- **Time blocks** (`TimeBlock`) are set-aside time owned by Intentional. They appear next to calendar events, labelled "Set aside". Until Google Calendar is connected they live only in the app and in notifications. Once it is connected, writing them to the calendar becomes an opt-in, per-plan choice (`time_blocks.external_event_id`).

### Notifications (milestone 1.5)

- `domain/notifications/schedule.ts` computes the notifications that **should** exist, as a pure function of tasks, blocks, the focus timer and preferences. `NotificationsProvider` compares that list with the OS schedule and applies only the difference. It reruns after every change and whenever the app returns to the foreground.
- What notifies: reminders (at their time, or 9 AM on the day), the end of a focus session, the start of set-aside time (on by default, can be turned off), and message windows opening (off by default; turned on when a plan sets windows). Windows and blocks are silent during wind-down, from the wind-down time until 05:00. There are never engagement or "come back" notifications.
- Calm by default: no sound in the foreground, a single Android channel with default importance, and no badges.
- Permission is requested **in context**, the first time it's clearly useful (saving a reminder, starting a focus session, applying a plan, or the toggle in Focus settings), never on launch.
- At most 60 notifications are scheduled, within iOS's limit of 64 per app, with a 7-day horizon.
- A tapped notification opens the related screen (`data.url`). On web the notifier is a no-op.

---

## 2. Folder structure

```
intentional/
├── app.json, package.json, tsconfig.json (strict + noUncheckedIndexedAccess)
├── docs/ARCHITECTURE.md                 ← this file
├── supabase/migrations/…_initial_schema.sql
└── src/
    ├── app/                             expo-router routes (UI only)
    │   ├── _layout.tsx                  providers + root Stack (modals)
    │   ├── (tabs)/_layout.tsx           Today · Messages · Plan · Focus
    │   ├── (tabs)/index.tsx             Today
    │   ├── (tabs)/communications.tsx    Messages queue
    │   ├── (tabs)/plan.tsx              Day / week planning
    │   ├── (tabs)/focus.tsx             Timer, insights, attention settings
    │   ├── task/new.tsx, task/[id].tsx  Create / edit / complete / delete
    │   ├── command.tsx                  Global "Capture or ask" input
    │   └── plan-review.tsx              Review / apply / undo a proposed plan
    ├── domain/                          pure business logic + tests
    │   ├── dates.ts, result.ts, calendar.ts
    │   ├── tasks/       task.ts (validation, create/edit), task-reducer.ts, priorities.ts
    │   ├── planning/    agenda.ts, availability.ts (free time), plan-request.ts (zod),
    │   │                plan.ts (planner + AppliedPlan), time-block.ts
    │   ├── notifications/ schedule.ts (desired set + diff)
    │   ├── focus/       focus-timer.ts (state machine), focus-history.ts (insights)
    │   ├── communications/ communication.ts (triage queue, windows)
    │   └── today/       next-action.ts
    ├── ai/              assistant.ts (contract), intent-parser.ts, plan-parser.ts, mock-assistant.ts
    ├── integrations/    types.ts, calendar/{provider,mock}, mail/{provider,mock},
    │                    notifications.ts (port + fake), expo-notifier(.web).ts
    ├── data/            key-value-store.ts, device-store.ts, document.ts, repositories.ts
    ├── state/           providers per concern, services (composition root), execute-action
    ├── theme/tokens.ts  colours, spacing, type scale, touch-target size
    └── ui/              Screen, Card, Button, TaskRow, EventRow, TaskForm, SampleBadge, …
```

Native Swift and Kotlin modules will go in `modules/` as Expo Modules when they are needed, for example `modules/screen-time` (iOS FamilyControls) and `modules/usage-stats` (Android). They will be exposed to JS through an interface in `integrations/`, the same pattern as calendar and mail.

---

## 3. Database schema (Supabase / Postgres)

The full SQL is in `supabase/migrations/20261109000000_initial_schema.sql`. It is designed but **not connected** in milestone 1.

| Table | Purpose | Notes |
|---|---|---|
| `profiles` | display name, time zone | 1:1 with `auth.users` |
| `tasks` | tasks & reminders | checks mirror domain validation; trigger enforces ≤ 3 open priorities/day; soft delete for sync |
| `focus_sessions` | completed/abandoned sessions | powers weekly insights |
| `attention_preferences` | windows, hold-messages, focus length, wind-down | one row per user |
| `integration_connections` | provider, status, granted scopes | client **read-only**; changed only by OAuth Edge Function |
| `integration_secrets` | encrypted refresh tokens | RLS on with **no policies**, so it is service-role only |
| `communication_items` | sender, subject, summary, triage | **no message bodies**; `expires_at` default 14 days; clients may only update `handled_at` |
| `assistant_actions` | audit of external actions | kind, integration, confirmed, outcome; **no prompt or content** |
| `applied_plans` | plan history for undo | validated `PlanRequest` JSON, ids touched, previous windows |
| `time_blocks` | set-aside time | `plan_id`, optional `external_event_id` once written to a calendar |

`attention_preferences` gains the planning hours, the notification toggles and the default reminder time (migration `20261110000000_planning_foundation.sql`).

RLS is enabled on every table, and each row is limited to `auth.uid()`.

---

## 4. Screen & navigation specification

Root `Stack` (headerless), containing a bottom `Tabs` navigator and three modals.

| Route | Purpose: what does the user need to do, and how fast can they leave? |
|---|---|
| **Today** `/` | See the single **next suggested action** (focus session › wind-down › imminent event › replies while a window is open › top priority › "put the phone down"), up to **three priorities** (with one-tap "Prioritise" suggestions), the rest of today's events, and a one-line message status. Usually done in under 10 seconds. |
| **Messages** `/communications` | Triage queue grouped as *Needs a reply* / *Worth reading* / *Can wait*, with summaries labelled as mock. Outside communication windows, only time-sensitive items show, with a count of held items and "Show them anyway". Actions: **Done**, **Draft reply** (shows a suggestion and states that sending is unavailable), **Make task**. |
| **Plan** `/plan` | A "Current plan" card with Undo when one was applied in the last week. Segmented **Day / Week**; set-aside blocks appear with events and can be removed. Day: date stepper, calendar, tasks (overdue, then timed, then anytime), "Add to this day". Week: seven day cards with counts and previews, a gentle "looks full" note, tap to open a day. Both show **Not yet planned** for undated captures. Accepts `?view=week&date=YYYY-MM-DD`. |
| **Focus** `/focus` | Start a session (optional intention, preset or ±5 min), pause/resume/end early, and a completion message. **This week**: minutes, sessions, a per-day bar chart, and the change from last week. No streaks or scores. **Attention settings**: notifications (status, set-aside and window toggles), communication windows, hold messages, wind-down time, default length, and an honest note about OS-level blocking. |
| **Capture or ask** `/command` (modal) | Reached from the "Capture or ask…" bar at the top of every tab. Type a thought or request, the mock assistant proposes an action, and one tap confirms it. Planning requests open **Review plan**. External requests show why they cannot be done and offer a local task instead. |
| **Review plan** `/plan-review` (modal) | The plan's summary, then each change grouped as message windows, time set aside, priorities and reminders, each with its reason and a checkbox. "Apply N changes", then a confirmation with **Undo this plan**. States plainly that blocks aren't written to a calendar that isn't connected. |
| **New task** `/task/new` (modal) | Title, task/reminder, day (Today/Tomorrow/No day + stepper), optional time, priority switch, notes. |
| **Edit task** `/task/[id]` (modal) | Same form plus Mark complete / not done and Delete (with confirmation). |

Design system: warm off-white `#F6F3EC` background and forest-green `#3E5C47` accent. All text passes WCAG AA, touch targets are at least 44 pt, and the tab bar uses a quiet dot with no icons. There is no animation beyond platform defaults. Every list has an empty state. Mock data always carries a "Sample data" or "Mock assistant" badge.

---

## 5. Dependencies

Runtime (all aligned with Expo SDK 57's `bundledNativeModules.json`):

| Package | Why |
|---|---|
| `expo` ~57, `react` 19.2, `react-native` 0.86 | platform |
| `expo-router` | file-based navigation (Stack + `expo-router/js-tabs`) |
| `react-native-screens`, `react-native-safe-area-context` | required by navigation |
| `@react-native-async-storage/async-storage` | local persistence |
| `expo-notifications` | local notifications (reminders, focus end, plan blocks, windows) |
| `zod` | `PlanRequest` schema: validates assistant/LLM output and generates the tool JSON schema |
| `expo-status-bar`, `expo-constants`, `expo-linking` | router peers / status bar |
| `react-dom`, `react-native-web` | web preview for quick review |

Dev: `typescript` ~5.9 (strict), `jest` + `jest-expo` + `@types/jest`, `eslint` + `eslint-config-expo`.

These were **deliberately not added yet**: `@supabase/supabase-js`, `expo-auth-session`, `expo-secure-store`, and any date or state library. Each arrives with the milestone that needs it, so the prototype has no dormant network code.

---

## 6. Implementation plan

**Milestone 1 (this change):**

1. Domain: dates, tasks (validation, priority rule), reducer, priorities, planning, focus timer and history, communications triage and windows, next action. Each has tests.
2. AI: assistant contract, intent parser, mock assistant, and the action executor that guards authorization.
3. Integrations: provider interfaces and mock calendar/mail that refuse writes.
4. Data: storage port, versioned documents, repositories.
5. State providers and the composition root.
6. UI kit, then the four tabs, the task modals, and the command modal.
7. Verification: `tsc`, `expo lint`, `jest`, web export with a headless browser smoke test, and iOS/Android bundle export.

**Milestone 1.5 (done):** real local notifications, plus the planning foundation: availability, the `PlanRequest` schema, the deterministic planner, plan review, apply and undo, and time blocks.

**Milestone 2 (done):** Supabase project with the schema applied; email-link sign-in (PKCE); `google`, `google-oauth-callback` and `assistant` Edge Functions; read-only Google Calendar feeding the planner (all-day and "free" events don't block time; declined and cancelled events are dropped; only id, title, times and location leave the server); Claude assistant using structured output against `supabase/functions/assistant/output-schema.ts`, re-validated in `src/ai/interpret-output.ts`, with fallback to the on-device assistant.

**Milestone 3 (done): the assistant at the centre.** A conversational assistant (Claude Opus 5.5 via the `assistant` relay) with 12 tools: `find_free_time`, `propose_plan` (the deterministic planner), `add_task` / `update_task` / `complete_task` / `delete_task`, `schedule_block` / `move_block` / `remove_block`, `set_message_windows`, `update_settings` and `start_focus`. The loop runs on the device (`src/ai/agent/run-turn.ts`), where the data is. Write tools only *stage* changes (`src/domain/assistant/changeset.ts`), each validated against the state as it would be after the earlier ones. The user applies or discards them from the chat, and every applied set can be undone (`src/state/changes-store.tsx`). Each message carries a fresh text snapshot of tasks, blocks, the week's calendar, windows, settings and focus. The system prompt and tools are byte-identical across requests, and history is append-only, so cached and preserved reasoning stay valid; `drop_block` is the safety net. Morning plan and evening wrap-up are one-tap check-ins on Today, offered once a day and never pushed.

**Originally planned order (items 2 to 4 are now done):**

2. **Backend skeleton (small):** a Supabase project, email magic-link auth, and two Edge Functions (`assistant` and `google-oauth`). Tasks and blocks stay local-first; sync can follow later. Auth is needed now only because the AI and OAuth must run server-side.
3. **Google Calendar, read-only:** OAuth (PKCE via `expo-auth-session`), with the code exchanged in the Edge Function and the refresh token encrypted in `integration_secrets`. A `GoogleCalendarProvider` behind the existing interface, using `events.list` and `freeBusy` across the user's chosen calendars. From then on the planner uses real availability. This needs a development build, not Expo Go, for the OAuth redirect.
4. **Real AI:** `RemoteAssistant` → Edge Function → LLM, with `PlanRequest` (and the simple actions) as the structured-output schema. The context is minimal (counts, titles, free/busy, never message bodies), the output is validated with zod, and it falls back to the mock if the call fails.
5. **Calendar write (opt-in):** "Add set-aside time to Google Calendar" on the review screen. Each plan needs explicit confirmation, and every write is logged in `assistant_actions`.
6. **Gmail** (after Google's restricted-scope verification), then native attention features (Screen Time / UsageStats).
---

## 7. Platform limitations & risks

| Area | Limitation / risk | Mitigation |
|---|---|---|
| **iOS app blocking** | Requires the Screen Time API (FamilyControls, ManagedSettings, DeviceActivity), a special Apple entitlement, user authorization, and native extensions. The app cannot see which apps are chosen (opaque tokens). | Native Expo Module and config plugin in a later milestone. Apply for the entitlement early. The prototype says plainly that it cannot block apps. |
| **Android usage limits** | `PACKAGE_USAGE_STATS` needs a manual grant in Settings. Accessibility-service blocking is restricted by Play policy. | Use UsageStats for insights only. No Accessibility workarounds. |
| **Notifications from other apps** | Neither OS lets third-party apps silence other apps' notifications (Android's listener can only read). | Point users to OS Focus / Do Not Disturb modes; do not try to bypass them. |
| **Expo Go** | Fine for this milestone (no custom native code). Native attention features will need a development build (`expo-dev-client`). | Plan the EAS development build before milestone 7. |
| **Background timers** | JS timers pause in the background. | The timer stores absolute timestamps and catches up on resume. A scheduled local notification fires at the end even if the app is closed. |
| **Notifications in Expo Go** | Expo Go has limited notification support (no remote push on Android). This app uses only local notifications. | If local notifications misbehave in Expo Go, use a development build. That is needed for Google OAuth anyway. |
| **Plan quality** | The rule-based mock understands a narrow set of phrasings. | Replaced by the LLM behind the same `PlanRequest` schema. The planner stays deterministic and tested either way. |
| **Google OAuth verification** | Gmail scopes are "restricted" and require Google's security assessment (CASA), which takes time and costs money. | Start with Calendar read-only. Budget for the assessment before Gmail. |
| **AI privacy & correctness** | Sending email content to an LLM is sensitive, and models can misread intent. | Server-side only, minimal context, no storage of bodies, structured output with validation, and confirmation of every action. |
| **Local data security** | AsyncStorage is unencrypted. | Fine for tasks. Tokens never live on the device; any device secret uses `expo-secure-store`. |
| **Engagement creep** | Features drift toward "time in app". | Product rule: no streaks, feeds, badges or engagement notifications. Insights are descriptive only. |
| **Time zones / DST** | Dates are stored as local `YYYY-MM-DD`. | Server stores `profiles.time_zone`. Event times stay as ISO timestamps. |
