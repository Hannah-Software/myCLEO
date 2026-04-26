/**
 * useBridgeReachability — polls /health-check on the bridge to know whether
 * the daemon is actually reachable (NetInfo only tells you the device has
 * internet, not that the Tailscale link to WSL2 is up).
 *
 * Polls every 30s when reachable, every 10s when not, and on AppState
 * foreground. One global hook in CleoContext shares state via a store
 * pattern so individual screens just call useIsBridgeReachable().
 */

import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { bridgeClient } from "../utils/bridge-client";

type ReachabilityState = {
  reachable: boolean;
  lastCheckedAt: number | null;
  lastError: string | null;
};

const initial: ReachabilityState = {
  reachable: true, // optimistic until first probe
  lastCheckedAt: null,
  lastError: null,
};

const listeners = new Set<(s: ReachabilityState) => void>();
let current: ReachabilityState = initial;

function setState(next: Partial<ReachabilityState>) {
  current = { ...current, ...next };
  listeners.forEach((l) => l(current));
}

async function probeOnce(): Promise<void> {
  try {
    await bridgeClient.healthCheck();
    setState({ reachable: true, lastCheckedAt: Date.now(), lastError: null });
  } catch (err) {
    setState({
      reachable: false,
      lastCheckedAt: Date.now(),
      lastError: err instanceof Error ? err.message : String(err),
    });
  }
}

let _started = false;
let _timer: ReturnType<typeof setTimeout> | null = null;

function scheduleNext() {
  if (_timer) clearTimeout(_timer);
  const delay = current.reachable ? 30000 : 10000;
  _timer = setTimeout(async () => {
    await probeOnce();
    scheduleNext();
  }, delay);
}

export function startBridgeReachabilityMonitor(): void {
  if (_started) return;
  _started = true;
  probeOnce().then(scheduleNext);
  AppState.addEventListener("change", (status: AppStateStatus) => {
    if (status === "active") probeOnce().then(scheduleNext);
  });
}

export function useBridgeReachability(): ReachabilityState {
  const [state, setS] = useState<ReachabilityState>(current);
  useEffect(() => {
    listeners.add(setS);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return state;
}
