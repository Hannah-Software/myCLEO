/**
 * Daily medication reminder scheduling via expo-notifications. Cancels any
 * previously-scheduled companion notifications and schedules a daily
 * repeating reminder for each (medication × time) pair in the config.
 *
 * Gentle wording, no scolding. Tap on the notification opens the app to
 * the Medications card.
 */
import * as Notifications from 'expo-notifications';
import type { CompanionConfig } from './companionStore';
import { t } from './companionI18n';

const COMPANION_CHANNEL_ID = 'companion-meds';

// Tag every notification we create so we can clear them without touching
// other notifications the host app (myCLEO power-user mode) might own.
const COMPANION_TAG = { tag: 'companion-meds-reminder' };

export async function ensureNotificationSetup() {
  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (require('react-native').Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(COMPANION_CHANNEL_ID, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function clearScheduledMedicationReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const tag = (n.content?.data as any)?.tag;
    if (tag === COMPANION_TAG.tag) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleMedicationReminders(config: CompanionConfig): Promise<number> {
  await ensureNotificationSetup();
  const granted = await requestPermissions();
  if (!granted) return 0;
  await clearScheduledMedicationReminders();

  const lang = config.language;
  let scheduled = 0;
  for (const med of config.medications) {
    for (const time of med.schedule) {
      const [h, m] = time.split(':').map((s) => parseInt(s, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const body = med.gentleReminderText
        || `${med.displayName} — ${med.dosage}. ${t(lang, 'meds_due_now')}.`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t(lang, 'meds_section_title'),
          body,
          data: COMPANION_TAG,
          sound: 'default',
        },
        trigger: {
          hour: h,
          minute: m,
          repeats: true,
          channelId: COMPANION_CHANNEL_ID,
        },
      });
      scheduled++;
    }
  }
  return scheduled;
}
