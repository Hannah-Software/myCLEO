import { useState, useEffect, useCallback } from 'react';
import { bridgeClient } from '../utils/bridge-client';
import { loadCachedMlog, saveCachedMlog } from '../utils/mlog-cache';

// Shape served by CLEO bridge GET /v1/domains/mlog (the MLOG sibling adapter
// snapshot). All fields optional/defensive — the bridge may be on an older
// build or the adapter may be partial.
export interface MlogPlanner {
  stays_total?: number;
  currently?: string | null;
  next_stay?: string | null;
  next_start?: string | null;
}
export interface MlogRoadBudget {
  daily_living_usd?: number | null;
  fpl_daily_usd?: number | null;
  under_fpl?: boolean | null;
  complete?: boolean | null;
  road_total_to_date_usd?: number | null;
}
export interface MlogGear {
  total_usd?: number | null;
  item_count?: number | null;
  by_purpose?: Record<string, number>;
}
export interface MlogShooting {
  days?: number;
  coverage?: Record<string, number>;
}
export interface MlogDashboards {
  hub?: string | null;
  guide?: string | null;
  available?: string[];
}
export interface MlogProductionSystems {
  planner?: MlogPlanner;
  road_budget?: MlogRoadBudget;
  gear?: MlogGear;
  shooting_schedule?: MlogShooting;
  dashboards?: MlogDashboards;
}
export interface MlogDomain {
  repo?: string;
  state?: 'ok' | 'stale' | 'unavailable' | string;
  observed_at?: string;
  source?: 'live' | 'persisted' | string;
  payload?: {
    production_systems?: MlogProductionSystems;
    weekly_cadence_compliance?: any;
    [k: string]: any;
  };
}

export function useMlogDomain() {
  const [domain, setDomain] = useState<MlogDomain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const fetchDomain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await bridgeClient.getMlogDomain()) as MlogDomain;
      if (data && typeof data === 'object') {
        setDomain(data);
        setCachedAt(null);
        // Persist for offline rendering on next launch.
        saveCachedMlog(data).catch((e) =>
          console.warn('[mlog domain] cache write failed:', e)
        );
      }
    } catch (err) {
      // 404 = bridge not yet on the /v1/domains build; treat as "no data" not a hard error
      console.warn('[mlog domain] fetch failed:', err);
      setError('MLOG domain unavailable');
      // Do NOT clear `domain` here — if we already hydrated from cache,
      // keep showing the stale snapshot rather than going blank.
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate from cache on mount so the card renders offline before (or instead
  // of) the live fetch resolves. Fire the network fetch right after.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedMlog();
      if (!cancelled && cached && !domain) {
        setDomain(cached.domain);
        setCachedAt(cached.cached_at);
      }
      if (!cancelled) await fetchDomain();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDomain]);

  // Convenience accessor for the production_systems block
  const systems = domain?.payload?.production_systems;

  return { domain, systems, loading, error, cachedAt, refetch: fetchDomain };
}
