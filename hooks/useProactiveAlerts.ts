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



export const useProactiveAlerts = () => {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch real alerts from bridge
      const bridgeAlerts = await bridgeClient.getProactiveAlerts();

      // Transform bridge alerts to component format
      const transformedAlerts: ProactiveAlert[] = bridgeAlerts.map(alert => {
        // Map severity to urgency
        const severityMap: Record<string, 'red' | 'yellow' | 'green'> = {
          critical: 'red',
          warning: 'yellow',
          info: 'green',
        };

        return {
          id: alert.id,
          urgency: severityMap[alert.severity] || 'green',
          title: alert.title,
          due: alert.created_at || new Date().toISOString(),
          domain: 'work', // TODO: extract domain from alert title or add to bridge model
          description: alert.description,
        };
      });

      setAlerts(transformedAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      setAlerts([]);
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
