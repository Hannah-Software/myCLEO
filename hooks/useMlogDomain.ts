import { useState, useEffect, useCallback } from 'react';
import { bridgeClient } from '../utils/bridge-client';

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

  const fetchDomain = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await bridgeClient.getMlogDomain()) as MlogDomain;
      if (data && typeof data === 'object') {
        setDomain(data);
      }
    } catch (err) {
      // 404 = bridge not yet on the /v1/domains build; treat as "no data" not a hard error
      console.warn('[mlog domain] fetch failed:', err);
      setError('MLOG domain unavailable');
      setDomain(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomain();
  }, [fetchDomain]);

  // Convenience accessor for the production_systems block
  const systems = domain?.payload?.production_systems;

  return { domain, systems, loading, error, refetch: fetchDomain };
}
