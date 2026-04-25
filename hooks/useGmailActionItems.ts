/**
 * Gmail action items hook — backed by CLEO's /v1/email/* bridge.
 *
 * This hook reaches inbox state through `bridgeClient`, which talks to
 * CLEO's authenticated FastAPI bridge (X-CLEO-API-Key auth, default
 * http://127.0.0.1:8765). DO NOT introduce a direct Gmail OAuth flow
 * here — every repo polling Gmail directly competes for the same
 * per-user rate limit (LIT outage, 2026-04-25).
 *
 * Canonical reference: ~/Github/claude-hub/docs/integrations/CLEO_EMAIL_API.md
 */
import { useState, useEffect } from 'react';
import { bridgeClient } from '../utils/bridge-client';

export interface GmailActionItem {
  id: string;
  from: string;
  subject: string;
  actionType: 'reply' | 'task' | 'decision' | 'waiting' | 'fyi';
  urgency: 'high' | 'medium' | 'low';
  receivedAt: string;
  preview: string;
}


const getMockItems = (): GmailActionItem[] => [
  {
    id: 'email-1',
    from: 'paul.morrison@pauldavisrestoration.com',
    subject: 'Q2 Operations Review — Need your input',
    actionType: 'task',
    urgency: 'high',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    preview: 'Can you review the attached Q2 ops metrics and provide feedback on the KPI dashboard...',
  },
];

export const useGmailActionItems = () => {
  const [items, setItems] = useState<GmailActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActionItems = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch from FastAPI bridge endpoint
      // Multi-account scan: personal, business, legal, quantum-logos
      const actions = await bridgeClient.getEmailActions();
      
      const mappedItems: GmailActionItem[] = actions.map((action: any, idx: number) => ({
        id: action.id || `email-${idx}`,
        from: action.from_address || 'Unknown',
        subject: action.subject || '(no subject)',
        actionType: action.action_type || 'fyi',
        urgency: action.priority === 'high' ? 'high' : action.priority === 'low' ? 'low' : 'medium',
        receivedAt: action.created_at || new Date().toISOString(),
        preview: action.description || action.subject || '',
      }));

      setItems(mappedItems.length > 0 ? mappedItems : getMockItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Gmail action items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActionItems();

    // Refresh every 15 minutes
    const interval = setInterval(fetchActionItems, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getActionItemsFiltered = (filter?: 'high' | 'medium' | 'low' | 'all'): GmailActionItem[] => {
    if (!filter || filter === 'all') return items;
    return items.filter(item => item.urgency === filter);
  };

  const getActionItemsGroupedByType = () => {
    const grouped: Record<string, GmailActionItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.actionType]) {
        grouped[item.actionType] = [];
      }
      grouped[item.actionType].push(item);
    });
    return grouped;
  };

  return {
    items,
    loading,
    error,
    refresh: fetchActionItems,
    getActionItemsFiltered,
    getActionItemsGroupedByType,
  };
};
