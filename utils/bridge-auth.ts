/**
 * Bridge auth bootstrap (IVA-899).
 *
 * Resolves the CLEO bridge API key in order:
 *   1. expo-secure-store (durable, native-only)
 *   2. EXPO_PUBLIC_BRIDGE_API_KEY env var (Expo Go / dev fallback)
 *   3. null (bridge runs unauthenticated; soft-launch behavior)
 *
 * Stash with setStoredApiKey() the first time the user enters the key in the
 * Settings screen (IVA-910). Reads happen once at app boot from CleoProvider.
 */

import * as SecureStore from "expo-secure-store";
import { setBridgeApiKey } from "./bridge-client";

const SECURE_STORE_KEY = "cleo.bridge.apiKey";

export async function bootstrapBridgeAuth(): Promise<string | null> {
  let key: string | null = null;
  try {
    key = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  } catch (err) {
    console.warn("[bridge-auth] SecureStore read failed:", err);
  }

  if (!key) {
    key = process.env.EXPO_PUBLIC_BRIDGE_API_KEY || null;
  }

  setBridgeApiKey(key);
  return key;
}

export async function setStoredApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_STORE_KEY, key);
  setBridgeApiKey(key);
}

export async function clearStoredApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
  } catch (err) {
    console.warn("[bridge-auth] SecureStore delete failed:", err);
  }
  setBridgeApiKey(null);
}
