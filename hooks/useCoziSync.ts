import { useState, useEffect } from 'react';

export interface CoziEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  attendees: string[];
  location?: string;
  notes?: string;
  isAllDay: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
}

export const useCoziSync = () => {
  const [events, setEvents] = useState<CoziEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoziEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Connect to Google Calendar export / Cozi API
      // For now, use mock data based on family calendar typical events
      const today = new Date();
      const mockEvents: CoziEvent[] = [
        {
          id: 'cozi-1',
          title: "Child 1's soccer practice",
          date: today.toISOString().split('T')[0],
          startTime: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(today.getTime() + 3 * 60 * 60 * 1000).toISOString(),
          attendees: ['Ivan', 'Child 1'],
          location: 'Riverside Soccer Complex',
          isAllDay: false,
          syncStatus: 'synced',
        },
        {
          id: 'cozi-2',
          title: "Child 2's piano lesson",
          date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          startTime: new Date(today.getTime() + 25 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(today.getTime() + 26.5 * 60 * 60 * 1000).toISOString(),
          attendees: ['Kerri', 'Child 2'],
          location: 'Music Studio downtown',
          isAllDay: false,
          syncStatus: 'synced',
        },
        {
          id: 'cozi-3',
          title: 'Family dinner',
          date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          startTime: new Date(today.getTime() + 50 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(today.getTime() + 52 * 60 * 60 * 1000).toISOString(),
          attendees: ['Ivan', 'Kerri', 'Child 1', 'Child 2'],
          location: 'Home',
          isAllDay: false,
          syncStatus: 'synced',
        },
      ];

      setEvents(mockEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Cozi events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoziEvents();

    // Refresh every 60 minutes
    const interval = setInterval(fetchCoziEvents, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getUpcomingCoziEvents = (days: number = 7): CoziEvent[] => {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return events
      .filter(e => {
        const eventDate = new Date(e.startTime);
        return eventDate >= now && eventDate <= future;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const getCoziEventsByAttendee = (attendee: string): CoziEvent[] => {
    return events.filter(e => e.attendees.includes(attendee));
  };

  return {
    events,
    loading,
    error,
    refresh: fetchCoziEvents,
    getUpcomingCoziEvents,
    getCoziEventsByAttendee,
  };
};
