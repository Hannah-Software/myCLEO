import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

interface PartnerCheckInFormProps {
  onSubmit: (mood: number, energy: number, notes?: string) => Promise<void>;
  isLoading?: boolean;
}

export function PartnerCheckInForm({ onSubmit, isLoading = false }: PartnerCheckInFormProps) {
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    await onSubmit(mood, energy, notes);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How are you feeling?</Text>

        {/* Mood Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Mood</Text>
            <View style={styles.moodIndicator}>
              <Text style={styles.moodEmoji}>
                {mood <= 3 ? '😔' : mood <= 5 ? '😐' : mood <= 7 ? '🙂' : '😄'}
              </Text>
              <Text style={styles.moodNumber}>{mood}/10</Text>
            </View>
          </View>
          <View style={styles.sliderTrack}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <TouchableOpacity
                key={num}
                style={[styles.sliderDot, mood === num && styles.sliderDotActive]}
                onPress={() => setMood(num)}
              >
                <View style={styles.sliderDotInner} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Energy Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Energy</Text>
            <View style={styles.energyIndicator}>
              <Text style={styles.energyEmoji}>
                {energy <= 3 ? '🔋' : energy <= 5 ? '⚡' : '🔥'}
              </Text>
              <Text style={styles.energyNumber}>{energy}/10</Text>
            </View>
          </View>
          <View style={styles.sliderTrack}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <TouchableOpacity
                key={num}
                style={[styles.sliderDot, energy === num && styles.sliderDotActive]}
                onPress={() => setEnergy(num)}
              >
                <View style={styles.sliderDotInner} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes (optional) */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes (optional)</Text>
          <View style={styles.notesInput}>
            <Text style={styles.notesPlaceholder}>
              {notes || "What's on your mind? (e.g., 'Had a great sleep', 'Feeling stressed')"}
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Saving...' : 'Save Check-In'}
          </Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 20,
    gap: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  sliderSection: {
    gap: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  energyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  energyEmoji: {
    fontSize: 20,
  },
  energyNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB627',
  },
  sliderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    gap: 2,
  },
  sliderDot: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#e8e8e8',
  },
  sliderDotActive: {
    backgroundColor: '#007AFF',
  },
  sliderDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  notesSection: {
    gap: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  notesPlaceholder: {
    fontSize: 13,
    color: '#999',
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
