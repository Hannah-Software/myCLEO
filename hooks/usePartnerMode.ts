import { useState, useEffect } from 'react';

export interface PartnerCheckIn {
  id: string;
  partner: 'kerri' | 'girlfriend';
  timestamp: string;
  mood: number; // 1-10
  energy: number; // 1-10
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export const usePartnerMode = () => {
  const [checkIns, setCheckIns] = useState<PartnerCheckIn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todaysCheckIn, setTodaysCheckIn] = useState<PartnerCheckIn | null>(null);

  const fetchCheckIns = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Connect to PocketBase
      // For now, use mock data
      const today = new Date().toISOString().split('T')[0];
      const mockCheckIns: PartnerCheckIn[] = [
        {
          id: 'checkin-1',
          partner: 'kerri',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          mood: 7,
          energy: 6,
          notes: 'Good morning, had coffee',
          syncStatus: 'synced',
        },
      ];

      setCheckIns(mockCheckIns);

      // Check for today's check-in
      const todayCheckin = mockCheckIns.find(ci => ci.timestamp.startsWith(today));
      setTodaysCheckIn(todayCheckin || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch check-ins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckIns();

    // Refresh every 30 minutes
    const interval = setInterval(fetchCheckIns, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const addCheckIn = async (partner: 'kerri' | 'girlfriend', mood: number, energy: number, notes?: string) => {
    const newCheckIn: PartnerCheckIn = {
      id: `checkin-${Date.now()}`,
      partner,
      timestamp: new Date().toISOString(),
      mood,
      energy,
      notes,
      syncStatus: 'pending',
    };

    setCheckIns(prev => [newCheckIn, ...prev]);
    setTodaysCheckIn(newCheckIn);

    // TODO: Sync to PocketBase
    try {
      // await fetch('/api/partner-checkins', { method: 'POST', body: JSON.stringify(newCheckIn) })
      // newCheckIn.syncStatus = 'synced'
    } catch (err) {
      setError('Failed to sync check-in');
      newCheckIn.syncStatus = 'error';
    }

    return newCheckIn;
  };

  const getMoodTrend = (partner: 'kerri' | 'girlfriend', days: number = 7): number[] => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return checkIns
      .filter(ci => ci.partner === partner && new Date(ci.timestamp) >= cutoff)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(ci => ci.mood);
  };

  const getEnergyTrend = (partner: 'kerri' | 'girlfriend', days: number = 7): number[] => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return checkIns
      .filter(ci => ci.partner === partner && new Date(ci.timestamp) >= cutoff)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(ci => ci.energy);
  };

  return {
    checkIns,
    todaysCheckIn,
    loading,
    error,
    refresh: fetchCheckIns,
    addCheckIn,
    getMoodTrend,
    getEnergyTrend,
  };
};
