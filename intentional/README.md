# Intentional

An AI personal operating system for digital wellbeing. It organizes your day and protects your attention, and the best use of it is a short one.

**Status: milestone 1.5.** Everything runs on the device. Notifications are real (local). The calendar, messages and assistant are still **mock implementations**, labelled as sample data in the UI. Nothing connects to Google, Supabase or an LLM yet.

The design write-up is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). It covers the architecture, folder structure, schema, screens, dependencies, plan and platform risks.

## What works

- **Today:** the next suggested action, three priorities, upcoming events and message status.
- **Messages:** a triaged queue with summaries, communication windows, mark done, a draft preview (never sent), and turning a message into a task.
- **Plan:** day and week planning. Tasks and reminders can be created, edited, completed and deleted, and they persist on the device.
- **Focus:** a timer that survives backgrounding and restarts, weekly insights with no streaks, and attention settings.
- **Capture or ask:** a natural-language input on every tab, backed by a deterministic mock assistant.
- **Planning:** ask something like *"I have a busy week. Organize my priorities, find time for exercise, remind me of anything important, and give me two windows each day to respond to messages."* You get a concrete plan to review: message-window times that avoid meetings, exercise in free time, priorities, and "leave for…" reminders. Apply it, and undo it if needed.
- **Notifications:** reminders, the end of a focus session, the start of set-aside time, and message windows opening. They are quiet, asked for in context, and never used to pull you back into the app.

## Develop

```bash
cd intentional
npm install
npm test            # unit tests (domain, AI parser, assistant, persistence)
npm run typecheck   # tsc --noEmit, strict
npm run lint
```

## Run on a physical device

This milestone has no custom native code, so **Expo Go** should be enough. Notifications are local only. If they don't fire in Expo Go, use a development build; the Google Calendar milestone needs one anyway.

1. Install **Expo Go** from the App Store or Google Play. It must support SDK 57.
2. On your computer, from `intentional/`:
   ```bash
   npx expo start
   ```
3. Scan the QR code in the terminal: on iPhone with the Camera app, on Android from inside Expo Go.
4. If your phone and computer are on different networks, or the connection is blocked, use a tunnel:
   ```bash
   npx expo start --tunnel
   ```

To preview in a browser instead, run `npx expo start --web`. Notifications aren't available on web.

Later milestones (Screen Time and usage access) will need a development build (`npx expo install expo-dev-client`, then `eas build --profile development`). Expo Go can't load custom native modules.
