import { useState, useEffect } from 'react';
import { bridgeClient } from '../utils/bridge-client';

export interface ProactiveAlert {
  id: string;
  urgency: 'red' | 'yellow' | 'green';
  severity?: string;
  title: string;
  due: string;
  domain: 'legal' | 'health' | 'family' | 'work' | 'financial';
  description: string;
  actionUrl?: string;
}


const getMockAlerts = (): ProactiveAlert[] => [
  {
    id: 'alert-1',
    urgency: 'red',
    title: 'Harris Case — Summary Motion Due',
    due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    domain: 'legal',
    description: 'Opposing counsel summary motion response due in 2 days. Prep needed.',
  },
];

export const useProactiveAlerts = () => {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Connect to FastAPI bridge GET /alerts endpoint
      // For now, mock data from the daemon's proactive alerts
      const mockAlerts: ProactiveAlert[] = [
        {
          id: 'alert-1',
          urgency: 'red',
          title: 'Harris Case — Summary Motion Due',
          due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          domain: 'legal',
          description: 'Opposing counsel summary motion response due in 2 days. Prep needed.',
        },
        {
          id: 'alert-2',
          urgency: 'yellow',
          title: 'Mom — Weekly Check-in',
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          domain: 'family',
          description: 'Haven\'t talked to mom in 8 days. Schedule a call tomorrow.',
        },
        {
          id: 'alert-3',
          urgency: 'yellow',
          title: 'Vyvanse Refill — Prescription expires',
          due: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          domain: 'health',
          description: 'ADHD medication prescription expires in 3 days. Refill before then.',
        },
        {
          id: 'alert-4',
          urgency: 'green',
          title: 'Q2 Planning — OpsKPI Demo Prep',
          due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          domain: 'work',
          description: 'Prepare OpsKPI demo for Nashville prospects. Planned for next week.',
        },
      ];

      setAlerts(mockAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Refresh every 1 hour
    const interval = setInterval(fetchAlerts, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  const dismissAlert = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const getAlertsByUrgency = (urgency?: 'red' | 'yellow' | 'green'): ProactiveAlert[] => {
    const filtered = urgency ? visibleAlerts.filter(a => a.urgency === urgency) : visibleAlerts;
    return filtered.sort((a, b) => {
      const urgencyOrder = { red: 0, yellow: 1, green: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  };

  const getCriticalAlerts = (): ProactiveAlert[] => {
    return getAlertsByUrgency('red');
  };

  const daysUntilDue = (dueDate: string): number => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return {
    alerts: visibleAlerts,
    loading,
    error,
    refresh: fetchAlerts,
    dismissAlert,
    getAlertsByUrgency,
    getCriticalAlerts,
    daysUntilDue,
  };
};
