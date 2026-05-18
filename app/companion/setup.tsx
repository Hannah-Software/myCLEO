/**
 * First-launch caregiver wizard. Walks the caregiver (Ivan / Kerri) through:
 *   1. Pick the patient's language (EN/ES)
 *   2. Patient's name + preferred greeting name
 *   3. Home location (optional)
 *   4. Primary photo (optional)
 *   5. First emergency contact
 *   6. First medication (optional)
 *   7. Caregiver PIN
 * Then marks setupCompleted = true and routes to /companion.
 *
 * Each step is a single sparse screen — the caregiver should be able to
 * complete the wizard in under 5 minutes sitting next to the patient.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  patchConfig, Language, Contact, Medication, setCaregiverPin,
} from '../../utils/companionStore';
import { t } from '../../utils/companionI18n';
import { scheduleMedicationReminders } from '../../utils/companionNotifications';

type Step =
  | 'name' | 'home' | 'photo'
  | 'contact' | 'medication' | 'pin' | 'done';

const STEPS: Step[] = ['name','home','photo','contact','medication','pin','done'];

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');

  // English-only in v0.2 — language picker removed from the wizard.
  const language: Language = 'en';
  const [patientName, setPatientName] = useState('');
  const [preferredGreetingName, setPreferredGreetingName] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [primaryPhotoUri, setPrimaryPhotoUri] = useState<string | undefined>();
  // Wizard collects MULTIPLE contacts (was single-contact in v0.1 wizard).
  // Form is for the one currently being added; pressing "Save contact"
  // pushes it into `contacts` and clears the form for the next.
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medTimes, setMedTimes] = useState('08:00');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const advance = () => {
    const i = STEPS.indexOf(step);
    setStep(STEPS[Math.min(i + 1, STEPS.length - 1)]);
  };
  const skip = advance;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPrimaryPhotoUri(result.assets[0].uri);
    }
  };

  const finish = async () => {
    if (pin.length < 4) {
      Alert.alert('PIN too short', 'Choose at least 4 digits.');
      return;
    }
    if (pin !== pinConfirm) {
      Alert.alert('PINs do not match', 'Re-enter the PIN twice.');
      return;
    }
    await setCaregiverPin(pin);

    // If there's still a partially-filled contact in the form when finish
    // fires, save it too (tolerant — caregiver may have typed and tapped
    // straight to the PIN step).
    const pendingContact: Contact | null = contactName.trim() && contactPhone.trim() ? {
      id: `contact-${Date.now()}`,
      name: contactName.trim(),
      relationship: contactRelationship.trim(),
      phone: contactPhone.trim(),
      isPrimary: contacts.length === 0,
    } : null;
    const finalContacts: Contact[] = pendingContact ? [...contacts, pendingContact] : [...contacts];

    const medications: Medication[] = medName && medDosage ? [{
      id: 'med-1',
      displayName: medName,
      dosage: medDosage,
      schedule: medTimes.split(',').map((s) => s.trim()).filter(Boolean),
    }] : [];

    const next = await patchConfig({
      language,
      patientName,
      preferredGreetingName: preferredGreetingName || undefined,
      homeLocation: homeLocation || undefined,
      primaryPhotoUri,
      contacts: finalContacts,
      family: [],
      medications,
      setupCompleted: true,
    });

    if (medications.length > 0) {
      try {
        await scheduleMedicationReminders(next);
      } catch (e) {
        // Don't block setup on notification scheduling failures.
        console.warn('failed to schedule notifications', e);
      }
    }

    router.replace('/companion');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {step === 'name' && (
          <Step title="Setup — Name" subtitle={t(language, 'setup_who_is_this')}>
            <TextInput
              style={styles.input}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="Maria"
              autoFocus
              returnKeyType="next"
            />
            <Text style={styles.smallLabel}>What name should the app use when greeting? (Optional — e.g. "Mom")</Text>
            <TextInput
              style={styles.input}
              value={preferredGreetingName}
              onChangeText={setPreferredGreetingName}
              placeholder="Mom"
              returnKeyType="done"
            />
            <PrimaryButton onPress={advance} disabled={!patientName.trim()}>Next</PrimaryButton>
          </Step>
        )}

        {step === 'home' && (
          <Step title="Setup — Home" subtitle={t(language, 'setup_home_location')}>
            <TextInput
              style={styles.input}
              value={homeLocation}
              onChangeText={setHomeLocation}
              placeholder="home in Houston"
              autoFocus
            />
            <View style={styles.row}>
              <SecondaryButton onPress={skip}>Skip</SecondaryButton>
              <PrimaryButton onPress={advance}>Next</PrimaryButton>
            </View>
          </Step>
        )}

        {step === 'photo' && (
          <Step title="Setup — Photo" subtitle="Add a picture of the patient (shown on the home screen)">
            <TouchableOpacity onPress={pickImage} style={styles.photoPicker}>
              {primaryPhotoUri ? (
                <Image source={{ uri: primaryPhotoUri }} style={styles.photoPreview} />
              ) : (
                <Text style={styles.photoPickerText}>Tap to choose a photo</Text>
              )}
            </TouchableOpacity>
            <View style={styles.row}>
              <SecondaryButton onPress={skip}>Skip</SecondaryButton>
              <PrimaryButton onPress={advance}>Next</PrimaryButton>
            </View>
          </Step>
        )}

        {step === 'contact' && (
          <Step title="Setup — Emergency contacts" subtitle="Add anyone you'd want to call for help. The first contact you add is the primary one — that's the big red button on the home screen. You can add more in Settings later too.">
            {contacts.length > 0 ? (
              <View style={styles.savedList}>
                {contacts.map((c, idx) => (
                  <View key={c.id} style={styles.savedItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.savedName}>
                        {c.name}{idx === 0 ? '  ★ primary' : ''}
                      </Text>
                      <Text style={styles.savedMeta}>
                        {c.relationship ? c.relationship + ' · ' : ''}{c.phone}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setContacts(contacts.filter((x) => x.id !== c.id))}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.smallLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Ivan"
              autoFocus={contacts.length === 0}
              returnKeyType="next"
            />
            <Text style={styles.smallLabel}>Relationship (optional)</Text>
            <TextInput
              style={styles.input}
              value={contactRelationship}
              onChangeText={setContactRelationship}
              placeholder="your son"
              returnKeyType="next"
            />
            <Text style={styles.smallLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="(512) 555-1234"
              keyboardType="phone-pad"
              autoCapitalize="none"
              returnKeyType="done"
            />
            <Text style={styles.smallHint}>
              Any common format works — "(512) 555-1234", "512-555-1234", "+1 512 555 1234". The Companion app dials whatever you type.
            </Text>

            <TouchableOpacity
              style={[styles.addContactButton, (!contactName.trim() || !contactPhone.trim()) && styles.addContactButtonDim]}
              onPress={() => {
                const n = contactName.trim();
                const p = contactPhone.trim();
                if (!n || !p) {
                  Alert.alert(
                    'Need name and phone',
                    `Fill in:${n ? '' : '\n  • Name'}${p ? '' : '\n  • Phone'}\n\nThen tap "Save contact" again.`
                  );
                  return;
                }
                setContacts([...contacts, {
                  id: `contact-${Date.now()}`,
                  name: n,
                  relationship: contactRelationship.trim(),
                  phone: p,
                  isPrimary: contacts.length === 0,
                }]);
                setContactName('');
                setContactRelationship('');
                setContactPhone('');
              }}
            >
              <Text style={styles.addContactButtonText}>
                {contacts.length === 0 ? 'Save contact' : 'Save & add another'}
              </Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <SecondaryButton onPress={skip}>
                {contacts.length === 0 ? 'Skip — add later' : 'Done — continue'}
              </SecondaryButton>
              <PrimaryButton
                onPress={advance}
                disabled={contacts.length === 0 && (!contactName.trim() || !contactPhone.trim())}
              >
                Next
              </PrimaryButton>
            </View>
            {contacts.length === 0 && (!contactName.trim() || !contactPhone.trim()) ? (
              <Text style={styles.smallHint}>
                Fill name + phone, then tap "Save contact" — or tap "Skip" to add contacts later in Settings.
              </Text>
            ) : null}
          </Step>
        )}

        {step === 'medication' && (
          <Step title="Setup — Medication" subtitle="Add one medication now — more can be added later in Settings.">
            <Text style={styles.smallLabel}>Display name (use a name the patient recognizes)</Text>
            <TextInput style={styles.input} value={medName} onChangeText={setMedName} placeholder="The blue pill" autoFocus />
            <Text style={styles.smallLabel}>Dosage</Text>
            <TextInput style={styles.input} value={medDosage} onChangeText={setMedDosage} placeholder="1 tablet" />
            <Text style={styles.smallLabel}>Times (24h, comma-separated)</Text>
            <TextInput style={styles.input} value={medTimes} onChangeText={setMedTimes} placeholder="08:00, 20:00" />
            <View style={styles.row}>
              <SecondaryButton onPress={skip}>Skip</SecondaryButton>
              <PrimaryButton onPress={advance} disabled={!medName.trim()}>Next</PrimaryButton>
            </View>
          </Step>
        )}

        {step === 'pin' && (
          <Step title="Setup — Caregiver PIN" subtitle={t(language, 'setup_pin_prompt')}>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="4-digit code"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
            />
            <Text style={styles.smallLabel}>{t(language, 'setup_pin_repeat')}</Text>
            <TextInput
              style={styles.input}
              value={pinConfirm}
              onChangeText={setPinConfirm}
              placeholder="Re-enter code"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
            <PrimaryButton onPress={finish}>{t(language, 'setup_finish')}</PrimaryButton>
          </Step>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
      {children}
    </View>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({ onPress, children, disabled }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabledButton]}
      disabled={disabled}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({ onPress, children }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F4' },
  container: { padding: 24, paddingTop: 40 },
  step: { gap: 12 },
  smallHint: { fontSize: 13, color: '#777', lineHeight: 18, marginTop: 4 },
  savedList: { gap: 8, marginBottom: 10 },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7F6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  savedName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  savedMeta: { fontSize: 14, color: '#444', marginTop: 4 },
  removeText: { color: '#C62828', fontSize: 14, fontWeight: '600' },
  addContactButton: {
    backgroundColor: '#00897B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addContactButtonDim: { opacity: 0.55 },
  addContactButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stepTitle: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  stepSubtitle: { fontSize: 18, color: '#555', lineHeight: 26, marginBottom: 8 },
  label: { fontSize: 18, color: '#333', fontWeight: '600' },
  smallLabel: { fontSize: 14, color: '#666', marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    fontSize: 18,
    color: '#1a1a1a',
  },
  row: { flexDirection: 'row', gap: 12, marginTop: 16, alignItems: 'center' },
  choice: {
    flex: 1, padding: 18, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 2, borderColor: '#ddd', alignItems: 'center',
  },
  choiceActive: { borderColor: '#4ECDC4', backgroundColor: '#E0F7F6' },
  choiceText: { fontSize: 20, color: '#666', fontWeight: '600' },
  choiceTextActive: { color: '#00897B' },
  primaryButton: {
    backgroundColor: '#4ECDC4',
    padding: 18, borderRadius: 14, alignItems: 'center', flex: 1, marginTop: 24,
  },
  primaryButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: 'transparent', padding: 18, borderRadius: 14, alignItems: 'center', flex: 1,
    borderWidth: 2, borderColor: '#ddd', marginTop: 24,
  },
  secondaryButtonText: { color: '#666', fontSize: 18, fontWeight: '600' },
  disabledButton: { backgroundColor: '#CFD8DC' },
  photoPicker: {
    height: 200, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  photoPickerText: { fontSize: 18, color: '#888' },
  photoPreview: { width: '100%', height: '100%', borderRadius: 16 },
});
