# Phone test checklist (about 10 minutes)

The goal is to check what can't be tested in the cloud: deep links, Google sign-in, notifications, and how it feels on a real phone. Note anything that's broken, confusing or annoying. Rough notes are fine.

## Setup
1. On your computer: `git pull`, then `cd intentional`, `npm install`, `npx expo start`.
2. Open the app in Expo Go by scanning the QR code. Use `npx expo start --tunnel` if the phone can't connect.

## 1. First impression (1 min)
- [ ] The welcome screen appears. Tap **Look around first**.
- [ ] Today, Messages, Plan and Focus all open from the tab bar, and the icons and labels look right.
- [ ] Nothing overlaps the notch, status bar or home indicator.

## 2. Sign in (2 min)
- [ ] **Focus → Account & connections → Manage**. Enter your email, then tap **Email me a sign-in link**.
- [ ] Open the email **on the phone** and tap the link. It should reopen the app, signed in.
  - If it opens a browser error page instead, screenshot it.
  - If no email arrives within a couple of minutes, check spam. Supabase's free email sender only sends a few per hour.

## 3. Google Calendar (2 min)
- [ ] Tap **Connect Google Calendar**. On Google's "unverified app" warning, tap **Advanced → Go to Intentional**, then allow calendar access.
- [ ] You land back in the app and the status says **Connected**.
- [ ] **Today → Coming up** and **Plan** show your real events. The "Sample calendar" label should be gone.

## 4. The main thing: planning (3 min)
- [ ] Tap **Capture or ask…** and send: *"I have a busy week. Organize my priorities, find time for exercise, remind me of anything important, and give me two windows each day to respond to messages."*
- [ ] The reply is labelled **Claude**, not "On-device assistant".
- [ ] **Review the plan**: do the times make sense against your real calendar? Untick one item, then apply.
- [ ] Plan shows the set-aside blocks. **Undo plan** removes them.
- [ ] Try a follow-up in your own words, e.g. *"remind me to call Mum Sunday at 6pm"*.

## 5. Notifications (2 min)
- [ ] Add a reminder for 2–3 minutes from now (Plan → **Add to this day** → Reminder, with a time). Allow notifications when asked.
- [ ] Lock the phone. The notification arrives on time.
- [ ] Start a 1-minute focus session (Focus → **−5** down to 1 min), then leave the app. You get a "Focus session complete" notification.

## What to send back
- Anything that failed (a screenshot is ideal), especially in steps 2, 3 and 5.
- Whether the plan in step 4 matched how you'd actually want your week arranged.
- The one thing that felt most wrong or most missing.
