import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Slider, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bridgeClient } from '../../utils/bridge-client';

interface HealthEntry {
  date: string;
  mood: number;
  energy: number;
  notes?: string;
  medications: string[];
}

export default function HealthScreen() {
  const [today, setToday] = useState<HealthEntry>({
    date: new Date().toISOString().split('T')[0],
    mood: 5,
    energy: 5,
    notes: '',
    medications: [],
  });

  const [history, setHistory] = useState<HealthEntry[]>([]);
  const [medications, setMedications] = useState<any[]>([]);

  useEffect(() => {
    loadActiveMedications();
  }, []);

  const loadActiveMedications = async () => {
    try {
      const meds = await bridgeClient.getActiveMedications();
      setMedications(meds || []);
    } catch (error) {
      console.error('Failed to load medications:', error);
    }
  };

  useEffect(() => {
    loadTodaysEntry();
  }, []);

  const loadTodaysEntry = async () => {
    try {
      const entries = await bridgeClient.getHealthLog(1);
      if (entries && entries.length > 0) {
        const entry = entries[0];
        setToday({
          date: new Date().toISOString().split('T')[0],
          mood: entry.mood || 5,
          energy: entry.energy || 5,
          notes: entry.notes || '',
          medications: [],
        });
      }
    } catch (error) {
      console.error('Failed to load health log:', error);
    }
  };

  const saveTodaysEntry = async () => {
    try {
      await bridgeClient.logHealthEntry({
        mood: today.mood,
        energy: today.energy,
        notes: today.notes,
      });
    } catch (error) {
      console.error('Failed to save health entry:', error);
    }
  };

  const toggleMedication = (med: any) => {
    const medId = typeof med === 'string' ? med : med.id;
    const medName = typeof med === 'string' ? med : med.name;
    
    setToday((prev) => ({
      ...prev,
      medications: prev.medications.includes(medId)
        ? prev.medications.filter((m) => m !== medId)
        : [...prev.medications, medId],
    }));
  };

  const getMoodEmoji = (mood: number) => {
    if (mood <= 2) return '😞';
    if (mood <= 4) return '😐';
    if (mood <= 6) return '🙂';
    if (mood <= 8) return '😊';
    return '🤩';
  };

  const getEnergyEmoji = (energy: number) => {
    if (energy <= 2) return '😴';
    if (energy <= 4) return '😑';
    if (energy <= 6) return '😐';
    if (energy <= 8) return '💪';
    return '🚀';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Mood Slider */}
      <View style={styles.section}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Mood</Text>
          <View style={styles.sliderValue}>
            <Text style={styles.emoji}>{getMoodEmoji(today.mood)}</Text>
            <Text style={styles.value}>{today.mood}/10</Text>
          </View>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={today.mood}
          onValueChange={(value) => setToday((prev) => ({ ...prev, mood: value }))}
          minimumTrackTintColor="#FF6B6B"
          maximumTrackTintColor="#e0e0e0"
        />
      </View>

      {/* Energy Slider */}
      <View style={styles.section}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Energy</Text>
          <View style={styles.sliderValue}>
            <Text style={styles.emoji}>{getEnergyEmoji(today.energy)}</Text>
            <Text style={styles.value}>{today.energy}/10</Text>
          </View>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={today.energy}
          onValueChange={(value) => setToday((prev) => ({ ...prev, energy: value }))}
          minimumTrackTintColor="#4ECDC4"
          maximumTrackTintColor="#e0e0e0"
        />
      </View>

      {/* Medications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medications Taken</Text>
        <View style={styles.medicationsList}>
          {medications.map((med) => (
            <TouchableOpacity
              key={med}
              style={[
                styles.medicationItem,
                today.medications.includes(med) && styles.medicationItemActive,
              ]}
              onPress={() => toggleMedication(med)}
            >
              <View
                style={[
                  styles.medicationCheckbox,
                  today.medications.includes(med) && styles.medicationCheckboxActive,
                ]}
              >
                {today.medications.includes(med) && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.medicationLabel}>{med}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Today's Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mood & Energy</Text>
          <Text style={styles.summaryValue}>
            {today.mood}/10 • {today.energy}/10
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Meds Taken</Text>
          <Text style={styles.summaryValue}>{today.medications.length}/{medications.length}</Text>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={saveTodaysEntry}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.saveButtonText}>Save Entry</Text>
      </TouchableOpacity>

      {/* Recent History */}
      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent History</Text>
          <View style={styles.historyList}>
            {history.slice(0, 5).map((entry) => (
              <View key={entry.date} style={styles.historyItem}>
                <Text style={styles.historyDate}>{entry.date}</Text>
                <Text style={styles.historyValue}>
                  {getMoodEmoji(entry.mood)} {entry.mood} • {getEnergyEmoji(entry.energy)} {entry.energy}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sliderValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 20,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  medicationsList: {
    gap: 8,
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  medicationItemActive: {
    backgroundColor: '#E8F4F8',
  },
  medicationCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationCheckboxActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  medicationLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  historyList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  historyItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  historyValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
});
