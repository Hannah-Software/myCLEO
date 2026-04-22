import { bridgeClient } from '../../utils/bridge-client';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Modal, TextInput } from 'react-native';

/**
 * Web Dashboard — Command Center Overview
 *
 * Main web interface for myCLEO when running in browser.
 * Displays:
 * - Current phase and task (from orchestrator)
 * - Today's priority summary
 * - Active alerts and blockers
 * - Health/mood status
 * - Quick-action buttons
 *
 * Calls: GET /state, GET /alerts, GET /health via FastAPI bridge
 */

export default function DashboardScreen() {
  const [state, setState] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ideasModalOpen, setIdeasModalOpen] = useState(false);
  const [ideasText, setIdeasText] = useState('');

  // Fetch dashboard data from CLEO daemon bridge
  const fetchDashboardData = async () => {
    try {
      // Parallel fetch: state, alerts, health
      const [stateData, alertsData, healthData] = await Promise.all([
        bridgeClient.getState(),
        bridgeClient.getProactiveAlerts(),
        bridgeClient.getHealthLog(1),
      ]);

      setState(stateData);
      setAlerts(alertsData || []);
      setHealth(healthData && healthData.length > 0 ? healthData[0] : null);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleCheckIn = async () => {
    try {
      await bridgeClient.dispatchSignal('done');
      alert('Check-in sent. Current phase updated.');
      fetchDashboardData();
    } catch (error) {
      alert('Failed to send check-in. Please try again.');
    }
  };

  const handleEmail = async () => {
    try {
      const emails = await bridgeClient.getEmailActions();
      if (emails && emails.length > 0) {
        alert(`You have ${emails.length} action items:\n\n${emails.map((e: any) => `${e.subject} (from ${e.from_address})`).join('\n')}`);
      } else {
        alert('No pending email action items.');
      }
    } catch (error) {
      alert('Failed to load email items.');
    }
  };

  const handleCalendar = async () => {
    try {
      const events = await bridgeClient.getCalendarEvents(7);
      if (events && events.length > 0) {
        const upcomingText = events.slice(0, 3).map((e: any) => `${e.title} (${e.start_time})`).join('\n');
        alert(`Your next 3 events:\n\n${upcomingText}`);
      } else {
        alert('No upcoming calendar events in the next 7 days.');
      }
    } catch (error) {
      alert('Failed to load calendar events.');
    }
  };

  const handleIdeasSubmit = () => {
    if (ideasText.trim()) {
      alert(`Idea captured: "${ideasText}"\n\n(To do: implement ideas storage)`);
      setIdeasText('');
      setIdeasModalOpen(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Command Center</Text>
        <Text style={styles.subtitle}>myCLEO Dashboard</Text>
      </View>

      {/* Current Phase / Task */}
      {state && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Phase</Text>
          <View style={styles.phaseBox}>
            <Text style={styles.phaseNumber}>{state.phase}</Text>
            <Text style={styles.phaseInfo}>
              {state.current_task ? state.current_task.title : 'Waiting for task...'}
            </Text>
            <Text style={styles.phaseTime}>
              {state.minutes_in_phase} minutes in phase
            </Text>
          </View>
          {state.tasks_remaining_in_queue > 0 && (
            <Text style={styles.queueInfo}>
              {state.tasks_remaining_in_queue} tasks remaining in queue
            </Text>
          )}
        </View>
      )}

      {/* Health Status */}
      {health && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your State</Text>
          <View style={styles.healthGrid}>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Mood</Text>
              <Text style={styles.healthValue}>{health.mood}/10</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Energy</Text>
              <Text style={styles.healthValue}>{health.energy}/10</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Focus Time</Text>
              <Text style={styles.healthValue}>{health.focus_time}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ Active Alerts</Text>
          {alerts.map((alert, idx) => (
            <View key={idx} style={[styles.alert, { borderLeftColor: alertColor(alert.severity) }]}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDesc}>{alert.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <Pressable style={styles.actionButton} onPress={handleCheckIn}>
            <Text style={styles.actionText}>📋 Check In</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleEmail}>
            <Text style={styles.actionText}>📧 Email</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleCalendar}>
            <Text style={styles.actionText}>📅 Calendar</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => setIdeasModalOpen(true)}>
            <Text style={styles.actionText}>📝 Ideas</Text>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>

      {/* Ideas Modal */}
      <Modal
        visible={ideasModalOpen}
        onRequestClose={() => setIdeasModalOpen(false)}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quick Idea</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              value={ideasText}
              onChangeText={setIdeasText}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIdeasModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleIdeasSubmit}
              >
                <Text style={styles.submitButtonText}>Save Idea</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function alertColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#d32f2f';
    case 'warning': return '#f57c00';
    case 'info': return '#1976d2';
    default: return '#999';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#666',
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 12,
  },
  phaseBox: {
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  phaseNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 8,
  },
  phaseInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  phaseTime: {
    fontSize: 12,
    color: '#999',
  },
  queueInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthItem: {
    alignItems: 'center',
    flex: 1,
  },
  healthLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  alert: {
    borderLeftWidth: 4,
    borderRadius: 4,
    backgroundColor: '#fafafa',
    padding: 12,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 12,
    color: '#666',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    padding: 12,
    width: '48%',
    marginBottom: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066cc',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#0066cc',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
