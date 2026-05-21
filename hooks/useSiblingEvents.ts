import { useState, useEffect, useCallback } from 'react';
import { bridgeClient, type SiblingEvent } from '../utils/bridge-client';

interface UseSiblingEventsOpts {
  source_repo?: string;
  event_type?: string;
  limit?: number;
  pollMs?: number;
}

export function useSiblingEvents(opts: UseSiblingEventsOpts = {}) {
  const { source_repo, event_type, limit = 50, pollMs = 15 * 60 * 1000 } = opts;
  const [events, setEvents] = useState<SiblingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bridgeClient.getSiblingEvents({
        source_repo,
        event_type,
        consumed: false,
        limit,
      });
      setEvents(res?.items ?? []);
    } catch (err) {
      console.warn('[sibling events] fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Sibling events unavailable');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [source_repo, event_type, limit]);

  useEffect(() => {
    fetchEvents();
    if (pollMs <= 0) return;
    const interval = setInterval(fetchEvents, pollMs);
    return () => clearInterval(interval);
  }, [fetchEvents, pollMs]);

  const ack = useCallback(async (id: number) => {
    // Optimistic: drop locally first, server roundtrip second.
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await bridgeClient.ackSiblingEvent(id);
    } catch (err) {
      console.warn('[sibling events] ack failed (will replay via offline queue):', err);
    }
  }, []);

  return { events, loading, error, refresh: fetchEvents, ack };
}
