import { useState, useEffect } from 'react';

export interface SharedCommitment {
  id: string;
  title: string;
  type: 'appointment' | 'event' | 'task';
  dueDate: string;
  assignedTo: string[];
  completed: boolean;
  createdBy: string;
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export const useSharedCommitments = () => {
  const [commitments, setCommitments] = useState<SharedCommitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommitments = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Connect to PocketBase endpoint for shared commitments
      // For now, use mock data
      const today = new Date();
      const mockCommitments: SharedCommitment[] = [
        {
          id: 'commit-1',
          title: 'Doctor appointment - Child 1',
          type: 'appointment',
          dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          assignedTo: ['Ivan', 'Kerri'],
          completed: false,
          createdBy: 'Ivan',
          notes: 'Pediatrician checkup',
          syncStatus: 'synced',
        },
        {
          id: 'commit-2',
          title: 'School supplies shopping',
          type: 'task',
          dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          assignedTo: ['Ivan'],
          completed: false,
          createdBy: 'Ivan',
          syncStatus: 'synced',
        },
        {
          id: 'commit-3',
          title: 'Family dinner - weekend',
          type: 'event',
          dueDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          assignedTo: ['Ivan', 'Kerri', 'GF'],
          completed: false,
          createdBy: 'Kerri',
          syncStatus: 'synced',
        },
      ];

      setCommitments(mockCommitments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch commitments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitments();

    // Refresh every 30 minutes
    const interval = setInterval(fetchCommitments, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const addCommitment = async (commitment: Omit<SharedCommitment, 'id' | 'syncStatus' | 'createdBy'>) => {
    const newCommitment: SharedCommitment = {
      ...commitment,
      id: `commit-${Date.now()}`,
      createdBy: 'Ivan', // TODO: Get from auth context
      syncStatus: 'pending', // Will sync to PocketBase
    };

    setCommitments(prev => [newCommitment, ...prev]);

    // TODO: Sync to PocketBase
    try {
      // await fetch('/api/commitments', { method: 'POST', body: JSON.stringify(newCommitment) })
      // Update syncStatus to 'synced' on success
    } catch (err) {
      setError('Failed to sync commitment');
      newCommitment.syncStatus = 'error';
    }

    return newCommitment;
  };

  const updateCommitment = async (id: string, updates: Partial<SharedCommitment>) => {
    setCommitments(prev =>
      prev.map(c =>
        c.id === id ? { ...c, ...updates, syncStatus: 'pending' as const } : c
      )
    );

    // TODO: Sync to PocketBase
    try {
      // await fetch(`/api/commitments/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
    } catch (err) {
      setError('Failed to sync update');
    }
  };

  const deleteCommitment = async (id: string) => {
    setCommitments(prev => prev.filter(c => c.id !== id));

    // TODO: Sync deletion to PocketBase
    try {
      // await fetch(`/api/commitments/${id}`, { method: 'DELETE' })
    } catch (err) {
      setError('Failed to sync deletion');
      // Re-add if deletion failed
      const deleted = commitments.find(c => c.id === id);
      if (deleted) setCommitments(prev => [deleted, ...prev]);
    }
  };

  const toggleComplete = async (id: string) => {
    const commitment = commitments.find(c => c.id === id);
    if (commitment) {
      await updateCommitment(id, { completed: !commitment.completed });
    }
  };

  const getUpcomingCommitments = (days: number = 7): SharedCommitment[] => {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return commitments
      .filter(c => !c.completed && new Date(c.dueDate) >= now && new Date(c.dueDate) <= future)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const getCommitmentsByAssignee = (assignee: string): SharedCommitment[] => {
    return commitments.filter(c => c.assignedTo.includes(assignee) && !c.completed);
  };

  return {
    commitments,
    loading,
    error,
    refresh: fetchCommitments,
    addCommitment,
    updateCommitment,
    deleteCommitment,
    toggleComplete,
    getUpcomingCommitments,
    getCommitmentsByAssignee,
  };
};
