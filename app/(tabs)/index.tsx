import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProactiveAlerts } from '../../hooks/useProactiveAlerts';
import { useLatestBriefing } from '../../hooks/useLatestBriefing';

type Phase = 'A' | 'B' | 'C' | 'D' | 'E';

interface OrchestratorState {
  phase: Phase;
  phase_started_at: string;
  minutes_in_phase: number;
  current_task?: {
    id: string;
    title: string;
    priority: number;
  };
  tasks_remaining_in_queue: number;
  last_signal?: string;
}

const PHASE_NAMES = {
  A: 'Deep Work',
  B: 'Admin',
  C: 'Calls',
  D: 'Deep Dive',
  E: 'End of Day',
};

const PHASE_COLORS = {
  A: '#FF6B6B',
  B: '#4ECDC4',
  C: '#45B7D1',
  D: '#FFA07A',
  E: '#98D8C8',
};

export default function CheckInScreen() {
  const [state, setState] = useState<OrchestratorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [signaling, setSignaling] = useState(false);
  const { alerts, dismissAlert, getCriticalAlerts } = useProactiveAlerts();
  const { briefing, loading: briefingLoading, refetch: refetchBriefing } = useLatestBriefing();

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchState = async () => {
    try {
      // TODO: Replace with actual daemon URL from config (Tailscale IP)
      const response = await fetch('http://127.0.0.1:8765/state');
      const data = await response.json();
      setState(data);
      refetchBriefing();
    } catch (error) {
      console.error('Failed to fetch state:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendSignal = async (signal: string) => {
    if (!state) return;
    
    setSignaling(true);
    try {
      const response = await fetch(`http://127.0.0.1:8765/signal/${signal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: `Signaled from mobile app: ${signal}` }),
      });
      
      if (response.ok) {
        const newState = await response.json();
        setState(newState);
      }
    } catch (error) {
      console.error('Failed to send signal:', error);
    } finally {
      setSignaling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your workflow...</Text>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to connect to daemon</Text>
        <Text style={styles.errorSubtext}>Make sure FastAPI bridge is running on 127.0.0.1:8765</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchState}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPhaseColor = PHASE_COLORS[state.phase];
  const currentPhaseName = PHASE_NAMES[state.phase];

  const criticalAlerts = getCriticalAlerts();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Proactive Alerts */}
      {criticalAlerts.length > 0 && (
        <View style={styles.alertsContainer}>
          {criticalAlerts.slice(0, 2).map((alert) => (
            <View key={alert.id} style={[styles.alertBanner, { borderLeftColor: '#FF6B6B' }]}>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertDescription} numberOfLines={1}>{alert.description}</Text>
              </View>
              <TouchableOpacity onPress={() => dismissAlert(alert.id)}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Morning Briefing */}
      {briefing && (
        <View style={styles.briefingCard}>
          <View style={styles.briefingHeader}>
            <Ionicons name="sunny" size={20} color="#45B7D1" />
            <Text style={styles.briefingTitle}>Today's Briefing</Text>
          </View>
          <Text style={styles.briefingText}>{briefing.briefing_text}</Text>
          <Text style={styles.briefingTime}>
            {briefing.created_at ? new Date(briefing.created_at).toLocaleString() : 'Just now'}
          </Text>
        </View>
      )}

      {/* Current Phase Display */}
      <View style={[styles.phaseCard, { backgroundColor: currentPhaseColor }]}>
        <Text style={styles.phaseLabel}>Currently in</Text>
        <Text style={styles.phaseName}>{currentPhaseName}</Text>
        <View style={styles.phaseSubtitle}>
          <Ionicons name="timer-outline" size={16} color="#fff" />
          <Text style={styles.phaseTime}>{state.minutes_in_phase} min</Text>
        </View>
      </View>

      {/* Current Task */}
      {state.current_task && (
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskId}>{state.current_task.id}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(state.current_task.priority) }]}>
              <Text style={styles.priorityText}>P{state.current_task.priority}</Text>
            </View>
          </View>
          <Text style={styles.taskTitle}>{state.current_task.title}</Text>
          <Text style={styles.taskQueue}>{state.tasks_remaining_in_queue} more in queue</Text>
        </View>
      )}

      {/* Phase Buttons */}
      <View style={styles.buttonsContainer}>
        <Text style={styles.sectionTitle}>Change Phase</Text>
        <View style={styles.phaseButtons}>
          {(['A', 'B', 'C', 'D', 'E'] as Phase[]).map((phase) => (
            <TouchableOpacity
              key={phase}
              style={[
                styles.phaseButton,
                {
                  backgroundColor: state.phase === phase ? PHASE_COLORS[phase] : '#f0f0f0',
                  borderColor: PHASE_COLORS[phase],
                  borderWidth: 2,
                },
              ]}
              onPress={() => sendSignal(`phase-${phase.toLowerCase()}`)}
              disabled={signaling}
            >
              <Text
                style={[
                  styles.phaseButtonText,
                  { color: state.phase === phase ? '#fff' : PHASE_COLORS[phase] },
                ]}
              >
                {phase}
              </Text>
              <Text style={[styles.phaseButtonName, { color: state.phase === phase ? '#fff' : '#666' }]}>
                {PHASE_NAMES[phase].split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Signal Buttons */}
      <View style={styles.signalButtons}>
        <TouchableOpacity
          style={[styles.signalButton, styles.signalSuccess]}
          onPress={() => sendSignal('done')}
          disabled={signaling}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.signalText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signalButton, styles.signalWarning]}
          onPress={() => sendSignal('stuck')}
          disabled={signaling}
        >
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <Text style={styles.signalText}>Stuck</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signalButton, styles.signalFlow]}
          onPress={() => sendSignal('flow')}
          disabled={signaling}
        >
          <Ionicons name="flame" size={24} color="#fff" />
          <Text style={styles.signalText}>Flow</Text>
        </TouchableOpacity>
      </View>

      {/* Last Signal */}
      {state.last_signal && (
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Last signal:</Text>
          <Text style={styles.statusValue}>{state.last_signal}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function getPriorityColor(priority: number): string {
  if (priority <= 1) return '#FF6B6B'; // P0 - Red
  if (priority === 2) return '#FFA07A'; // P1 - Orange
  if (priority === 3) return '#FFD93D'; // P2 - Yellow
  return '#90EE90'; // P3 - Green
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B6B',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  phaseCard: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  phaseLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  phaseName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  phaseSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  phaseTime: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  taskCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  taskQueue: {
    fontSize: 12,
    color: '#999',
  },
  buttonsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  phaseButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  phaseButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  phaseButtonName: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  signalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  signalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalSuccess: {
    backgroundColor: '#4ECDC4',
  },
  signalWarning: {
    backgroundColor: '#FFB347',
  },
  signalFlow: {
    backgroundColor: '#FF6B6B',
  },
  signalText: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 6,
    fontSize: 12,
  },
  statusBox: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  alertsContainer: {
    marginBottom: 20,
    gap: 8,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5F5',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  alertContent: {
    flex: 1,
    marginRight: 12,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 11,
    color: '#666',
  },
  briefingCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#45B7D1',
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  briefingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0277BD',
    marginLeft: 8,
  },
  briefingText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  briefingTime: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});
