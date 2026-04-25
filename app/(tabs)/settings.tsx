import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { bridgeClient } from '@/utils/bridge-client';

interface Config {
  user?: { name?: string; timezone?: string };
  email_accounts?: Array<{ email: string; account_type: string }>;
  digest?: { frequency?: string; recipient?: string };
}

export default function SettingsScreen() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await bridgeClient.getConfig();
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Profile</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{config?.user?.name || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Timezone</Text>
          <Text style={styles.value}>{config?.user?.timezone || 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Accounts</Text>
        {config?.email_accounts && config.email_accounts.length > 0 ? (
          config.email_accounts.map((account, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.label}>{account.account_type || 'Account'}</Text>
              <Text style={[styles.value, styles.email]}>{account.email}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.value}>No email accounts configured</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Digest Settings</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Frequency</Text>
          <Text style={styles.value}>{config?.digest?.frequency || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Recipient</Text>
          <Text style={[styles.value, styles.email]}>{config?.digest?.recipient || 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.footnote}>Settings are configured on the server. To make changes, use the CLEO daemon or contact your administrator.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  email: {
    color: '#0066cc',
    fontSize: 12,
  },
  error: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
  footnote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
