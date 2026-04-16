import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export interface CustodyReminder {
  id: string;
  custodyEventId: string;
  childName: string;
  type: 'pickup' | 'dropoff';
  scheduledTime: Date;
  reminderTime: Date; // 1 hour before
  sent: boolean;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useCustodyReminders = (custodyEvents: any[]) => {
  const [reminders, setReminders] = useState<CustodyReminder[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Generate reminders from custody events
  useEffect(() => {
    const generateReminders = () => {
      const newReminders = custodyEvents.map(event => {
        const [hours, minutes] = event.time.split(':');
        const eventTime = new Date();
        eventTime.setHours(parseInt(hours), parseInt(minutes), 0);

        const reminderTime = new Date(eventTime);
        reminderTime.setHours(reminderTime.getHours() - 1);

        return {
          id: `reminder-${event.id}`,
          custodyEventId: event.id,
          childName: event.childName,
          type: event.type,
          scheduledTime: eventTime,
          reminderTime: reminderTime,
          sent: false,
        };
      });

      setReminders(newReminders);
    };

    if (custodyEvents.length > 0) {
      generateReminders();
    }
  }, [custodyEvents]);

  // Schedule notifications for upcoming reminders
  const scheduleReminders = async () => {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Push notification permission not granted');
        return;
      }

      const now = new Date();

      for (const reminder of reminders) {
        if (!reminder.sent && reminder.reminderTime > now) {
          const triggerTime = reminder.reminderTime;
          const secondsUntilReminder = Math.floor((triggerTime.getTime() - now.getTime()) / 1000);

          if (secondsUntilReminder > 0) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${reminder.type === 'pickup' ? '🚗 Pickup' : '👋 Dropoff'} Reminder`,
                body: `${reminder.childName} in 1 hour at ${reminder.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                data: {
                  type: 'custody_reminder',
                  custodyEventId: reminder.custodyEventId,
                },
                sound: 'default',
              },
              trigger: { seconds: secondsUntilReminder },
            });

            // Mark as sent
            setReminders(prev =>
              prev.map(r => (r.id === reminder.id ? { ...r, sent: true } : r))
            );
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule reminders');
    }
  };

  // Schedule reminders on mount and when reminders change
  useEffect(() => {
    if (reminders.length > 0) {
      scheduleReminders();
    }
  }, [reminders]);

  const upcomingReminders = () => {
    const now = new Date();
    return reminders.filter(r => r.reminderTime > now && !r.sent);
  };

  return {
    reminders,
    upcomingReminders: upcomingReminders(),
    error,
  };
};
