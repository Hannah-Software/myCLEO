/**
 * Chat thread persistence (IVA-907).
 * AsyncStorage-backed; single thread for V1. Capped at MAX_MESSAGES so
 * the storage entry can't grow without bound.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatContextSummary } from "./bridge-client";

const STORAGE_KEY = "cleo.chat.thread.v1";
const MAX_MESSAGES = 200;

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  context?: ChatContextSummary;
  error?: boolean;
}

export async function loadThread(): Promise<StoredMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveThread(messages: StoredMessage[]): Promise<void> {
  const trimmed =
    messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export async function clearThread(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
