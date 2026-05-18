/**
 * Create a new profile — name + kind picker. In production builds the
 * kind defaults to `patient` (set by EXPO_PUBLIC_COMPANION_DEFAULT=1) and
 * the kind row is hidden; the caregiver only needs to type the name.
 *
 * In test mode the kind row is visible so Ivan can stand up either a
 * patient profile (Mom) or a power-user profile (himself).
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createProfile, switchToProfile, isTestMode, defaultFirstProfileKind, ProfileKind,
} from '../../utils/profileRegistry';
import { handleProfileSwitch } from '../../utils/companionNotifications';

export default function CreateProfile() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ProfileKind>(defaultFirstProfileKind());

  const onCreate = async () => {
    if (!name.trim()) return;
    const profile = await createProfile({ name, kind });
    await switchToProfile(profile.id);
    // No medications yet — call switch to clear other profiles' reminders.
    await handleProfileSwitch(profile.id, null);
    if (kind === 'patient') {
      router.replace('/companion');  // /companion home redirects to /companion/setup when config.setupCompleted is false
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add a profile</Text>
        <Text style={styles.subtitle}>
          Profiles keep each person's data, settings, and reminders separate on this phone.
        </Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={kind === 'patient' ? 'e.g. Mom (test)' : 'e.g. Ivan (me)'}
          autoFocus
          returnKeyType="done"
        />

        {isTestMode() ? (
          <>
            <Text style={styles.label}>What kind of profile?</Text>
            <View style={styles.kindRow}>
              <KindChoice
                title="Patient"
                subtitle="Companion mode — calm 4-card home, medication reminders, big Call-for-Help button."
                active={kind === 'patient'}
                onPress={() => setKind('patient')}
              />
              <KindChoice
                title="Power user"
                subtitle="Full app — chat, inbox, calendar, settings. Talks to the CLEO bridge."
                active={kind === 'power-user'}
                onPress={() => setKind('power-user')}
              />
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.primary, !name.trim() && styles.disabled]}
          onPress={onCreate}
          disabled={!name.trim()}
        >
          <Text style={styles.primaryText}>Create profile</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function KindChoice({ title, subtitle, active, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.kindCard, active && styles.kindCardActive]}
    >
      <Text style={[styles.kindTitle, active && styles.kindTitleActive]}>{title}</Text>
      <Text style={styles.kindSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F4' },
  container: { padding: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 6, lineHeight: 22 },
  label: { fontSize: 16, color: '#333', fontWeight: '600', marginTop: 24, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#DDD',
    padding: 16, fontSize: 18, color: '#1a1a1a',
  },
  kindRow: { gap: 12 },
  kindCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    borderWidth: 2, borderColor: '#DDD',
  },
  kindCardActive: { borderColor: '#4ECDC4', backgroundColor: '#E0F7F6' },
  kindTitle: { fontSize: 20, fontWeight: '700', color: '#444' },
  kindTitleActive: { color: '#00897B' },
  kindSubtitle: { fontSize: 14, color: '#666', marginTop: 6, lineHeight: 20 },
  primary: { backgroundColor: '#4ECDC4', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  disabled: { backgroundColor: '#CFD8DC' },
});
