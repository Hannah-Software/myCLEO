import React, { createContext, useContext, useEffect, useState } from 'react';
import { CleoMode, OrchestratorState, Phase } from '../src/types';
import { bootstrapBridgeAuth } from '../utils/bridge-auth';
import { useOfflineFlush } from '../hooks/useOfflineFlush';
import { startBridgeReachabilityMonitor } from '../hooks/useBridgeReachability';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { migrateLegacyDataIfNeeded } from '../utils/profileMigration';

interface CleoContextType {
  mode: CleoMode;
  state: OrchestratorState | null;
  phase: Phase | null;
  loading: boolean;
  migrationDone: boolean;
}

const CleoContext = createContext<CleoContextType | undefined>(undefined);

export function CleoProvider({ children }: { children: React.ReactNode }) {
  const [mode] = useState<CleoMode>((process.env.CLEO_MODE as CleoMode) || 'commercial');
  const [state, setState] = useState<OrchestratorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationDone, setMigrationDone] = useState(false);

  // Migration runs FIRST, before bridge-auth bootstrap — bridge-auth now
  // reads from profile-scoped SecureStore, which needs an active profile.
  useEffect(() => {
    (async () => {
      try {
        const result = await migrateLegacyDataIfNeeded();
        if (result.migrated) {
          console.log(
            `[CleoProvider] migrated legacy data: ${result.createdProfiles.length} profile(s), ${result.movedKeys} key(s)`
          );
        }
      } catch (err) {
        console.warn('[CleoProvider] migration failed:', err);
      } finally {
        setMigrationDone(true);
      }
    })();
  }, []);

  // Bridge-auth bootstrap runs AFTER migration so it has an active profile
  // to scope the SecureStore read to. The bridge bootstrap is also tolerant
  // of having no active profile (returns null in that case).
  useEffect(() => {
    if (!migrationDone) return;
    bootstrapBridgeAuth()
      .catch((err) =>
        console.warn('[CleoProvider] bridge-auth bootstrap failed:', err)
      )
      .finally(() => startBridgeReachabilityMonitor());
  }, [migrationDone]);

  useOfflineFlush();
  usePushNotifications();

  return (
    <CleoContext.Provider value={{ mode, state, phase: state?.phase || null, loading, migrationDone }}>
      {children}
    </CleoContext.Provider>
  );
}

export function useCleo() {
  const context = useContext(CleoContext);
  if (!context) {
    throw new Error('useCleo must be used within CleoProvider');
  }
  return context;
}
