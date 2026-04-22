import { useState, useEffect } from 'react';
import { bridgeClient } from '../utils/bridge-client';

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
      // Fetch real family data from bridge
      const familyData = await bridgeClient.getFamily();

      // Transform family members
      const transformedMembers: FamilyMember[] = familyData.family_members.map(member => ({
        id: member.id,
        name: member.name,
        age: member.age || 0,
        school: member.school || '',
        relationship: member.relationship as 'child' | 'partner',
      }));

      // Transform custody events
      const transformedCustody: CustodyEvent[] = familyData.custody_schedule.map(event => ({
        id: event.id,
        childId: '', // TODO: resolve from title or separate field
        childName: event.title?.split(' ').slice(-1)[0] || 'Child',
        type: event.type as 'pickup' | 'dropoff',
        time: event.start_time?.split('T')[1]?.slice(0, 5) || '',
        location: event.location || '',
        with: 'Ivan', // TODO: extract from event description or separate field
        date: event.start_time?.split('T')[0] || '',
      }));

      // Transform shared commitments
      const transformedCommitments: SharedCommitment[] = familyData.shared_commitments.map(commitment => ({
        id: commitment.id,
        title: commitment.description,
        type: commitment.priority === 'high' ? 'appointment' : 'task',
        dueDate: commitment.due_date || '',
        assignedTo: commitment.owner ? [commitment.owner] : ['you'],
        completed: false,
        notes: undefined,
      }));

      setFamilyMembers(transformedMembers);
      setCustodySchedule(transformedCustody);
      setSharedCommitments(transformedCommitments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch family data');
      setFamilyMembers([]);
      setCustodySchedule([]);
      setSharedCommitments([]);
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
