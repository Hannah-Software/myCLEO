/**
 * PIN-protected caregiver settings. After the wizard, this is the only way
 * to edit the patient's name, location, contacts, family photos, medications,
 * language, or large-text/TTS toggles.
 *
 * Sections are designed for one-pass editing. Add/remove inline. Save on
 * every change so the caregiver doesn't lose work to a back-press.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  loadConfig, patchConfig, verifyCaregiverPin, caregiverPinExists,
  setCaregiverPin, resetConfig, CompanionConfig, Contact, Medication, FamilyPhoto,
} from '../../utils/companionStore';
import {
  scheduleMedicationReminders, clearScheduledMedicationReminders,
} from '../../utils/companionNotifications';
import { t } from '../../utils/companionI18n';

export default function CaregiverSettings() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [hasPin, setHasPin] = useState(true);
  const [config, setConfig] = useState<CompanionConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const pinPresent = await caregiverPinExists();
      setHasPin(pinPresent);
      if (!pinPresent) setUnlocked(true);
      const c = await loadConfig();
      setConfig(c);
    })();
  }, []);

  const tryUnlock = async () => {
    if (await verifyCaregiverPin(enteredPin)) {
      setUnlocked(true);
      setError('');
    } else {
      setError(config ? t(config.language, 'settings_wrong_pin') : 'Wrong PIN');
    }
  };

  const save = async (patch: Partial<CompanionConfig>) => {
    const next = await patchConfig(patch);
    setConfig(next);
    if (patch.medications) {
      try { await scheduleMedicationReminders(next); } catch { /* non-fatal */ }
    }
  };

  if (!config) return <View style={styles.root}><Text>Loading…</Text></View>;

  if (!unlocked) {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.pinPane}>
          <Text style={styles.pinTitle}>{t(config.language, 'settings_locked')}</Text>
          <Text style={styles.pinSubtitle}>{t(config.language, 'settings_enter_pin')}</Text>
          <TextInput
            style={styles.pinInput}
            value={enteredPin}
            onChangeText={setEnteredPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            autoFocus
          />
          {error ? <Text style={styles.pinError}>{error}</Text> : null}
          <TouchableOpacity style={styles.unlockButton} onPress={tryUnlock}>
            <Text style={styles.unlockButtonText}>Unlock</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: '#888', fontSize: 16 }}>Back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Caregiver settings</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#666" />
        </TouchableOpacity>
      </View>

      <IdentitySection config={config} save={save} />
      <ContactsSection config={config} save={save} />
      <FamilySection config={config} save={save} />
      <MedicationsSection config={config} save={save} />
      <PreferencesSection config={config} save={save} />
      <DangerSection config={config} save={save} router={router} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function IdentitySection({ config, save }: any) {
  const [name, setName] = useState(config.patientName);
  const [greeting, setGreeting] = useState(config.preferredGreetingName || '');
  const [home, setHome] = useState(config.homeLocation || '');
  const [primaryPhotoUri, setPrimaryPhotoUri] = useState(config.primaryPhotoUri);
  return (
    <Section title="Identity">
      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} onEndEditing={() => save({ patientName: name })} />
      <Text style={styles.fieldLabel}>Preferred greeting name</Text>
      <TextInput style={styles.input} value={greeting} onChangeText={setGreeting} onEndEditing={() => save({ preferredGreetingName: greeting || undefined })} />
      <Text style={styles.fieldLabel}>Home location</Text>
      <TextInput style={styles.input} value={home} onChangeText={setHome} onEndEditing={() => save({ homeLocation: home || undefined })} />
      <Text style={styles.fieldLabel}>Primary photo</Text>
      <TouchableOpacity
        style={styles.photoPicker}
        onPress={async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!r.canceled && r.assets[0]) {
            setPrimaryPhotoUri(r.assets[0].uri);
            save({ primaryPhotoUri: r.assets[0].uri });
          }
        }}
      >
        {primaryPhotoUri ? (
          <Image source={{ uri: primaryPhotoUri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
        ) : (
          <Text style={styles.photoPickerText}>Tap to choose</Text>
        )}
      </TouchableOpacity>
    </Section>
  );
}

