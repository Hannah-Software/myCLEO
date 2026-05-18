/**
 * Today card — first thing the patient sees on opening the app.
 *
 * Greeting (time-aware), name, today's date in long form, and "you are at
 * <home>" orientation line. Primary photo (if uploaded) sits to the right.
 *
 * This card is the cognitive scaffold — the same shape every morning so
 * opening the app feels familiar even on harder days.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import CompanionCard from './CompanionCard';
import type { CompanionConfig } from '../../utils/companionStore';
import { t, formatLocalDate, greetingFor } from '../../utils/companionI18n';
import { speak } from '../../utils/companionVoice';

interface Props {
  config: CompanionConfig;
  now: Date;
}

export default function TodayCard({ config, now }: Props) {
  const greeting = t(config.language, greetingFor(config.language, now));
  const name = config.preferredGreetingName || config.patientName || '';
  const dateLine = `${t(config.language, 'today_is')} ${formatLocalDate(config.language, now)}.`;
  const placeLine = config.homeLocation
    ? `${t(config.language, 'you_are_at')} ${config.homeLocation}.`
    : '';

  const headline = name ? `${greeting}, ${name}.` : `${greeting}.`;
  const spokenText = [headline, dateLine, placeLine].filter(Boolean).join(' ');

  // Auto-speak once per minute when this card is mounted (mom may stare at the
  // screen waiting for it to talk). Caregiver can disable via ttsAutoSpeak.
  useEffect(() => {
    if (config.ttsAutoSpeak) {
      speak(spokenText, config.language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.getMinutes()]);

  return (
    <CompanionCard
      title={headline}
      language={config.language}
      spokenText={spokenText}
      accent="#4ECDC4"
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.dateLine}>{dateLine}</Text>
          {placeLine ? <Text style={styles.placeLine}>{placeLine}</Text> : null}
        </View>
        {config.primaryPhotoUri ? (
          <Image source={{ uri: config.primaryPhotoUri }} style={styles.photo} />
        ) : null}
      </View>
    </CompanionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  textCol: {
    flex: 1,
  },
  dateLine: {
    fontSize: 22,
    color: '#333',
    marginBottom: 6,
    lineHeight: 30,
  },
  placeLine: {
    fontSize: 20,
    color: '#555',
    lineHeight: 28,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eee',
  },
});
