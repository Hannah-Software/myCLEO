/**
 * Companion Mode local store — AsyncStorage-backed, no network dependency.
 *
 * Everything an Alzheimer's-tester needs to be useful for the day lives
 * locally on her phone: name, language, primary photo, family contacts,
 * medications, daily schedule. Sync with the CLEO bridge is optional and
 * additive (caregiver-toggled), never load-bearing.
 *
 * Why local-first: mother's phone will not be on Ivan's Tailscale network.
 * The companion experience must work standalone with zero network. Bridge
 * sync, when enabled, mirrors the local state outbound — never the source
 * of truth for what the patient sees.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = '@companion/config/v1';

export type Language = 'en' | 'es';

export interface Contact {
  id: string;
  name: string;         // "Ivan (son)"
  relationship: string; // displayed under name
  phone: string;        // tel:... handled by Linking
  isPrimary?: boolean;  // shown big on Call-for-Help card
}

export interface FamilyPhoto {
  id: string;
  uri: string;          // local file:// or content://
  caption: string;      // "Ivan, your son" — read aloud by TTS
}

export interface Medication {
  id: string;
  displayName: string;  // "The blue pill" or "Aricept" — caregiver chooses
  dosage: string;       // "1 tablet" — keep human-readable
  schedule: string[];   // ["08:00", "20:00"] — 24h HH:mm local
  withFood?: boolean;
  gentleReminderText?: string; // overrides the default i18n string
}

export interface CompanionConfig {
  configVersion: 1;
  setupCompleted: boolean;
  // Identity
  patientName: string;
  preferredGreetingName?: string; // "Mom" vs "Maria"
  homeLocation?: string;          // "your home in Houston"
  // Display
  language: Language;
  largeText: boolean;             // default true
  ttsAutoSpeak: boolean;          // default true on first launch
  // Content
  primaryPhotoUri?: string;       // patient's own picture, shown on Today card
  contacts: Contact[];
  family: FamilyPhoto[];
  medications: Medication[];
  // Caregiver
  caregiverHasSetPin: boolean;
  // Optional outbound sync (off by default)
  bridgeSyncEnabled: boolean;
  bridgeUrl?: string;
  bridgeApiKey?: string;
}

const DEFAULT_CONFIG: CompanionConfig = {
  configVersion: 1,
  setupCompleted: false,
  patientName: '',
  language: 'en',
  largeText: true,
  ttsAutoSpeak: true,
  contacts: [],
  family: [],
  medications: [],
  caregiverHasSetPin: false,
  bridgeSyncEnabled: false,
};

export async function loadConfig(): Promise<CompanionConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    // Merge over defaults so newly-added fields land with sensible values
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: CompanionConfig): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(config));
}

export async function patchConfig(
  patch: Partial<CompanionConfig>
): Promise<CompanionConfig> {
  const current = await loadConfig();
  const next = { ...current, ...patch };
  await saveConfig(next);
  return next;
}

export async function resetConfig(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
}

// ───────────────────────────────────────────────────────────────────
// Today's medication doses derived from the schedule. Pure function so
// the home screen can recompute on a tick without round-tripping storage.
// ───────────────────────────────────────────────────────────────────

export interface DueDose {
  medicationId: string;
  displayName: string;
  dosage: string;
  scheduledFor: string;   // HH:mm local
  withFood?: boolean;
  scheduledDate: Date;
  status: 'upcoming' | 'due-now' | 'overdue' | 'taken';
}

const DOSE_TAKEN_KEY = (medId: string, dateStr: string, time: string) =>
  `@companion/doses/${dateStr}/${medId}/${time}`;

export async function markDoseTaken(
  medicationId: string,
  scheduledFor: string,
  takenAt: Date = new Date()
): Promise<void> {
  const dateStr = takenAt.toISOString().slice(0, 10);
  await AsyncStorage.setItem(
    DOSE_TAKEN_KEY(medicationId, dateStr, scheduledFor),
    takenAt.toISOString()
  );
}

export async function isDoseTaken(
  medicationId: string,
  scheduledFor: string,
  date: Date = new Date()
): Promise<boolean> {
  const dateStr = date.toISOString().slice(0, 10);
  const v = await AsyncStorage.getItem(DOSE_TAKEN_KEY(medicationId, dateStr, scheduledFor));
  return v !== null;
}

export async function computeTodayDoses(
  medications: Medication[],
  now: Date = new Date()
): Promise<DueDose[]> {
  const out: DueDose[] = [];
  for (const med of medications) {
    for (const time of med.schedule) {
      const [h, m] = time.split(':').map((s) => parseInt(s, 10));
      const sched = new Date(now);
      sched.setHours(h, m, 0, 0);
      const taken = await isDoseTaken(med.id, time, now);
      const diffMin = (now.getTime() - sched.getTime()) / 60000;
      let status: DueDose['status'];
      if (taken) status = 'taken';
      else if (diffMin >= 60) status = 'overdue';
      else if (diffMin >= -15) status = 'due-now';
      else status = 'upcoming';
      out.push({
        medicationId: med.id,
        displayName: med.displayName,
        dosage: med.dosage,
        scheduledFor: time,
        withFood: med.withFood,
        scheduledDate: sched,
        status,
      });
    }
  }
  out.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  return out;
}

// ───────────────────────────────────────────────────────────────────
// Caregiver PIN — stored in expo-secure-store, not AsyncStorage.
// Imported lazily so the rest of this module stays safe on web.
// ───────────────────────────────────────────────────────────────────

const PIN_KEY = 'companion.caregiverPin.v1';

export async function setCaregiverPin(pin: string): Promise<void> {
  const secure = await import('expo-secure-store');
  await secure.setItemAsync(PIN_KEY, pin);
  await patchConfig({ caregiverHasSetPin: true });
}

export async function verifyCaregiverPin(pin: string): Promise<boolean> {
  const secure = await import('expo-secure-store');
  const stored = await secure.getItemAsync(PIN_KEY);
  return stored !== null && stored === pin;
}

export async function caregiverPinExists(): Promise<boolean> {
  const secure = await import('expo-secure-store');
  const stored = await secure.getItemAsync(PIN_KEY);
  return stored !== null;
}
