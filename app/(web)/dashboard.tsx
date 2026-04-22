import { bridgeClient } from '../../utils/bridge-client';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';

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
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>📋 Check In</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>📧 Email</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>📅 Calendar</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>📝 Ideas</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
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
});