function ContactsSection({ config, save }: any) {
  const [list, setList] = useState<Contact[]>(config.contacts);
  const update = (next: Contact[]) => { setList(next); save({ contacts: next }); };
  const add = () => update([...list, { id: `contact-${Date.now()}`, name: '', relationship: '', phone: '', isPrimary: list.length === 0 }]);
  const remove = (id: string) => update(list.filter(c => c.id !== id));
  const setField = (id: string, k: keyof Contact, v: any) => update(list.map(c => c.id === id ? { ...c, [k]: v } : c));
  return (
    <Section title="Emergency contacts">
      {list.map(c => (
        <View key={c.id} style={styles.itemCard}>
          <TextInput style={styles.input} value={c.name} onChangeText={(v) => setField(c.id, 'name', v)} placeholder="Name" />
          <TextInput style={styles.input} value={c.relationship} onChangeText={(v) => setField(c.id, 'relationship', v)} placeholder="Relationship" />
          <TextInput style={styles.input} value={c.phone} onChangeText={(v) => setField(c.id, 'phone', v)} placeholder="Phone" keyboardType="phone-pad" autoCapitalize="none" />
          <View style={styles.itemRow}>
            <TouchableOpacity onPress={() => setField(c.id, 'isPrimary', !c.isPrimary)}>
              <Text style={{ color: c.isPrimary ? '#00897B' : '#888', fontWeight: '600' }}>
                {c.isPrimary ? '★ Primary' : '☆ Make primary'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(c.id)}>
              <Ionicons name="trash-outline" size={22} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={add}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add contact</Text>
      </TouchableOpacity>
    </Section>
  );
}

function FamilySection({ config, save }: any) {
  const [list, setList] = useState<FamilyPhoto[]>(config.family);
  const update = (next: FamilyPhoto[]) => { setList(next); save({ family: next }); };
  const add = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled && r.assets[0]) {
      update([...list, { id: `fam-${Date.now()}`, uri: r.assets[0].uri, caption: '' }]);
    }
  };
  const remove = (id: string) => update(list.filter(f => f.id !== id));
  const setCaption = (id: string, v: string) => update(list.map(f => f.id === id ? { ...f, caption: v } : f));
  return (
    <Section title="Family photos">
      {list.map(f => (
        <View key={f.id} style={styles.itemCard}>
          <Image source={{ uri: f.uri }} style={{ width: '100%', height: 160, borderRadius: 12 }} />
          <TextInput
            style={styles.input}
            value={f.caption}
            onChangeText={(v) => setCaption(f.id, v)}
            placeholder='Caption — read aloud, e.g. "Ivan, your son"'
          />
          <TouchableOpacity onPress={() => remove(f.id)} style={{ alignSelf: 'flex-end' }}>
            <Ionicons name="trash-outline" size={22} color="#E53935" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={add}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add photo</Text>
      </TouchableOpacity>
    </Section>
  );
}

function MedicationsSection({ config, save }: any) {
  const [list, setList] = useState<Medication[]>(config.medications);
  const update = (next: Medication[]) => { setList(next); save({ medications: next }); };
  const add = () => update([...list, { id: `med-${Date.now()}`, displayName: '', dosage: '', schedule: ['08:00'] }]);
  const remove = (id: string) => update(list.filter(m => m.id !== id));
  const setField = (id: string, k: keyof Medication, v: any) =>
    update(list.map(m => m.id === id ? { ...m, [k]: v } : m));
  return (
    <Section title="Medications">
      {list.map(m => (
        <View key={m.id} style={styles.itemCard}>
          <TextInput style={styles.input} value={m.displayName} onChangeText={(v) => setField(m.id, 'displayName', v)} placeholder="Display name" />
          <TextInput style={styles.input} value={m.dosage} onChangeText={(v) => setField(m.id, 'dosage', v)} placeholder="Dosage" />
          <TextInput
            style={styles.input}
            value={m.schedule.join(', ')}
            onChangeText={(v) => setField(m.id, 'schedule', v.split(',').map(s => s.trim()).filter(Boolean))}
            placeholder="08:00, 20:00"
          />
          <View style={styles.itemRow}>
            <TouchableOpacity onPress={() => setField(m.id, 'withFood', !m.withFood)}>
              <Text style={{ color: m.withFood ? '#00897B' : '#888', fontWeight: '600' }}>
                {m.withFood ? '✓ With food' : 'Take with food?'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(m.id)}>
              <Ionicons name="trash-outline" size={22} color="#E53935" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.addButton} onPress={add}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add medication</Text>
      </TouchableOpacity>
    </Section>
  );
}

function PreferencesSection({ config, save }: any) {
  return (
    <Section title="Preferences">
      <View style={styles.itemRow}>
        <Text style={styles.fieldLabel}>Language</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['en','es'] as const).map(l => (
            <TouchableOpacity
              key={l}
              onPress={() => save({ language: l })}
              style={[styles.choice, config.language === l && styles.choiceActive]}
            >
              <Text style={[styles.choiceText, config.language === l && styles.choiceTextActive]}>
                {l === 'en' ? 'English' : 'Español'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.itemRow}>
        <Text style={styles.fieldLabel}>Auto-speak Today card</Text>
        <Switch value={config.ttsAutoSpeak} onValueChange={(v) => save({ ttsAutoSpeak: v })} />
      </View>
      <View style={styles.itemRow}>
        <Text style={styles.fieldLabel}>Bridge sync (advanced)</Text>
        <Switch value={config.bridgeSyncEnabled} onValueChange={(v) => save({ bridgeSyncEnabled: v })} />
      </View>
    </Section>
  );
}

function DangerSection({ config, save, router }: any) {
  return (
    <Section title="Reset">
      <TouchableOpacity
        style={styles.dangerButton}
        onPress={() => Alert.alert(
          'Erase all companion data?',
          'This removes name, photos, contacts, medications, and the caregiver PIN. The setup wizard runs again next launch.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Erase', style: 'destructive', onPress: async () => {
              await clearScheduledMedicationReminders();
              await resetConfig();
              router.replace('/companion');
            } },
          ]
        )}
      >
        <Text style={styles.dangerButtonText}>Erase all companion data</Text>
      </TouchableOpacity>
    </Section>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F4' },
  container: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionLabel: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  fieldLabel: { fontSize: 14, color: '#666', marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 10, padding: 12, fontSize: 16, color: '#1a1a1a', marginBottom: 8,
  },
  itemCard: {
    backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEE',
  },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 4 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4ECDC4', padding: 12, borderRadius: 10, gap: 8, marginTop: 8,
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  photoPicker: {
    height: 120, backgroundColor: '#FAFAFA', borderRadius: 12,
    borderWidth: 2, borderColor: '#DDD', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginVertical: 8,
  },
  photoPickerText: { color: '#888', fontSize: 14 },
  choice: { padding: 10, borderRadius: 8, borderWidth: 2, borderColor: '#DDD' },
  choiceActive: { borderColor: '#4ECDC4', backgroundColor: '#E0F7F6' },
  choiceText: { color: '#888', fontWeight: '600' },
  choiceTextActive: { color: '#00897B' },
  dangerButton: { backgroundColor: '#FFE9E0', padding: 14, borderRadius: 10, alignItems: 'center' },
  dangerButtonText: { color: '#C62828', fontWeight: '700', fontSize: 16 },
  pinPane: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  pinTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  pinSubtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  pinInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 22,
    textAlign: 'center', letterSpacing: 12, width: 220,
    borderWidth: 1, borderColor: '#DDD',
  },
  pinError: { color: '#E53935', marginTop: 12 },
  unlockButton: {
    backgroundColor: '#4ECDC4', padding: 16, borderRadius: 12,
    paddingHorizontal: 40, marginTop: 24,
  },
  unlockButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
