/**
 * Daily medication reminder scheduling via expo-notifications, with
 * per-profile isolation (v0.2 — IVA-1184).
 *
 * Each scheduled notification carries `{tag: 'companion-meds-reminder',
 * profileId: <id>}` in its data field. Cancellation filters by profileId
 * so switching profiles never leaves stale reminders firing for the
 * inactive profile.
 *
 * Public API:
 *   scheduleMedicationRemindersFor(profileId, config)
 *   cancelMedicationRemindersFor(profileId)
 *   cancelAllCompanionReminders()
 *   handleProfileSwitch(newActiveProfileId, newConfig?)
 *
 * The first three are surgical primitives. `handleProfileSwitch` is the
 * one Settings + the registry call when the active profile changes.
 */
import * as Notifications from 'expo-notifications';
import type { CompanionConfig } from './companionStore';
import { t } from './companionI18n';
import { getProfileById } from './profileRegistry';

const COMPANION_CHANNEL_ID = 'companion-meds';
const REMINDER_TAG = 'companion-meds-reminder';

export interface ReminderData {
  tag: 'companion-meds-reminder';
  profileId: string;
}

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

async function cancelMatchingScheduled(predicate: (d: ReminderData | null) => boolean) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const data = (n.content?.data as ReminderData | null) ?? null;
    const isReminder = data?.tag === REMINDER_TAG;
    if (isReminder && predicate(data)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Cancel only the reminders that belong to a specific profile.
 */
export async function cancelMedicationRemindersFor(profileId: string): Promise<void> {
  await cancelMatchingScheduled((d) => !!d && d.profileId === profileId);
}

/**
 * Cancel every companion reminder on the device regardless of profile. Used
 * by the "Erase all companion data" flow and as a defensive sweep before
 * scheduling a new batch.
 */
export async function cancelAllCompanionReminders(): Promise<void> {
  await cancelMatchingScheduled(() => true);
}

/**
 * Cancel reminders for every profile EXCEPT the given one. Use when
 * switching active profile — clears the inactive profile's reminders
 * without touching the new active profile's batch.
 */
export async function cancelOtherProfilesMedicationReminders(
  activeProfileId: string
): Promise<void> {
  await cancelMatchingScheduled((d) => !!d && d.profileId !== activeProfileId);
}

/**
 * Schedule all of `config.medications` for `profileId`. Cancels this
 * profile's previously-scheduled reminders first (so removing a med
 * actually removes its alarm).
 *
 * Returns the count of notifications actually scheduled.
 */
export async function scheduleMedicationRemindersFor(
  profileId: string,
  config: CompanionConfig
): Promise<number> {
  await ensureNotificationSetup();
  const granted = await requestPermissions();
  if (!granted) return 0;
  await cancelMedicationRemindersFor(profileId);

  const lang = config.language;
  let scheduled = 0;
  for (const med of config.medications) {
    for (const time of med.schedule) {
      const [h, m] = time.split(':').map((s) => parseInt(s, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const body =
        med.gentleReminderText ||
        `${med.displayName} — ${med.dosage}. ${t(lang, 'meds_due_now')}.`;
      const data: ReminderData = { tag: REMINDER_TAG, profileId };
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t(lang, 'meds_section_title'),
          body,
          data,
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

/**
 * Called whenever the active profile changes (via the profile picker or
 * the Settings switcher). Cancels every other profile's reminders, then
 * — if the new active profile is a patient — re-schedules its batch.
 *
 * The caller passes `newConfig` (loaded under the new active profile)
 * so this function doesn't need to know how to load companion config.
 */
export async function handleProfileSwitch(
  newActiveProfileId: string,
  newConfig: CompanionConfig | null
): Promise<void> {
  await cancelOtherProfilesMedicationReminders(newActiveProfileId);

  const profile = await getProfileById(newActiveProfileId);
  if (!profile) return;
  if (profile.kind === 'patient' && newConfig) {
    await scheduleMedicationRemindersFor(newActiveProfileId, newConfig);
  }
}

// ─── Back-compat shim ───────────────────────────────────────────────
// The v0.1 wizard called `scheduleMedicationReminders(config)` without a
// profileId. v0.2 callers must use `scheduleMedicationRemindersFor(id, config)`.
// Keep the old name routing to the active profile so the wizard's call
// site doesn't need to thread profile id explicitly.
export async function scheduleMedicationReminders(
  config: CompanionConfig
): Promise<number> {
  const { getActiveProfileId } = await import('./profileRegistry');
  const id = await getActiveProfileId();
  if (!id) throw new Error('scheduleMedicationReminders: no active profile');
  return scheduleMedicationRemindersFor(id, config);
}

export async function clearScheduledMedicationReminders(): Promise<void> {
  const { getActiveProfileId } = await import('./profileRegistry');
  const id = await getActiveProfileId();
  if (!id) {
    // No active profile yet (e.g. user is on profile picker) — clear all.
    await cancelAllCompanionReminders();
    return;
  }
  await cancelMedicationRemindersFor(id);
}
