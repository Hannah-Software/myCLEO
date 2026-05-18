/**
 * Profile registry — multi-tenant identity layer for myCLEO.
 *
 * The whole app is profile-scoped. Every read/write of patient or power-user
 * state goes through `profileStorage` / `profileSecure`, both of which
 * prefix keys with the active profile id. The registry below is the only
 * UNPREFIXED state — it holds the list of profiles and the active pointer.
 *
 * Test mode (`EXPO_PUBLIC_TEST_PROFILES=1`) exposes the profile picker UI
 * and allows multiple coexisting profiles. Production mode hides the
 * picker; the app behaves as if there's exactly one profile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const INDEX_KEY = '@profiles/v1/index';
const ACTIVE_KEY = '@profiles/v1/active';

export type ProfileKind = 'patient' | 'power-user';

export interface Profile {
  id: string;
  name: string;
  kind: ProfileKind;
  createdAt: string;
  lastUsedAt: string;
  avatarUri?: string;
}

interface ProfilesState {
  profiles: Profile[];
}

let _cache: ProfilesState | null = null;
let _activeId: string | null | undefined = undefined; // undefined = not yet loaded

async function loadState(): Promise<ProfilesState> {
  if (_cache) return _cache;
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) {
      _cache = { profiles: [] };
    } else {
      const parsed = JSON.parse(raw);
      _cache = {
        profiles: Array.isArray(parsed?.profiles) ? parsed.profiles : [],
      };
    }
  } catch {
    _cache = { profiles: [] };
  }
  return _cache!;
}

async function persistState(): Promise<void> {
  if (!_cache) return;
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(_cache));
}

export async function listProfiles(): Promise<Profile[]> {
  const s = await loadState();
  return [...s.profiles];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const s = await loadState();
  return s.profiles.find((p) => p.id === id) || null;
}

export async function getActiveProfileId(): Promise<string | null> {
  if (_activeId !== undefined) return _activeId;
  try {
    _activeId = await AsyncStorage.getItem(ACTIVE_KEY);
  } catch {
    _activeId = null;
  }
  return _activeId;
}

export async function getActiveProfile(): Promise<Profile | null> {
  const id = await getActiveProfileId();
  if (!id) return null;
  return getProfileById(id);
}

export async function setActiveProfileId(id: string | null): Promise<void> {
  if (id === null) {
    await AsyncStorage.removeItem(ACTIVE_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_KEY, id);
  }
  _activeId = id;
}

export async function createProfile(input: {
  name: string;
  kind: ProfileKind;
  avatarUri?: string;
  id?: string; // optional; default to a generated id
}): Promise<Profile> {
  const s = await loadState();
  const id = input.id || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const profile: Profile = {
    id,
    name: input.name.trim() || 'New profile',
    kind: input.kind,
    createdAt: now,
    lastUsedAt: now,
    avatarUri: input.avatarUri,
  };
  s.profiles.push(profile);
  await persistState();
  return profile;
}

export async function touchProfile(id: string): Promise<void> {
  const s = await loadState();
  const p = s.profiles.find((x) => x.id === id);
  if (!p) return;
  p.lastUsedAt = new Date().toISOString();
  await persistState();
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const s = await loadState();
  const p = s.profiles.find((x) => x.id === id);
  if (!p) return;
  p.name = name.trim() || p.name;
  await persistState();
}

export async function deleteProfile(id: string): Promise<void> {
  const s = await loadState();
  s.profiles = s.profiles.filter((p) => p.id !== id);
  await persistState();
  // If we just deleted the active profile, clear or promote the next one.
  const active = await getActiveProfileId();
  if (active === id) {
    const next = s.profiles[0]?.id ?? null;
    await setActiveProfileId(next);
  }
  // Best-effort key cleanup
  try {
    const keys = await AsyncStorage.getAllKeys();
    const owned = keys.filter((k) => k.startsWith(`@profile/${id}/`));
    if (owned.length) await AsyncStorage.multiRemove(owned);
  } catch {
    /* non-fatal */
  }
}

/**
 * Switch to a different profile. Caller is responsible for notification
 * cancel + re-schedule (see `companionNotifications.handleProfileSwitch`).
 * This function does the storage half only.
 */
export async function switchToProfile(id: string): Promise<Profile> {
  const p = await getProfileById(id);
  if (!p) throw new Error(`switchToProfile: unknown id ${id}`);
  await setActiveProfileId(id);
  await touchProfile(id);
  return p;
}

/**
 * Used by ProfileSwitcher UI / app/index.tsx to decide whether to show the
 * picker. When false (production build for mom), the app behaves single-tenant.
 */
export function isTestMode(): boolean {
  return process.env.EXPO_PUBLIC_TEST_PROFILES === '1';
}

/**
 * Hint from the build profile for which kind to default when creating the
 * very first profile. Mom-prod build sets COMPANION_DEFAULT=1 so the wizard
 * starts in patient kind. Tester build leaves it unset; the user picks.
 */
export function defaultFirstProfileKind(): ProfileKind {
  return process.env.EXPO_PUBLIC_COMPANION_DEFAULT === '1' ? 'patient' : 'power-user';
}

/**
 * Test-only: clear the in-memory cache so a unit test or a hot-reload
 * picks up fresh AsyncStorage state.
 */
export function _resetCacheForTesting(): void {
  _cache = null;
  _activeId = undefined;
}
