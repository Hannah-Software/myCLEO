import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLinearTasks } from '../../hooks/useLinearTasks';

export default function CalendarScreen() {
  const { tasks, loading } = useLinearTasks('IVA');

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Today's Top 5 Priorities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Top 5</Text>
        
        {loading ? (
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

      {/* Placeholder for calendar view */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calendar View</Text>
        <View style={styles.placeholder}>
          <Ionicons name="calendar" size={48} color="#ccc" />
          <Text style={styles.placeholderText}>Calendar integration coming soon</Text>
          <Text style={styles.placeholderSubtext}>Google Calendar + Cozi sync</Text>
        </View>
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
  placeholder: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
  },
});
