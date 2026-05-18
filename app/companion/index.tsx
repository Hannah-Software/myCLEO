/**
 * Companion home — vertical scroll of the four cards: Today, Medications,
 * Family, Help. Bottom of screen has a tiny "Settings" cog that pops the
 * caregiver PIN flow before letting through.
 *
 * Re-renders the time line every minute so the greeting/date stays current
 * without a full data refetch.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  loadConfig, computeTodayDoses, CompanionConfig, DueDose,
} from '../../utils/companionStore';
import TodayCard from '../../components/companion/TodayCard';
import MedicationsCard from '../../components/companion/MedicationsCard';
import FamilyCard from '../../components/companion/FamilyCard';
import HelpCard from '../../components/companion/HelpCard';

export default function CompanionHome() {
  const router = useRouter();
  const [config, setConfig] = useState<CompanionConfig | null>(null);
  const [doses, setDoses] = useState<DueDose[]>([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const c = await loadConfig();
    setConfig(c);
    const d = await computeTodayDoses(c.medications, new Date());
    setDoses(d);
    setLoading(false);
  }, []);

  // Run on first mount AND whenever the screen regains focus (e.g. after
  // returning from Settings).
  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  // Tick the clock + recompute dose status every 30 seconds.
  useEffect(() => {
    const id = setInterval(async () => {
      const t = new Date();
      setNow(t);
      if (config) {
        const d = await computeTodayDoses(config.medications, t);
        setDoses(d);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [config]);

  // Redirect to setup wizard if config isn't ready.
  useEffect(() => {
    if (!loading && config && !config.setupCompleted) {
      router.replace('/companion/setup');
    }
  }, [loading, config, router]);

  if (loading || !config) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  if (!config.setupCompleted) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TodayCard config={config} now={now} />
        <MedicationsCard config={config} doses={doses} onDoseTaken={refresh} />
        <FamilyCard config={config} />
        <HelpCard config={config} />
        <View style={{ height: 80 }} />
      </ScrollView>
      <TouchableOpacity
        style={styles.cog}
        onPress={() => router.push('/companion/settings')}
        accessibilityLabel="Caregiver settings"
        hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
      >
        <Ionicons name="settings-outline" size={22} color="#888" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F4' },
  scroll: { padding: 20, paddingTop: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F4' },
  cog: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
});
