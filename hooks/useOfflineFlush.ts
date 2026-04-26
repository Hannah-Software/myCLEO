/**
 * useOfflineFlush — replays the offline write queue when the device
 * comes back online and on app foreground.
 *
 * Mount once near the app root (CleoContext) so a single instance
 * coordinates flushes across the whole app.
 */

import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { flushQueue } from "../utils/offline-queue";

export function useOfflineFlush(): void {
  const lastReachable = useRef<boolean | null>(null);

  useEffect(() => {
    const tryFlush = async (reason: string) => {
      try {
        const result = await flushQueue();
        if (result.attempted > 0) {
          console.log(
            `[offline-flush:${reason}] attempted=${result.attempted} succeeded=${result.succeeded} failed=${result.failed} dropped=${result.dropped}`
          );
        }
      } catch (err) {
        console.warn(`[offline-flush:${reason}] error:`, err);
      }
    };

    const netSub = NetInfo.addEventListener((state: NetInfoState) => {
      const reachable = state.isInternetReachable !== false && state.isConnected === true;
      if (reachable && lastReachable.current === false) {
        tryFlush("netinfo-reconnect");
      }
      lastReachable.current = reachable;
    });

    const appSub = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") tryFlush("app-foreground");
    });

    tryFlush("mount");

    return () => {
      netSub();
      appSub.remove();
    };
  }, []);
}
