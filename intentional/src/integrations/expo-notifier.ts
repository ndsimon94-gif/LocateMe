import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Notifier, PermissionState } from './notifications';

const CHANNEL_ID = 'gentle';

let configured = false;
async function configure() {
  if (configured) return;
  configured = true;
  // In the foreground, show quietly: a banner with no sound.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders and plans',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export const expoNotifier: Notifier = {
  async permission() {
    await configure();
    return toState(await Notifications.getPermissionsAsync());
  },
  async requestPermission() {
    await configure();
    return toState(await Notifications.requestPermissionsAsync());
  },
  async scheduledKeys() {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.map((n) => n.identifier);
  },
  async schedule(n) {
    await configure();
    await Notifications.scheduleNotificationAsync({
      identifier: n.key,
      content: { title: n.title, body: n.body, data: { url: n.url }, sound: n.kind === 'reminder' ? 'default' : undefined },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: CHANNEL_ID },
    });
  },
  async cancel(key) {
    await Notifications.cancelScheduledNotificationAsync(key);
  },
};
