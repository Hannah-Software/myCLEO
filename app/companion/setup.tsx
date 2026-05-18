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
  | 'language' | 'name' | 'home' | 'photo'
  | 'contact' | 'medication' | 'pin' | 'done';

const STEPS: Step[] = ['language','name','home','photo','contact','medication','pin','done'];

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('language');

  // Working draft of config
  const [language, setLanguage] = useState<Language>('en');
  const [patientName, setPatientName] = useState('');
  const [preferredGreetingName, setPreferredGreetingName] = useState('');
  const [homeLocation, setHomeLocation] = useState('');
  const [primaryPhotoUri, setPrimaryPhotoUri] = useState<string | undefined>();
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

    const contacts: Contact[] = contactName && contactPhone ? [{
      id: 'contact-1',
      name: contactName,
      relationship: contactRelationship,
      phone: contactPhone,
      isPrimary: true,
    }] : [];

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
      contacts,
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
        {step === 'language' && (
          <Step title="Setup — Welcome" subtitle={t(language, 'setup_welcome')}>
            <Text style={styles.label}>{t(language, 'setup_what_language')}</Text>
            <View style={styles.row}>
              <Choice label="English" active={language === 'en'} onPress={() => setLanguage('en')} />
              <Choice label="Español" active={language === 'es'} onPress={() => setLanguage('es')} />
            </View>
            <PrimaryButton onPress={advance}>Next</PrimaryButton>
          </Step>
        )}

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
          <Step title="Setup — Emergency contact" subtitle={t(language, 'setup_first_contact_prompt')}>
            <Text style={styles.smallLabel}>Name</Text>
            <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Ivan" autoFocus />
            <Text style={styles.smallLabel}>Relationship</Text>
            <TextInput style={styles.input} value={contactRelationship} onChangeText={setContactRelationship} placeholder="your son" />
            <Text style={styles.smallLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+15125551234"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <View style={styles.row}>
              <SecondaryButton onPress={skip}>Skip</SecondaryButton>
              <PrimaryButton onPress={advance} disabled={!contactName.trim() || !contactPhone.trim()}>Next</PrimaryButton>
            </View>
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
  step: { gap: 16 },
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
