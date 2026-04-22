import { bridgeClient } from '../../utils/bridge-client';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, TextInput } from 'react-native';

/**
 * Reports Screen — Digest Archive & Caregiver Reports
 *
 * Allows users to:
 * - View past digest emails (searchable, filterable by date)
 * - Access caregiver reports (health, mood, activity)
 * - Export reports as PDF or email
 * - View session history and work summaries
 *
 * Calls: GET /digests, GET /reports via FastAPI bridge
 */

interface Digest {
  id: string;
  sent_at: string;
  slot: string; // "0700", "1200", "1600", "2000"
  subject: string;
  body_preview: string;
}

interface Report {
  id: string;
  type: string; // "caregiver" | "health" | "weekly_summary"
  created_at: string;
  title: string;
  recipient: string;
}

export default function ReportsScreen() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, digest, report
  const [selectedDigest, setSelectedDigest] = useState<Digest | null>(null);

  const fetchData = async () => {
    try {
      const baseUrl = process.env.CLEO_BRIDGE_URL || 'http://127.0.0.1:8765';

      const [digestRes, reportRes] = await Promise.all([
        fetch(`${baseUrl}/digests`),
        Promise.resolve(await bridgeClient.getReports() as any),
      ]);

      if (digestRes.ok) {
        setDigests(await digestRes.json());
      }
      if (reportRes.ok) {
        setReports(await reportRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredDigests = digests.filter((digest) => {
    if (filterType !== 'all' && filterType !== 'digest') return false;
    if (!searchQuery) return true;
    return (
      digest.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      digest.body_preview.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredReports = reports.filter((report) => {
    if (filterType !== 'all' && filterType !== 'report') return false;
    if (!searchQuery) return true;
    return (
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleExport = async (type: 'pdf' | 'email', itemId: string, itemType: 'digest' | 'report') => {
    try {
      const baseUrl = process.env.CLEO_BRIDGE_URL || 'http://127.0.0.1:8765';
      const res = await fetch(`${baseUrl}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          item_type: itemType,
          export_type: type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (type === 'pdf') {
          // In a real app, this would download the PDF
          console.log('PDF export:', data.file_url);
        } else if (type === 'email') {
          // Email sent confirmation
          console.log('Email sent:', data.email);
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (selectedDigest) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{selectedDigest.subject}</Text>
          <View style={styles.buttonGroup}>
            <View style={[styles.button, styles.buttonSmall]}>
              <Text style={styles.buttonText} onPress={() => setSelectedDigest(null)}>
                ← Back
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Digest Details</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Sent</Text>
              <Text style={styles.value}>
                {new Date(selectedDigest.sent_at).toLocaleString()}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Slot</Text>
              <Text style={styles.value}>{selectedDigest.slot}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Full Content</Text>
          <View style={styles.card}>
            <Text style={styles.digestBody}>{selectedDigest.body_preview}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Actions</Text>
          <View style={styles.actionGrid}>
            <View style={[styles.actionButton, styles.actionButtonPrimary]}>
              <Text
                style={[styles.actionButtonText, styles.actionButtonTextPrimary]}
                onPress={() => handleExport('pdf', selectedDigest.id, 'digest')}
              >
                📥 Download PDF
              </Text>
            </View>
            <View style={[styles.actionButton, styles.actionButtonSecondary]}>
              <Text style={styles.actionButtonText} onPress={() => handleExport('email', selectedDigest.id, 'digest')}>
                📧 Email
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Archive</Text>
        <Text style={styles.subtitle}>Digests, reports, and exports</Text>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search digests, reports..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterTabs}>
        {['all', 'digest', 'report'].map((f) => (
          <View
            key={f}
            style={[
              styles.filterTab,
              filterType === f && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === f && styles.filterTabTextActive,
              ]}
              onPress={() => setFilterType(f)}
            >
              {f === 'all' ? 'All' : f === 'digest' ? 'Digests' : 'Reports'}
            </Text>
          </View>
        ))}
      </View>

      {/* Digest Archive */}
      {(filterType === 'all' || filterType === 'digest') && filteredDigests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📬 Digest Archive</Text>
          <View style={styles.card}>
            <Text style={styles.listTitle}>{filteredDigests.length} digests</Text>
            {filteredDigests.map((digest) => (
              <View key={digest.id} style={styles.item}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{digest.subject}</Text>
                  <Text style={styles.itemMeta}>
                    {new Date(digest.sent_at).toLocaleDateString()} at {digest.slot}
                  </Text>
                  <Text style={styles.itemPreview} numberOfLines={2}>
                    {digest.body_preview}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <Text
                    style={styles.itemAction}
                    onPress={() => setSelectedDigest(digest)}
                  >
                    →
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Reports Section */}
      {(filterType === 'all' || filterType === 'report') && filteredReports.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Reports</Text>
          <View style={styles.card}>
            <Text style={styles.listTitle}>{filteredReports.length} reports</Text>
            {filteredReports.map((report) => (
              <View key={report.id} style={styles.item}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{report.title}</Text>
                  <Text style={styles.itemMeta}>
                    {getReportTypeLabel(report.type)} •{' '}
                    {new Date(report.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.itemRecipient}>→ {report.recipient}</Text>
                </View>
                <View style={styles.itemActions}>
                  <Text
                    style={styles.itemActionLink}
                    onPress={() => handleExport('pdf', report.id, 'report')}
                  >
                    ⬇
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {filteredDigests.length === 0 && filteredReports.length === 0 && (
        <View style={styles.section}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filter</Text>
          </View>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Archive Settings</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Total Digests</Text>
            <Text style={styles.value}>{digests.length}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Earliest Digest</Text>
            <Text style={styles.value}>
              {digests.length > 0
                ? new Date(digests[digests.length - 1].sent_at).toLocaleDateString()
                : 'None'}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Export Format</Text>
            <Text style={styles.value}>PDF • Email</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function getReportTypeLabel(type: string): string {
  switch (type) {
    case 'caregiver': return '👴 Caregiver Report';
    case 'health': return '❤️ Health Report';
    case 'weekly_summary': return '📋 Weekly Summary';
    default: return type;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 12,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  buttonText: {
    fontSize: 12,
    color: '#333',
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  filterTabActive: {
    backgroundColor: '#0066cc',
  },
  filterTabText: {
    fontSize: 12,
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  itemPreview: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  itemRecipient: {
    fontSize: 12,
    color: '#0066cc',
  },
  itemActions: {
    marginLeft: 8,
  },
  itemAction: {
    fontSize: 18,
    color: '#0066cc',
  },
  itemActionLink: {
    fontSize: 16,
    color: '#999',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonPrimary: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  actionButtonSecondary: {
    backgroundColor: '#f0f7ff',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0066cc',
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },
  field: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  digestBody: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#ccc',
  },
});
