import { useState, useEffect } from 'react';

export interface GmailActionItem {
  id: string;
  from: string;
  subject: string;
  actionType: 'reply' | 'task' | 'decision' | 'waiting' | 'fyi';
  urgency: 'high' | 'medium' | 'low';
  receivedAt: string;
  preview: string;
}

export const useGmailActionItems = () => {
  const [items, setItems] = useState<GmailActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActionItems = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Connect to FastAPI bridge endpoint for Gmail
      // Multi-account scan: personal, business, legal, quantum-logos
      // For now, mock data simulating action items from emails
      const mockItems: GmailActionItem[] = [
        {
          id: 'email-1',
          from: 'paul.morrison@pauldavisrestoration.com',
          subject: 'Q2 Operations Review — Need your input',
          actionType: 'task',
          urgency: 'high',
          receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          preview: 'Can you review the attached Q2 ops metrics and provide feedback on the KPI dashboard...',
        },
        {
          id: 'email-2',
          from: 'harris.legal.team@example.com',
          subject: 'Harris Case — Discovery Deadline Extension Request',
          actionType: 'decision',
          urgency: 'high',
          receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          preview: 'Opposing counsel is requesting a 2-week extension on discovery responses. Thoughts?',
        },
        {
          id: 'email-3',
          from: 'kerri@example.com',
          subject: 'This weekend — schedule for kids',
          actionType: 'waiting',
          urgency: 'medium',
          receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          preview: 'Got the custody schedule from Kerri. Kids are with us Sat-Sun. Need to plan activities...',
        },
        {
          id: 'email-4',
          from: 'product@linear.app',
          subject: 'Linear Update: Q2 Product Roadmap',
          actionType: 'fyi',
          urgency: 'low',
          receivedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          preview: 'New features available in Linear. Check out our latest updates...',
        },
      ];

      setItems(mockItems);
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
