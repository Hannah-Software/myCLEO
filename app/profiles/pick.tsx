/**
 * Profile picker — list of profiles, tap to switch.
 *
 * Only shown when test mode is on (`EXPO_PUBLIC_TEST_PROFILES=1`) or when
 * arriving from "Add new profile" intent. In production (real mom), the
 * router never sends users here because there's only one profile.
 *
 * Switching profile cancels the inactive profile's medication reminders
 * and schedules the new active profile's reminders. See
 * `handleProfileSwitch` in companionNotifications.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  listProfiles, switchToProfile, deleteProfile, getActiveProfileId,
  isTestMode, Profile,
} from '../../utils/profileRegistry';
import { loadConfig } from '../../utils/companionStore';
import { handleProfileSwitch } from '../../utils/companionNotifications';

export default function ProfilePicker() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listProfiles();
    list.sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));
    setProfiles(list);
    setActiveId(await getActiveProfileId());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onPick = async (p: Profile) => {
    await switchToProfile(p.id);
    // Reload config under the newly-active profile, then re-arm reminders
    let config = null;
    try { config = await loadConfig(); } catch { /* patient with no config yet */ }
    await handleProfileSwitch(p.id, config);
    if (p.kind === 'patient') {
      // If the patient profile is fresh (no setup), the home screen will
      // redirect to /companion/setup on its own.
      router.replace('/companion');
    } else {
      router.replace('/(tabs)');
    }
  };

  const onDelete = (p: Profile) => {
    Alert.alert(
      `Delete "${p.name}"?`,
      `Removes this profile and all of its data on this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProfile(p.id);
            await refresh();
            // If we just deleted the active profile, force the root router
            // to pick up the new state.
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Who's using this phone?</Text>
      <Text style={styles.subtitle}>
        {isTestMode()
          ? 'Test mode — pick a profile or add a new one.'
          : 'Pick a profile to continue.'}
      </Text>
      <FlatList
        data={profiles}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPick(item)}
            onLongPress={() => onDelete(item)}
            delayLongPress={600}
            style={[styles.row, item.id === activeId && styles.activeRow]}
          >
            {item.avatarUri ? (
              <Image source={{ uri: item.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowKind}>
                {item.kind === 'patient' ? 'Patient (Companion mode)' : 'Power user (full app)'}
              </Text>
            </View>
            {item.id === activeId && (
              <Ionicons name="checkmark-circle" size={26} color="#388E3C" />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No profiles yet. Tap "Add new profile" below.</Text>
        }
      />
      {isTestMode() ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/profiles/create')}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Add new profile</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.hint}>Long-press a profile to delete it.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F4', padding: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, borderRadius: 14, marginBottom: 12,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  activeRow: { borderColor: '#4ECDC4' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: '#CFD8DC', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
  rowName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  rowKind: { fontSize: 14, color: '#777', marginTop: 4 },
  empty: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 40 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4ECDC4', padding: 16, borderRadius: 14, gap: 8, marginTop: 8,
  },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 10 },
});
