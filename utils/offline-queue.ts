/**
 * Offline write queue (IVA-905).
 *
 * Persists failed bridge writes to AsyncStorage so they survive app
 * restarts and a flaky Tailscale link, then replays them when the
 * bridge is reachable again.
 *
 * Only opt-in writes are queued — reads (GET) just fail through, and
 * latency-bound writes (chat) shouldn't queue because the user is
 * waiting for the response. Per-call opt-in via the `enqueueOnFailure`
 * RequestOptions flag in bridge-client.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { BRIDGE_URL, BRIDGE_API_KEY_HEADER, getBridgeApiKey } from "./bridge-client";

const STORAGE_KEY = "cleo.offline.queue.v1";
const MAX_ATTEMPTS = 5;

export interface QueueItem {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  body?: unknown;
  attempts: number;
  queuedAt: number;
  lastError?: string;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function enqueueWrite(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<QueueItem> {
  const queue = await readQueue();
  const item: QueueItem = {
    id: makeId(),
    endpoint,
    method,
    body,
    attempts: 0,
    queuedAt: Date.now(),
  };
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function getQueue(): Promise<QueueItem[]> {
  return readQueue();
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

async function attemptItem(item: QueueItem): Promise<{ ok: boolean; error?: string }> {
  const url = `${BRIDGE_URL}${item.endpoint}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = getBridgeApiKey();
  if (apiKey) headers[BRIDGE_API_KEY_HEADER] = apiKey;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: item.method,
      headers,
      body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface FlushResult {
  attempted: number;
  succeeded: number;
  failed: number;
  dropped: number;
}

let _flushInFlight = false;

/**
 * Replay queued writes. No-op if a flush is already running, so it's
 * safe to call from multiple triggers (network reconnect, app foreground,
 * manual retry button).
 */
export async function flushQueue(): Promise<FlushResult> {
  if (_flushInFlight) return { attempted: 0, succeeded: 0, failed: 0, dropped: 0 };
  _flushInFlight = true;
  try {
    const queue = await readQueue();
    if (queue.length === 0) {
      return { attempted: 0, succeeded: 0, failed: 0, dropped: 0 };
    }

    const remaining: QueueItem[] = [];
    let succeeded = 0;
    let failed = 0;
    let dropped = 0;

    for (const item of queue) {
      const { ok, error } = await attemptItem(item);
      if (ok) {
        succeeded += 1;
        continue;
      }
      const nextAttempts = item.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        dropped += 1;
        console.warn(
          `[offline-queue] dropping ${item.method} ${item.endpoint} after ${nextAttempts} attempts: ${error}`
        );
        continue;
      }
      failed += 1;
      remaining.push({ ...item, attempts: nextAttempts, lastError: error });
    }

    await writeQueue(remaining);
    return { attempted: queue.length, succeeded, failed, dropped };
  } finally {
    _flushInFlight = false;
  }
}
