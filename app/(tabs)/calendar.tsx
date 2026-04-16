import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLinearTasks } from '../../hooks/useLinearTasks';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useFamily } from '../../hooks/useFamily';
import { useCustodyReminders } from '../../hooks/useCustodyReminders';
import { useState } from 'react';

export default function CalendarScreen() {
  const { tasks, loading: tasksLoading } = useLinearTasks('IVA');
  const { events, loading: eventsLoading, refresh: refreshCalendar } = useCalendarEvents();
  const { custodySchedule, loading: familyLoading } = useFamily();
  const { upcomingReminders } = useCustodyReminders(custodySchedule);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCalendar();
    setRefreshing(false);
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 1) return '#FF6B6B';
    if (priority === 2) return '#FFA07A';
    if (priority === 3) return '#FFD93D';
    return '#90EE90';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'play-circle';
      case 'done':
        return 'checkmark-circle';
      default:
        return 'ellipse-outline';
    }
  };

  const getCalendarIcon = (calendar: 'work' | 'family') => {
    return calendar === 'work' ? 'briefcase' : 'heart';
  };

  const getCalendarColor = (calendar: 'work' | 'family') => {
    return calendar === 'work' ? '#45B7D1' : '#FF6B6B';
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Upcoming Custody Reminders */}
      {upcomingReminders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.reminderBanner}>
            <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>Upcoming Handoff</Text>
              <Text style={styles.reminderText}>
                {upcomingReminders[0].childName} in ~1 hour
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Today's Schedule Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Timeline</Text>

        {eventsLoading || familyLoading ? (
          <Text style={styles.loadingText}>Loading calendar...</Text>
        ) : events.length === 0 && custodySchedule.length === 0 ? (
          <Text style={styles.emptyText}>No events or handoffs today</Text>
        ) : (
          <View style={styles.eventsList}>
            {events.map((event, index) => (
              <View key={event.id} style={[styles.eventItem, index > 0 && styles.eventItemBorder]}>
                <View style={styles.eventTimeBlock}>
                  <Text style={styles.eventTime}>{formatTime(event.startTime)}</Text>
                  {!event.isAllDay && (
                    <Text style={styles.eventDuration}>{formatTime(event.endTime)}</Text>
                  )}
                </View>
                <View style={styles.eventDot} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  {event.location && (
                    <Text style={styles.eventLocation}>{event.location}</Text>
                  )}
                  <View style={styles.eventCalendarBadge}>
                    <Ionicons name={getCalendarIcon(event.calendar)} size={12} color={getCalendarColor(event.calendar)} />
                    <Text style={[styles.eventCalendarLabel, { color: getCalendarColor(event.calendar) }]}>
                      {event.calendar === 'work' ? 'Work' : 'Family'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Custody handoffs */}
            {custodySchedule.map((custody, index) => (
              <View key={custody.id} style={[styles.eventItem, styles.eventItemBorder]}>
                <View style={styles.eventTimeBlock}>
                  <Text style={styles.eventTime}>{custody.time}</Text>
                </View>
                <View style={[styles.eventDot, { backgroundColor: custody.type === 'pickup' ? '#4ECDC4' : '#FFB627' }]} />
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {custody.type === 'pickup' ? '🚗' : '👋'} {custody.type === 'pickup' ? 'Pickup' : 'Dropoff'} — {custody.childName}
                  </Text>
                  <Text style={styles.eventLocation}>{custody.location}</Text>
                  <View style={styles.eventCalendarBadge}>
                    <Ionicons name="person" size={12} color="#666" />
                    <Text style={styles.eventCalendarLabel}>{custody.with}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Today's Top 5 Priorities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Top 5 Tasks</Text>

        {tasksLoading ? (
          <Text style={styles.loadingText}>Loading tasks...</Text>
        ) : tasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks for today</Text>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((task, index) => (
              <TouchableOpacity key={task.id} style={[styles.taskItem, index > 0 && styles.taskItemBorder]}>
                <View style={styles.taskItemLeft}>
                  <Ionicons name={getStatusIcon(task.status)} size={24} color={getPriorityColor(task.priority)} />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskNumber}>{task.id}</Text>
                    <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                  </View>
                </View>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    gap: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  reminderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  eventsList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  eventItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  eventItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  eventTimeBlock: {
    width: 50,
    alignItems: 'flex-start',
  },
  eventTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  eventDuration: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    lineHeight: 18,
  },
  eventLocation: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  eventCalendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  eventCalendarLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tasksList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  taskItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  taskItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  taskTitle: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
    fontWeight: '500',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
