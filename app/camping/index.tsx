import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMlogDomain } from '../../hooks/useMlogDomain';

/**
 * MLOG (camping/production) life-domain detail screen. Route: /camping.
 * Reads CLEO bridge GET /v1/domains/mlog and renders the full domain view:
 * planner, road budget vs the poverty line, gear by purpose, shooting
 * coverage, and where the full HTML dashboards live.
 */
export default function CampingScreen() {
  const { domain, systems, loading, refetch } = useMlogDomain();

  const planner = systems?.planner;
  const budget = systems?.road_budget;
  const gear = systems?.gear;
  const shooting = systems?.shooting_schedule;
  const dashboards = systems?.dashboards;
  const dollars = (n?: number | null) =>
    typeof n === 'number' ? `$${n.toFixed(2)}` : '—';

  return (
    <>
      <Stack.Screen options={{ title: '🏕️ Camping / MLOG' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {!systems && loading ? (
          <ActivityIndicator size="large" color="#2a8f4a" style={{ marginTop: 40 }} />
        ) : !systems ? (
          <View style={styles.section}>
            <Text style={styles.muted}>
              No MLOG data from the bridge yet. If CLEO's bridge was just updated,
              it may need a restart to serve /v1/domains/mlog.
            </Text>
          </View>
        ) : (
          <>
            {/* Planner */}
            <Section icon="navigate-outline" title="Where you are">
              <Row label="Now" value={planner?.currently ?? '—'} />
              <Row
                label="Next"
                value={
                  planner?.next_stay
                    ? `${planner.next_stay}${planner.next_start ? `  ·  ${planner.next_start}` : ''}`
                    : '—'
                }
              />
              <Row label="Stays tracked" value={String(planner?.stays_total ?? '—')} />
            </Section>

            {/* Road budget */}
            <Section icon="cash-outline" title="Road budget — daily living vs the poverty line">
              <Row label="Daily living" value={`${dollars(budget?.daily_living_usd)}/day`} />
              <Row label="Federal poverty line" value={`${dollars(budget?.fpl_daily_usd)}/day`} />
              <View style={styles.verdictRow}>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: budget?.under_fpl ? '#e0f0e0' : '#f7e6e0' },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: budget?.under_fpl ? '#1a6a2a' : '#9a3a1a' },
                    ]}
                  >
                    {budget?.under_fpl ? '✓ under the poverty line' : '⚠ over the line'}
                  </Text>
                </View>
              </View>
              {budget?.complete === false ? (
                <Text style={styles.note}>
                  Incomplete — bank transactions (fuel/food) not yet folded in; this is lodging-only so far.
                </Text>
              ) : null}
            </Section>

            {/* Gear */}
            {gear ? (
              <Section icon="bag-outline" title="Gear">
                <Row label="Total" value={dollars(gear.total_usd)} />
                <Row label="Items" value={String(gear.item_count ?? '—')} />
                {gear.by_purpose
                  ? Object.entries(gear.by_purpose).map(([k, v]) => (
                      <Row key={k} label={`· ${k}`} value={dollars(v)} />
                    ))
                  : null}
              </Section>
            ) : null}

            {/* Shooting schedule */}
            {shooting ? (
              <Section icon="videocam-outline" title="Shooting coverage">
                <Row label="Days tracked" value={String(shooting.days ?? '—')} />
                {shooting.coverage
                  ? Object.entries(shooting.coverage).map(([k, v]) => (
                      <Row key={k} label={`· ${k}`} value={String(v)} />
                    ))
                  : null}
              </Section>
            ) : null}

            {/* Dashboards pointer */}
            {dashboards ? (
              <Section icon="grid-outline" title="Full dashboards">
                <Text style={styles.note}>
                  The rich HTML dashboards (hub, shooting schedule, road budget, gear) live in
                  ~/Dropbox/MLOG/docs/dashboards/. Open INDEX.html on the laptop or in the Dropbox app.
                </Text>
              </Section>
            ) : null}

            <Text style={styles.footer}>
              {domain?.source === 'live' ? 'Live' : 'Cached'} · observed {domain?.observed_at?.slice(0, 16) ?? '—'}
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

function Section({ icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color="#2a8f4a" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f8' },
  content: { padding: 12, paddingBottom: 40 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginLeft: 8, color: '#1a1a1a' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: '#666', fontSize: 14 },
  rowValue: { color: '#1a1a1a', fontSize: 14, fontWeight: '500', textAlign: 'right', flexShrink: 1, marginLeft: 12 },
  verdictRow: { flexDirection: 'row', marginTop: 8 },
  pill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 13, fontWeight: '700' },
  note: { color: '#888', fontSize: 12.5, marginTop: 8, lineHeight: 17 },
  muted: { color: '#999', fontStyle: 'italic', lineHeight: 19 },
  footer: { textAlign: 'center', color: '#aaa', fontSize: 11, marginTop: 4 },
});
