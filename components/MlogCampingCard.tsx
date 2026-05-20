import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMlogDomain } from '../hooks/useMlogDomain';

/**
 * Home-tab card for the MLOG (camping/production) life-domain. Reads the CLEO
 * bridge GET /v1/domains/mlog snapshot and shows the glanceable headline:
 * where Ivan is now, next stay, road-budget daily rate vs the poverty line,
 * and active-watch count. Taps through to the /camping detail screen.
 *
 * Renders nothing if the bridge has no MLOG data yet (e.g. older bridge build
 * without /v1/domains) — fail-soft, never blocks the Home screen.
 */
export function MlogCampingCard() {
  const router = useRouter();
  const { systems, loading, error } = useMlogDomain();

  // Fail-soft: if there's genuinely no data, don't render a broken card.
  if (!systems && (error || !loading)) return null;

  const planner = systems?.planner;
  const budget = systems?.road_budget;
  const dollars = (n?: number | null) =>
    typeof n === 'number' ? `$${n.toFixed(2)}` : '—';

  const underFpl = budget?.under_fpl === true;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push('/camping')}
    >
      <View style={styles.header}>
        <Ionicons name="bonfire-outline" size={20} color="#2a8f4a" />
        <Text style={styles.title}>Camping / MLOG</Text>
        <Ionicons name="chevron-forward" size={18} color="#bbb" style={styles.chev} />
      </View>

      {loading && !systems ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (
        <>
          {planner?.currently ? (
            <Text style={styles.line}>
              <Text style={styles.label}>Now: </Text>
              {planner.currently}
            </Text>
          ) : null}
          {planner?.next_stay ? (
            <Text style={styles.line}>
              <Text style={styles.label}>Next: </Text>
              {planner.next_stay}
              {planner.next_start ? ` (${planner.next_start})` : ''}
            </Text>
          ) : null}
          {typeof budget?.daily_living_usd === 'number' ? (
            <View style={styles.budgetRow}>
              <Text style={styles.line}>
                <Text style={styles.label}>Living: </Text>
                {dollars(budget.daily_living_usd)}/day
              </Text>
              <View style={[styles.pill, { backgroundColor: underFpl ? '#e0f0e0' : '#f7e6e0' }]}>
                <Text style={[styles.pillText, { color: underFpl ? '#1a6a2a' : '#9a3a1a' }]}>
                  {underFpl ? '✓ under poverty line' : '⚠ over line'}
                </Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', marginLeft: 8, color: '#1a1a1a' },
  chev: { marginLeft: 'auto' },
  line: { fontSize: 14, color: '#333', marginTop: 3 },
  label: { color: '#777', fontWeight: '600' },
  muted: { color: '#999', fontStyle: 'italic' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  pill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  pillText: { fontSize: 12, fontWeight: '600' },
});
