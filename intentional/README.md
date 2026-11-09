# Intentional

An AI personal operating system for digital wellbeing. It organizes your day and protects your attention, and the best use of it is a short one.

**Status: milestone 1 prototype.** Everything runs on the device. The calendar, messages and assistant are **mock implementations**, labelled as sample data in the UI. Nothing connects to Google, Supabase or an LLM yet.

The design write-up is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). It covers the architecture, folder structure, schema, screens, dependencies, plan and platform risks.

## What works

- **Today:** the next suggested action, three priorities, upcoming events and message status.
- **Messages:** a triaged queue with summaries, communication windows, mark done, a draft preview (never sent), and turning a message into a task.
- **Plan:** day and week planning. Tasks and reminders can be created, edited, completed and deleted, and they persist on the device.
- **Focus:** a timer that survives backgrounding and restarts, weekly insights with no streaks, and attention settings.
- **Capture or ask:** a natural-language input on every tab, backed by a deterministic mock assistant.

## Develop

```bash
cd intentional
npm install
npm test            # unit tests (domain, AI parser, assistant, persistence)
npm run typecheck   # tsc --noEmit, strict
npm run lint
```

## Run on a physical device

This milestone has no custom native code, so **Expo Go** is enough.

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

To preview in a browser instead, run `npx expo start --web`.

Later milestones (Screen Time and usage access) will need a development build (`npx expo install expo-dev-client`, then `eas build --profile development`). Expo Go can't load custom native modules.
