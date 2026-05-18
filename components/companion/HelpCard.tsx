/**
 * Help card — single big button to call the primary contact, with smaller
 * fallbacks for any additional contacts. Tap → tel: link via Linking.
 *
 * Loud red color is intentional: this is the one card where the patient
 * SHOULD know what to do without thinking. Every other card is calming.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CompanionCard from './CompanionCard';
import type { CompanionConfig, Contact } from '../../utils/companionStore';
import { t } from '../../utils/companionI18n';
import { speak } from '../../utils/companionVoice';

interface Props {
  config: CompanionConfig;
}

export default function HelpCard({ config }: Props) {
  const primary = config.contacts.find((c) => c.isPrimary) || config.contacts[0];
  const backups = config.contacts.filter((c) => c !== primary).slice(0, 3);

  const placeCall = async (contact: Contact) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      /* ignore */
    }
    speak(t(config.language, 'help_calling'), config.language);
    const url = `tel:${contact.phone.replace(/[^\d+]/g, '')}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Cannot place call', url);
    } catch (e: any) {
      Alert.alert('Cannot place call', String(e));
    }
  };

  const spokenSummary = primary
    ? t(config.language, 'help_call_button', { name: primary.name })
    : t(config.language, 'help_no_contact');

  return (
    <CompanionCard
      title={t(config.language, 'help_section_title')}
      language={config.language}
      spokenText={spokenSummary}
      accent="#E53935"
    >
      {primary ? (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => placeCall(primary)}
          accessibilityLabel={t(config.language, 'help_call_button', { name: primary.name })}
        >
          <Ionicons name="call" size={48} color="#fff" />
          <View style={styles.primaryLabels}>
            <Text style={styles.primaryName}>{primary.name}</Text>
            {primary.relationship ? (
              <Text style={styles.primaryRelationship}>{primary.relationship}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={styles.empty}>{t(config.language, 'help_no_contact')}</Text>
      )}
      {backups.length > 0 ? (
        <View style={styles.backupRow}>
          {backups.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.backupButton}
              onPress={() => placeCall(c)}
            >
              <Ionicons name="call-outline" size={22} color="#E53935" />
              <Text style={styles.backupText} numberOfLines={1}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </CompanionCard>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    gap: 18,
  },
  primaryLabels: {
    flex: 1,
  },
  primaryName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  primaryRelationship: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    marginTop: 4,
  },
  backupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  backupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E53935',
  },
  backupText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: 140,
  },
  empty: {
    fontSize: 18,
    color: '#777',
  },
});
