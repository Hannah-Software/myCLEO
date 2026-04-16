import { useState, useEffect } from 'react';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  calendar: 'work' | 'family';
  isAllDay: boolean;
  location?: string;
}

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Connect to FastAPI bridge endpoint for Google Calendar
      // For now, mock data simulating today's events
      const today = new Date();
      const mockEvents: CalendarEvent[] = [
        {
          id: 'cal-1',
          title: 'Team Standup',
          startTime: new Date(today.setHours(9, 0)).toISOString(),
          endTime: new Date(today.setHours(9, 30)).toISOString(),
          calendar: 'work',
          isAllDay: false,
          location: 'Zoom',
        },
        {
          id: 'cal-2',
          title: 'Client Call: Harris Case Update',
          startTime: new Date(today.setHours(11, 0)).toISOString(),
          endTime: new Date(today.setHours(12, 0)).toISOString(),
          calendar: 'work',
          isAllDay: false,
          location: 'Virtual',
        },
        {
          id: 'cal-3',
          title: 'Mom — Weekly Check-in',
          startTime: new Date(today.setHours(18, 0)).toISOString(),
          endTime: new Date(today.setHours(18, 30)).toISOString(),
          calendar: 'family',
          isAllDay: false,
        },
        {
          id: 'cal-4',
          title: 'Kerri — Co-parent sync',
          startTime: new Date(today.setHours(19, 0)).toISOString(),
          endTime: new Date(today.setHours(19, 30)).toISOString(),
          calendar: 'family',
          isAllDay: false,
        },
      ];

      setEvents(mockEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();

    // Refresh every 30 minutes
    const interval = setInterval(fetchCalendarEvents, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getEventsForToday = (): CalendarEvent[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    });
  };

  const getUpcomingEvents = (limit: number = 5): CalendarEvent[] => {
    const now = new Date();
    return events
      .filter(event => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limit);
  };

  return {
    events,
    loading,
    error,
    refresh: fetchCalendarEvents,
    getEventsForToday,
    getUpcomingEvents,
  };
};
