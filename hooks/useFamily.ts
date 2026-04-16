import { useState, useEffect } from 'react';

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  school: string;
  relationship: 'child' | 'partner';
}

export interface CustodyEvent {
  id: string;
  childId: string;
  childName: string;
  type: 'pickup' | 'dropoff';
  time: string;
  location: string;
  with: string; // 'Ivan' | 'Kerri' | 'GF'
  date: string;
}

export interface SharedCommitment {
  id: string;
  title: string;
  type: 'appointment' | 'event' | 'task';
  dueDate: string;
  assignedTo: string[]; // Family members responsible
  completed: boolean;
  notes?: string;
}

export const useFamily = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [custodySchedule, setCustodySchedule] = useState<CustodyEvent[]>([]);
  const [sharedCommitments, setSharedCommitments] = useState<SharedCommitment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFamilyData = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Connect to FastAPI bridge endpoint for family data
      // For now, mock data
      const mockFamily: FamilyMember[] = [
        { id: 'kid-1', name: 'Child 1', age: 8, school: 'Elementary', relationship: 'child' },
        { id: 'kid-2', name: 'Child 2', age: 6, school: 'Kindergarten', relationship: 'child' },
      ];

      const today = new Date();
      const mockCustody: CustodyEvent[] = [
        {
          id: 'custody-1',
          childId: 'kid-1',
          childName: 'Child 1',
          type: 'pickup',
          time: '16:00',
          location: 'School',
          with: 'Ivan',
          date: today.toISOString().split('T')[0],
        },
        {
          id: 'custody-2',
          childId: 'kid-2',
          childName: 'Child 2',
          type: 'dropoff',
          time: '08:30',
          location: "Mom's house",
          with: 'Kerri',
          date: today.toISOString().split('T')[0],
        },
      ];

      const mockCommitments: SharedCommitment[] = [
        {
          id: 'commit-1',
          title: 'Doctor appointment - Child 1',
          type: 'appointment',
          dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          assignedTo: ['Ivan', 'Kerri'],
          completed: false,
          notes: 'Pediatrician checkup',
        },
        {
          id: 'commit-2',
          title: 'School supplies shopping',
          type: 'task',
          dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          assignedTo: ['Ivan'],
          completed: false,
        },
        {
          id: 'commit-3',
          title: 'Family dinner - weekend',
          type: 'event',
          dueDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          assignedTo: ['Ivan', 'Kerri', 'GF'],
          completed: false,
        },
      ];

      setFamilyMembers(mockFamily);
      setCustodySchedule(mockCustody);
      setSharedCommitments(mockCommitments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch family data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();

    // Refresh every hour
    const interval = setInterval(fetchFamilyData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getTodaysCustody = (): CustodyEvent[] => {
    const today = new Date().toISOString().split('T')[0];
    return custodySchedule.filter(event => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  };

  const getUpcomingCommitments = (days: number = 7): SharedCommitment[] => {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return sharedCommitments
      .filter(c => !c.completed && new Date(c.dueDate) >= now && new Date(c.dueDate) <= future)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  };

  const toggleCommitment = (id: string) => {
    setSharedCommitments(prev =>
      prev.map(c => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  };

  return {
    familyMembers,
    custodySchedule,
    sharedCommitments,
    loading,
    error,
    refresh: fetchFamilyData,
    getTodaysCustody,
    getUpcomingCommitments,
    toggleCommitment,
  };
};
