import { useState, useEffect } from 'react';
import { bridgeClient } from '../utils/bridge-client';

interface MorningBriefing {
  briefing_text: string;
  created_at: string;
  id?: string;
}

export function useLatestBriefing() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bridgeClient.getLatestBriefing();
      if (data && typeof data === 'object' && 'briefing_text' in data) {
        setBriefing(data as MorningBriefing);
      }
    } catch (err) {
      console.error('[briefing hook] fetch failed:', err);
      setError('Failed to load briefing');
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    briefing,
    loading,
    error,
    refetch: fetchBriefing,
  };
}
