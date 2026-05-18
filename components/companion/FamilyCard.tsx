/**
 * Family card — rotating photo of a family member with caption.
 *
 * Auto-advances every 8 seconds when visible. Tapping the photo advances
 * manually + speaks the caption. The caption is the most important field:
 * "Ivan, your son" reorients the patient when she can't quite place the face.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import CompanionCard from './CompanionCard';
import type { CompanionConfig } from '../../utils/companionStore';
import { t } from '../../utils/companionI18n';
import { speak } from '../../utils/companionVoice';

interface Props {
  config: CompanionConfig;
}

export default function FamilyCard({ config }: Props) {
  const [idx, setIdx] = useState(0);
  const family = config.family;

  useEffect(() => {
    if (family.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % family.length);
    }, 8000);
    return () => clearInterval(id);
  }, [family.length]);

  const member = family[idx];

  const advance = () => {
    if (family.length === 0) return;
    const next = (idx + 1) % family.length;
    setIdx(next);
    speak(family[next].caption, config.language);
  };

  return (
    <CompanionCard
      title={t(config.language, 'family_section_title')}
      language={config.language}
      spokenText={member ? member.caption : t(config.language, 'family_no_photos')}
      accent="#7E57C2"
    >
      {member ? (
        <TouchableOpacity activeOpacity={0.85} onPress={advance}>
          <Image source={{ uri: member.uri }} style={styles.photo} resizeMode="cover" />
          <Text style={styles.caption}>{member.caption}</Text>
          {family.length > 1 ? (
            <Text style={styles.dots}>
              {family.map((_, i) => (i === idx ? '●' : '○')).join(' ')}
            </Text>
          ) : null}
        </TouchableOpacity>
      ) : (
        <Text style={styles.empty}>{t(config.language, 'family_no_photos')}</Text>
      )}
    </CompanionCard>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  caption: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 14,
    textAlign: 'center',
  },
  dots: {
    fontSize: 18,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 6,
  },
  empty: {
    fontSize: 18,
    color: '#777',
  },
});
