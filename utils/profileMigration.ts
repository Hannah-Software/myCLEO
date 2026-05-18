/**
 * One-shot legacy data migration — IVA-1184.
 *
 * v0.1 stored everything at unprefixed keys. v0.2 namespaces by profile id.
 * On the first launch after upgrade, detect any pre-existing patient or
 * power-user data and move it into a synthesized "Default" profile so the
 * user doesn't lose anything.
 *
 * Runs once. Idempotent: a second call after `@profiles/v1/migrated = '1'`
 * is set is a no-op.
 *
 * Called from CleoProvider during app startup, before any screen mounts
 * that depends on profileStorage / profileSecure.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  createProfile, setActiveProfileId, listProfiles, _resetCacheForTesting,
} from './profileRegistry';

const MIGRATED_KEY = '@profiles/v1/migrated';

// Legacy AsyncStorage keys to detect + relocate
const LEGACY_COMPANION_CONFIG = '@companion/config/v1';
const LEGACY_CHAT_THREAD = 'cleo.chat.thread.v1';
const LEGACY_OFFLINE_QUEUE = 'cleo.offline.queue.v1';
const LEGACY_PUSH_TOKEN = 'cleo.push.lastToken';

// Legacy SecureStore keys
const LEGACY_PIN = 'companion.caregiverPin.v1';
const LEGACY_BRIDGE_KEY = 'cleo.bridge.apiKey';

interface MigrationResult {
  migrated: boolean;
  createdProfiles: string[];
  movedKeys: number;
  reason?: string;
}

export async function migrateLegacyDataIfNeeded(): Promise<MigrationResult> {
  // Already done?
  if ((await AsyncStorage.getItem(MIGRATED_KEY)) === '1') {
    return { migrated: false, createdProfiles: [], movedKeys: 0, reason: 'already-migrated' };
  }
  // Already have profiles? (Fresh install will fall into this branch — first
  // call writes the migrated flag with no action so we don't re-run forever.)
  const existing = await listProfiles();
  if (existing.length > 0) {
    await AsyncStorage.setItem(MIGRATED_KEY, '1');
    return { migrated: false, createdProfiles: [], movedKeys: 0, reason: 'profiles-already-exist' };
  }

  const patientData = await detectPatient();
  const powerData = await detectPowerUser();
  const createdProfiles: string[] = [];
  let movedKeys = 0;

  if (patientData.present) {
    const p = await createProfile({ name: 'Default Patient', kind: 'patient' });
    createdProfiles.push(p.id);
    movedKeys += await migrateAsyncStorageKey(LEGACY_COMPANION_CONFIG, p.id, LEGACY_COMPANION_CONFIG);
    // Dose-taken markers: their keys are @companion/doses/<date>/<med>/<time>.
    // Walk all AsyncStorage keys, move the ones with that prefix.
    movedKeys += await migrateAsyncStoragePrefix('@companion/doses/', p.id);
    // PIN
    movedKeys += await migrateSecureStoreKey(LEGACY_PIN, p.id, LEGACY_PIN);
    await setActiveProfileId(p.id);
  }

  if (powerData.present) {
    const p = await createProfile({ name: 'Default Ivan', kind: 'power-user' });
    createdProfiles.push(p.id);
    movedKeys += await migrateAsyncStorageKey(LEGACY_CHAT_THREAD, p.id, LEGACY_CHAT_THREAD);
    movedKeys += await migrateAsyncStorageKey(LEGACY_OFFLINE_QUEUE, p.id, LEGACY_OFFLINE_QUEUE);
    movedKeys += await migrateSecureStoreKey(LEGACY_BRIDGE_KEY, p.id, LEGACY_BRIDGE_KEY);
    // Activate the power-user profile if it's more recently used, else stay
    // on the patient profile we may have just set active.
    if (!patientData.present) {
      await setActiveProfileId(p.id);
    } else if (powerData.lastTouchedMs > patientData.lastTouchedMs) {
      await setActiveProfileId(p.id);
    }
  }

  await AsyncStorage.setItem(MIGRATED_KEY, '1');
  _resetCacheForTesting(); // refresh in-memory registry cache so caller sees new state
  return {
    migrated: createdProfiles.length > 0,
    createdProfiles,
    movedKeys,
    reason: createdProfiles.length === 0 ? 'no-legacy-data' : undefined,
  };
}

// ─── Detection helpers ──────────────────────────────────────────────

async function detectPatient(): Promise<{ present: boolean; lastTouchedMs: number }> {
  const raw = await AsyncStorage.getItem(LEGACY_COMPANION_CONFIG);
  if (!raw) return { present: false, lastTouchedMs: 0 };
  let ts = 0;
  try {
    const parsed = JSON.parse(raw);
    ts = Number(parsed?.updatedAt) || 0;
  } catch { /* keep ts = 0 */ }
  return { present: true, lastTouchedMs: ts };
}

async function detectPowerUser(): Promise<{ present: boolean; lastTouchedMs: number }> {
  const chat = await AsyncStorage.getItem(LEGACY_CHAT_THREAD);
  const queue = await AsyncStorage.getItem(LEGACY_OFFLINE_QUEUE);
  let bridgeKey: string | null = null;
  try {
    bridgeKey = await SecureStore.getItemAsync(LEGACY_BRIDGE_KEY);
  } catch { /* SecureStore may be unavailable in some envs (e.g. web) */ }
  const present = !!chat || !!queue || !!bridgeKey;
  if (!present) return { present: false, lastTouchedMs: 0 };
  // Approximate the recency from the last chat message timestamp
  let ts = 0;
  if (chat) {
    try {
      const arr = JSON.parse(chat);
      if (Array.isArray(arr) && arr.length > 0) {
        ts = Number(arr[arr.length - 1]?.timestamp) || 0;
      }
    } catch { /* keep ts = 0 */ }
  }
  return { present: true, lastTouchedMs: ts };
}

// ─── Move helpers ───────────────────────────────────────────────────

async function migrateAsyncStorageKey(
  legacyKey: string,
  profileId: string,
  newSubKey: string
): Promise<number> {
  const raw = await AsyncStorage.getItem(legacyKey);
  if (raw === null) return 0;
  await AsyncStorage.setItem(`@profile/${profileId}/${newSubKey}`, raw);
  await AsyncStorage.removeItem(legacyKey);
  return 1;
}

async function migrateAsyncStoragePrefix(
  legacyPrefix: string,
  profileId: string
): Promise<number> {
  const allKeys = await AsyncStorage.getAllKeys();
  const matched = allKeys.filter((k) => k.startsWith(legacyPrefix));
  if (matched.length === 0) return 0;
  let moved = 0;
  for (const k of matched) {
    const val = await AsyncStorage.getItem(k);
    if (val === null) continue;
    await AsyncStorage.setItem(`@profile/${profileId}/${k}`, val);
    await AsyncStorage.removeItem(k);
    moved++;
  }
  return moved;
}

async function migrateSecureStoreKey(
  legacyKey: string,
  profileId: string,
  newSubKey: string
): Promise<number> {
  let value: string | null = null;
  try {
    value = await SecureStore.getItemAsync(legacyKey);
  } catch { /* SecureStore unavailable */ }
  if (value === null) return 0;
  try {
    await SecureStore.setItemAsync(`profile.${profileId}.${newSubKey}`, value);
    await SecureStore.deleteItemAsync(legacyKey);
    return 1;
  } catch {
    return 0;
  }
}
