/**
 * Stable per-install device id (IVA-908 audit).
 *
 * expo-constants Constants.deviceId is deprecated in SDK 50+; we generate
 * a UUID-ish id once at first call and persist it in SecureStore. Survives
 * app restarts. New install = new id (acceptable: push-token records on
 * the bridge are keyed by token, not device, so duplicates self-clean.)
 */

import * as SecureStore from "expo-secure-store";

const KEY = "cleo.device.id.v1";

export async function getDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) return existing;
  } catch {
    // fall through and try to generate
  }
  const fresh = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    await SecureStore.setItemAsync(KEY, fresh);
  } catch {
    // SecureStore unavailable (e.g. web) — return the generated value anyway,
    // accepting that it's not stable across reloads in that environment.
  }
  return fresh;
}
