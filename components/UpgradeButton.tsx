import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

/**
 * "Upgrade" / Check-for-updates button. Pulls the latest published EAS Update
 * (OTA) on demand and reloads the app into it — so Ivan can grab the newest
 * version from his phone without waiting for the auto-check or remembering CLI.
 *
 * Drops into Settings as a self-contained section. In Expo Go / dev,
 * Updates.isEnabled is false → the button explains it only works in an
 * installed build (the sideloaded preview APK).
 */
type Status = 'idle' | 'checking' | 'downloading' | 'up-to-date' | 'error';

export function UpgradeButton() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const enabled = Updates.isEnabled;
  const channel = (Updates as any).channel ?? null;
  const runtimeVersion = (Updates as any).runtimeVersion ?? null;
  const shortId = Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded';

  const onPress = async () => {
    if (!enabled) {
      Alert.alert(
        'Updates not active here',
        'Over-the-air updates only work in an installed build (your sideloaded myCLEO APK), not in Expo Go or a dev session.'
      );
      return;
    }
    try {
      setStatus('checking');
      setMessage(null);
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        setStatus('up-to-date');
        setMessage("You're on the latest version.");
        return;
      }
      setStatus('downloading');
      await Updates.fetchUpdateAsync();
      // reloadAsync restarts the app into the freshly downloaded update.
      await Updates.reloadAsync();
    } catch (err: any) {
      setStatus('error');
      setMessage(`Update failed: ${err?.message ?? 'unknown error'}`);
    }
  };

  const busy = status === 'checking' || status === 'downloading';
  const label =
    status === 'checking' ? 'Checking…'
    : status === 'downloading' ? 'Downloading…'
    : 'Check for updates';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>App Updates</Text>

      <TouchableOpacity
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={onPress}
        disabled={busy}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <View style={styles.btnRow}>
            <Ionicons name="cloud-download-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>

      {message ? (
        <Text style={[styles.result, status === 'error' && { color: '#B71C1C' }]}>{message}</Text>
      ) : null}

      <Text style={styles.footnote}>
        Pulls the latest published version onto your phone and reloads.
        {'\n'}Version: {runtimeVersion ?? '?'}
        {channel ? ` · channel ${channel}` : ''}
        {' · '}update {shortId}
        {!enabled ? '\n(Updates are inactive in Expo Go / dev — only in the installed app.)' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#1a1a1a' },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  result: { marginTop: 10, fontSize: 13.5, color: '#1B5E20', fontWeight: '500' },
  footnote: { marginTop: 10, fontSize: 12, color: '#888', lineHeight: 17 },
});
