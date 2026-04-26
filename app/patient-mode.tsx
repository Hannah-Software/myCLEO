/**
 * Patient Mode Home Screen
 *
 * Simplified UI for elderly patients or those with cognitive impairment.
 * Shows: today's medications, simple check-in, emergency contact.
 * Hides: complex settings, calendar analysis, Linear tasks.
 *
 * Activated when config has: role: "patient"
 */

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bridgeClient, BRIDGE_URL } from '../utils/bridge-client';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  taken_today: boolean;
  scheduled_time: string;
}

interface PatientState {
  patient_name: string;
  medications: Medication[];
  last_check_in: string;
  emergency_contact: string;
}

export default function PatientMode() {
  const [state, setState] = useState<PatientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [tappedMeds, setTappedMeds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPatientState();
  }, []);

  const fetchPatientState = async () => {
    try {
      // In patient mode, the bridge returns simplified state
      const response = await fetch(`${BRIDGE_URL}/patient-state`);
      const data = await response.json();
      setState(data);
    } catch (error) {
      console.error('Failed to fetch patient state:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicationTaken = async (medId: string) => {
    try {
      await fetch(`${BRIDGE_URL}/medications/${medId}/taken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      });

      // Mark as tapped locally
      setTappedMeds(prev => new Set([...prev, medId]));

      // Refetch to update state
      await fetchPatientState();
    } catch (error) {
      console.error('Failed to log medication:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to load patient data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Patient Name Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning,</Text>
        <Text style={styles.patientName}>{state.patient_name}</Text>
      </View>

      {/* Medications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Medications</Text>
        <Text style={styles.sectionSubtitle}>
          {state.medications.filter(m => m.taken_today).length} of {state.medications.length} taken
        </Text>
      </View>

      {/* Medication Cards */}
      {state.medications.map((med) => (
        <View
          key={med.id}
          style={[
            styles.medicationCard,
            {
              backgroundColor: med.taken_today || tappedMeds.has(med.id) ? '#E8F5E9' : '#FFF',
              borderLeftColor: med.taken_today || tappedMeds.has(med.id) ? '#4CAF50' : '#FFC107',
            },
          ]}
        >
          <View style={styles.medHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medDosage}>{med.dosage}</Text>
              <Text style={styles.medTime}>Due: {med.scheduled_time}</Text>
            </View>
            {(med.taken_today || tappedMeds.has(med.id)) && (
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
            )}
          </View>

          {!med.taken_today && !tappedMeds.has(med.id) && (
            <TouchableOpacity
              style={styles.tookButton}
              onPress={() => handleMedicationTaken(med.id)}
            >
              <Text style={styles.tookButtonText}>I Took It</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Check-In Card */}
      <View style={styles.checkInCard}>
        <Text style={styles.checkInTitle}>How are you feeling?</Text>
        <View style={styles.moodButtons}>
          {[
            { icon: '😊', label: 'Great' },
            { icon: '🙂', label: 'Good' },
            { icon: '😐', label: 'OK' },
            { icon: '😟', label: 'Not well' },
          ].map((mood) => (
            <TouchableOpacity key={mood.label} style={styles.moodButton}>
              <Text style={styles.moodEmoji}>{mood.icon}</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Emergency Contact */}
      {state.emergency_contact && (
        <TouchableOpacity style={styles.emergencyCard}>
          <Ionicons name="call" size={24} color="#FF6B6B" />
          <Text style={styles.emergencyText}>Call {state.emergency_contact}</Text>
        </TouchableOpacity>
      )}

      {/* Last Check-In */}
      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Last update:</Text>
        <Text style={styles.statusValue}>
          {state.last_check_in ? new Date(state.last_check_in).toLocaleTimeString() : 'Not yet'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
  header: {
    marginBottom: 32,
    paddingVertical: 20,
    backgroundColor: '#4ECDC4',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  patientName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  medicationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  medDosage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  medTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  tookButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  tookButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  checkInCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#45B7D1',
  },
  checkInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  moodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodButton: {
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emergencyCard: {
    backgroundColor: '#FFE8E8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  emergencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
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
  },
});
