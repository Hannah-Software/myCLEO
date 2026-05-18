/**
 * Medications card — today's scheduled doses, with the highest-priority
 * dose surfaced first (overdue > due-now > upcoming > taken).
 *
 * Action is a single big "I took it" button. Tap → mark taken + speak the
 * thank-you string + soft haptic. No way to undo from the patient surface;
 * caregiver can edit history from Settings if needed.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CompanionCard from './CompanionCard';
import type { CompanionConfig, DueDose } from '../../utils/companionStore';
import { markDoseTaken } from '../../utils/companionStore';
import { t } from '../../utils/companionI18n';
import { speak } from '../../utils/companionVoice';

interface Props {
  config: CompanionConfig;
  doses: DueDose[];
  onDoseTaken: () => void;
}

const STATUS_ORDER: DueDose['status'][] = ['overdue', 'due-now', 'upcoming', 'taken'];

export default function MedicationsCard({ config, doses, onDoseTaken }: Props) {
  const sorted = [...doses].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      a.scheduledDate.getTime() - b.scheduledDate.getTime()
  );
  const takenToday = sorted.filter((d) => d.status === 'taken').length;
  const total = sorted.length;
  const next = sorted.find((d) => d.status !== 'taken');

  const counterLine = total === 0
    ? t(config.language, 'meds_none_today')
    : t(config.language, 'meds_count_taken', { taken: takenToday, total });

  const handleTaken = async (dose: DueDose) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* haptics may be unavailable on some devices */
    }
    await markDoseTaken(dose.medicationId, dose.scheduledFor);
    speak(t(config.language, 'meds_thank_you'), config.language);
    onDoseTaken();
  };

  const spokenSummary = next
    ? `${counterLine}. ${formatNextDose(config.language, next)}`
    : counterLine;

  return (
    <CompanionCard
      title={t(config.language, 'meds_section_title')}
      language={config.language}
      spokenText={spokenSummary}
      accent="#F9A825"
    >
      <Text style={styles.counter}>{counterLine}</Text>
      {sorted.length === 0 ? null : sorted.map((dose) => (
        <DoseRow
          key={`${dose.medicationId}-${dose.scheduledFor}`}
          dose={dose}
          config={config}
          onTaken={() => handleTaken(dose)}
        />
      ))}
    </CompanionCard>
  );
}

function DoseRow({
  dose,
  config,
  onTaken,
}: {
  dose: DueDose;
  config: CompanionConfig;
  onTaken: () => void;
}) {
  const palette = palettes[dose.status];
  const label =
    dose.status === 'taken'   ? t(config.language, 'meds_taken_check')   :
    dose.status === 'overdue' ? t(config.language, 'meds_overdue')       :
    dose.status === 'due-now' ? t(config.language, 'meds_due_now')       :
                                t(config.language, 'meds_upcoming');

  const timeStr = dose.scheduledFor;

  return (
    <View style={[styles.row, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.rowText}>
        <Text style={styles.rowMed}>{dose.displayName}</Text>
        <Text style={styles.rowMeta}>
          {dose.dosage} · {timeStr}
          {dose.withFood ? ` · ${t(config.language, 'meds_with_food')}` : ''}
        </Text>
        <Text style={[styles.rowStatus, { color: palette.text }]}>{label}</Text>
      </View>
      {dose.status === 'taken' ? (
        <Ionicons name="checkmark-circle" size={56} color="#388E3C" />
      ) : (
        <TouchableOpacity
          style={styles.tookButton}
          onPress={onTaken}
          accessibilityLabel={t(config.language, 'meds_i_took_it')}
        >
          <Text style={styles.tookButtonText}>
            {t(config.language, 'meds_i_took_it')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatNextDose(lang: import('../../utils/companionStore').Language, d: DueDose): string {
  const phrase =
    d.status === 'overdue' ? t(lang, 'meds_overdue') :
    d.status === 'due-now' ? t(lang, 'meds_due_now') :
                              t(lang, 'meds_upcoming');
  return `${d.displayName} — ${d.dosage}. ${phrase}.`;
}

const palettes: Record<DueDose['status'], { bg: string; border: string; text: string }> = {
  'overdue':  { bg: '#FFE9E0', border: '#FF7043', text: '#C62828' },
  'due-now':  { bg: '#FFF7E0', border: '#FFB300', text: '#E65100' },
  'upcoming': { bg: '#F5F5F5', border: '#BDBDBD', text: '#424242' },
  'taken':    { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
};

const styles = StyleSheet.create({
  counter: {
    fontSize: 20,
    color: '#444',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 12,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowMed: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  rowMeta: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  rowStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  tookButton: {
    backgroundColor: '#388E3C',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 110,
    alignItems: 'center',
  },
  tookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
