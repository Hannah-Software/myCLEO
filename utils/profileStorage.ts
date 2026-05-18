/**
 * Profile-scoped storage wrappers — every patient or power-user value goes
 * through here so isolation is mechanical, not behavioral.
 *
 * AsyncStorage keys are namespaced as `@profile/<id>/<original-key>`.
 * SecureStore keys are namespaced as `profile.<id>.<original-key>` (dots
 * because some platforms reject special chars in keychain entry names).
 *
 * Both wrappers throw if there's no active profile — that's a programming
 * bug, not a runtime condition. The root layout MUST ensure an active
 * profile exists before any screen mounts that reads/writes user data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getActiveProfileId } from './profileRegistry';

async function requireActiveId(callerName: string): Promise<string> {
  const id = await getActiveProfileId();
  if (!id) {
    throw new Error(
      `${callerName}: no active profile. Root layout must create or pick a profile before mounting screens that read/write user data.`
    );
  }
  return id;
}

export const profileStorage = {
  async getItem(key: string): Promise<string | null> {
    const id = await requireActiveId('profileStorage.getItem');
    return AsyncStorage.getItem(`@profile/${id}/${key}`);
  },
  async setItem(key: string, value: string): Promise<void> {
    const id = await requireActiveId('profileStorage.setItem');
    return AsyncStorage.setItem(`@profile/${id}/${key}`, value);
  },
  async removeItem(key: string): Promise<void> {
    const id = await requireActiveId('profileStorage.removeItem');
    return AsyncStorage.removeItem(`@profile/${id}/${key}`);
  },
};

export const profileSecure = {
  async getItemAsync(key: string): Promise<string | null> {
    const id = await getActiveProfileId();
    if (!id) return null; // SecureStore reads are tolerant — boot-time bridge-auth probes during migration
    return SecureStore.getItemAsync(`profile.${id}.${key}`);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    const id = await requireActiveId('profileSecure.setItemAsync');
    return SecureStore.setItemAsync(`profile.${id}.${key}`, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    const id = await getActiveProfileId();
    if (!id) return;
    try {
      return await SecureStore.deleteItemAsync(`profile.${id}.${key}`);
    } catch {
      /* SecureStore deletes are idempotent; ignore "not found" */
    }
  },
};
