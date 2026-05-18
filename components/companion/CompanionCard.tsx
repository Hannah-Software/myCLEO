/**
 * CompanionCard — visually-consistent container for every Companion screen
 * section. Includes a "tap to hear" speaker chip that speaks the supplied
 * `spokenText` (or the visible title if none).
 *
 * Large by default. Generous padding. High-contrast. The Alzheimer's-tester
 * audience benefits most from sparse, predictable surfaces — every card
 * looks the same so muscle memory builds.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { speak } from '../../utils/companionVoice';
import type { Language } from '../../utils/companionStore';
import { t } from '../../utils/companionI18n';

interface Props {
  title: string;
  language: Language;
  spokenText?: string;
  accent?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export default function CompanionCard({
  title,
  language,
  spokenText,
  accent = '#4ECDC4',
  children,
  style,
}: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: accent }, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          accessibilityLabel={t(language, 'tap_to_hear')}
          style={[styles.speakerChip, { backgroundColor: accent }]}
          onPress={() => speak(spokenText || title, language)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="volume-high" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    paddingRight: 16,
  },
  speakerChip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    marginTop: 4,
  },
});
