# Intentional: Milestone 1 Design

> The best interaction with this app is a short one that helps someone return to their actual life.

This document covers the deliverables requested before implementation: the architecture, folder structure, database schema, screen and navigation spec, dependencies, implementation plan, and platform limitations and risks. It describes the code as built in milestone 1.

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
    │   └── command.tsx                  Global "Capture or ask" input
    ├── domain/                          pure business logic + tests
    │   ├── dates.ts, result.ts, calendar.ts
    │   ├── tasks/       task.ts (validation, create/edit), task-reducer.ts, priorities.ts
    │   ├── planning/    agenda.ts (day agenda, week overview, unplanned)
    │   ├── focus/       focus-timer.ts (state machine), focus-history.ts (insights)
    │   ├── communications/ communication.ts (triage queue, windows)
    │   └── today/       next-action.ts
    ├── ai/              assistant.ts (contract), intent-parser.ts, mock-assistant.ts
    ├── integrations/    types.ts, calendar/{provider,mock}, mail/{provider,mock}
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

RLS is enabled on every table, and each row is limited to `auth.uid()`.

---

## 4. Screen & navigation specification

Root `Stack` (headerless), containing a bottom `Tabs` navigator and three modals.

| Route | Purpose: what does the user need to do, and how fast can they leave? |
|---|---|
| **Today** `/` | See the single **next suggested action** (focus session › wind-down › imminent event › replies while a window is open › top priority › "put the phone down"), up to **three priorities** (with one-tap "Prioritise" suggestions), the rest of today's events, and a one-line message status. Usually done in under 10 seconds. |
| **Messages** `/communications` | Triage queue grouped as *Needs a reply* / *Worth reading* / *Can wait*, with summaries labelled as mock. Outside communication windows, only time-sensitive items show, with a count of held items and "Show them anyway". Actions: **Done**, **Draft reply** (shows a suggestion and states that sending is unavailable), **Make task**. |
| **Plan** `/plan` | Segmented **Day / Week**. Day: date stepper, calendar, tasks (overdue, then timed, then anytime), "Add to this day". Week: seven day cards with counts and previews, a gentle "looks full" note, tap to open a day. Both show **Not yet planned** for undated captures. Accepts `?view=week&date=YYYY-MM-DD`. |
| **Focus** `/focus` | Start a session (optional intention, preset or ±5 min), pause/resume/end early, and a completion message. **This week**: minutes, sessions, a per-day bar chart, and the change from last week. No streaks or scores. **Attention settings**: communication windows, hold messages, wind-down time, default length, and an honest note about OS-level blocking. |
| **Capture or ask** `/command` (modal) | Reached from the "Capture or ask…" bar at the top of every tab. Type a thought or request, the mock assistant proposes an action, and one tap confirms it. External requests show why they cannot be done and offer a local task instead. |
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
| `expo-status-bar`, `expo-constants`, `expo-linking` | router peers / status bar |
| `react-dom`, `react-native-web` | web preview for quick review |

Dev: `typescript` ~5.9 (strict), `jest` + `jest-expo` + `@types/jest`, `eslint` + `eslint-config-expo`.

These were **deliberately not added yet**: `@supabase/supabase-js`, `expo-auth-session`, `expo-secure-store`, `expo-notifications`, and any date or state library. Each arrives with the milestone that needs it, so the prototype has no dormant network code.

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

**Proposed next milestones (each needs review first):**

2. **Supabase:** auth (email magic link), `SupabaseTaskRepository` with the local document as an offline cache and last-write-wins sync on `updated_at`, then the remaining tables.
3. **Notifications:** `expo-notifications` for reminders and focus completion. These are local only, opt-in, and quiet by default.
4. **Google Calendar (read-only first):** OAuth through an Edge Function, tokens in `integration_secrets`, and a `GoogleCalendarProvider` behind the same interface. Write access comes later and needs per-change confirmation.
5. **Gmail:** server-side triage and summarisation into `communication_items`. Bodies are processed in memory and never stored. Sending requires an explicit review-and-send step.
6. **Server-side LLM:** a `RemoteAssistant` that calls an Edge Function with structured output validated against `ProposedAction`.
7. **Native attention features:** iOS FamilyControls/DeviceActivity and Android UsageStats as Expo Modules, subject to the platform caveats below.

---

## 7. Platform limitations & risks

| Area | Limitation / risk | Mitigation |
|---|---|---|
| **iOS app blocking** | Requires the Screen Time API (FamilyControls, ManagedSettings, DeviceActivity), a special Apple entitlement, user authorization, and native extensions. The app cannot see which apps are chosen (opaque tokens). | Native Expo Module and config plugin in a later milestone. Apply for the entitlement early. The prototype says plainly that it cannot block apps. |
| **Android usage limits** | `PACKAGE_USAGE_STATS` needs a manual grant in Settings. Accessibility-service blocking is restricted by Play policy. | Use UsageStats for insights only. No Accessibility workarounds. |
| **Notifications from other apps** | Neither OS lets third-party apps silence other apps' notifications (Android's listener can only read). | Point users to OS Focus / Do Not Disturb modes; do not try to bypass them. |
| **Expo Go** | Fine for this milestone (no custom native code). Native attention features will need a development build (`expo-dev-client`). | Plan the EAS development build before milestone 7. |
| **Background timers** | JS timers pause in the background. | The timer stores absolute timestamps and catches up on resume. A completion notification arrives with `expo-notifications`. |
| **Google OAuth verification** | Gmail scopes are "restricted" and require Google's security assessment (CASA), which takes time and costs money. | Start with Calendar read-only. Budget for the assessment before Gmail. |
| **AI privacy & correctness** | Sending email content to an LLM is sensitive, and models can misread intent. | Server-side only, minimal context, no storage of bodies, structured output with validation, and confirmation of every action. |
| **Local data security** | AsyncStorage is unencrypted. | Fine for tasks. Tokens never live on the device; any device secret uses `expo-secure-store`. |
| **Engagement creep** | Features drift toward "time in app". | Product rule: no streaks, feeds, badges or engagement notifications. Insights are descriptive only. |
| **Time zones / DST** | Dates are stored as local `YYYY-MM-DD`. | Server stores `profiles.time_zone`. Event times stay as ISO timestamps. |
