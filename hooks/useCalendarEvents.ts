import { useState, useEffect } from 'react';
import { bridgeClient } from '../utils/bridge-client';

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
      // Fetch from FastAPI bridge
      const events = await bridgeClient.getCalendarEvents(7);
      
      const mappedEvents = events.map((event: any) => ({
        id: event.id || '',
        title: event.title || '(no title)',
        startTime: event.start_time || '',
        endTime: event.end_time || '',
        location: event.location,
        description: event.description,
        isAllDay: false,
        calendar: 'primary',
        isDeclined: false,
      )));
      
      setEvents(mappedEvents.length > 0 ? mappedEvents : getMockEvents());
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
