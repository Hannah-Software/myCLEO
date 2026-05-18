/**
 * Root index — profile-aware router.
 *
 * v0.2 (IVA-1184): replaces the COMPANION_DEFAULT-only flag with a
 * profile-driven route. The build flags now hint at which kind to default
 * a fresh first profile to (COMPANION_DEFAULT=1 in the prod mother build);
 * the picker visibility is controlled by EXPO_PUBLIC_TEST_PROFILES.
 *
 * Decision tree:
 *   no profiles                       → /profiles/create
 *   one profile                       → activate it + route by its kind
 *   multiple profiles + test mode + no active → /profiles/pick
 *   multiple profiles + active        → route by active profile's kind
 *
 * The migration in CleoProvider ensures the legacy v0.1 single-tenant
 * data lands as a "Default Patient" or "Default Ivan" profile on first
 * run after upgrade.
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import {
  listProfiles, getActiveProfileId, switchToProfile, isTestMode,
} from '../utils/profileRegistry';
import { loadConfig } from '../utils/companionStore';
import { handleProfileSwitch } from '../utils/companionNotifications';

type Dest = '/profiles/create' | '/profiles/pick' | '/companion' | '/(tabs)';

export default function Index() {
  const [destination, setDestination] = useState<Dest | null>(null);

  useEffect(() => {
    (async () => {
      const profiles = await listProfiles();
      const activeId = await getActiveProfileId();

      if (profiles.length === 0) {
        setDestination('/profiles/create');
        return;
      }

      if (isTestMode() && profiles.length > 1 && !activeId) {
        setDestination('/profiles/pick');
        return;
      }

      // Resolve the active profile (or the most-recent one if none set yet).
      const id = activeId
        || profiles.sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1))[0].id;
      const active = await switchToProfile(id);
      let config = null;
      if (active.kind === 'patient') {
        try { config = await loadConfig(); } catch { /* no config yet */ }
      }
      await handleProfileSwitch(id, config);
      setDestination(active.kind === 'patient' ? '/companion' : '/(tabs)');
    })().catch((err) => {
      console.warn('[index] profile bootstrap failed:', err);
      // Fail open to the create-profile screen so the user can recover.
      setDestination('/profiles/create');
    });
  }, []);

  if (!destination) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F4' }}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }
  return <Redirect href={destination} />;
}
