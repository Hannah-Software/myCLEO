import { bridgeClient } from '../../utils/bridge-client';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, ActivityIndicator } from 'react-native';

/**
 * Settings Screen — Configuration & Preferences
 *
 * Allows users to:
 * - View and edit their CLEO config
 * - Manage email accounts
 * - Set digest timeslots
 * - Configure integrations (Linear, Asana)
 * - Update family/household info
 *
 * Calls: GET /config, PUT /config via FastAPI bridge
 */

interface Config {
  user: {
    name: string;
    primary_email: string;
    timezone: string;
  };
  email_accounts: Array<{
    name: string;
    address: string;
    is_primary: boolean;
  }>;
  digest: {
    recipient: string;
    timeslots: string[];
    send_via: string;
  };
  linear?: {
    team_id: string;
    project_name: string;
  };
  asana?: {
    project_name: string;
  };
}

export default function SettingsScreen() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [changes, setChanges] = useState<Partial<Config>>({});

  const fetchConfig = async () => {
    try {
      const baseUrl = process.env.CLEO_BRIDGE_URL || 'http://127.0.0.1:8765';
      const res = await Promise.resolve(await bridgeClient.getConfig() as any);
      if (res.ok) {
        setConfig(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const baseUrl = process.env.CLEO_BRIDGE_URL || 'http://127.0.0.1:8765';
      const res = await fetch(`${baseUrl}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, ...changes }),
      });

      if (res.ok) {
        setEditMode(false);
        setChanges({});
        // Refresh config
        fetchConfig();
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (!config) {
    return (
      <View style={styles.container}>
        <Text>Failed to load configuration</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        {editMode ? (
          <View style={styles.buttonGroup}>
            <View style={styles.button}>
              <Text style={styles.buttonText} onPress={() => setEditMode(false)}>
                Cancel
              </Text>
            </View>
            <View style={[styles.button, styles.buttonPrimary]}>
              <Text
                style={[styles.buttonText, styles.buttonTextPrimary]}
                onPress={handleSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.button, styles.buttonSmall]}>
            <Text style={styles.buttonText} onPress={() => setEditMode(true)}>
              ✏️ Edit
            </Text>
          </View>
        )}
      </View>

      {/* User Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Profile</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={changes.user?.name || config.user.name}
                onChangeText={(text) =>
                  setChanges({
                    ...changes,
                    user: { ...changes.user, ...config.user, name: text },
                  })
                }
              />
            ) : (
              <Text style={styles.value}>{config.user.name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Primary Email</Text>
            <Text style={styles.value}>{config.user.primary_email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Timezone</Text>
            {editMode ? (
              <TextInput
                style={styles.input}
                value={changes.user?.timezone || config.user.timezone}
                onChangeText={(text) =>
                  setChanges({
                    ...changes,
                    user: { ...changes.user, ...config.user, timezone: text },
                  })
                }
              />
            ) : (
              <Text style={styles.value}>{config.user.timezone}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Email Accounts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📧 Email Accounts</Text>
        <View style={styles.card}>
          {config.email_accounts.map((account) => (
            <View key={account.name} style={styles.field}>
              <Text style={styles.label}>
                {account.name}
                {account.is_primary ? ' (Primary)' : ''}
              </Text>
              <Text style={styles.value}>{account.address}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Digest Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📬 Digest Settings</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Send To</Text>
            <Text style={styles.value}>{config.digest.recipient}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Timeslots</Text>
            <Text style={styles.value}>{config.digest.timeslots.join(', ')}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Send Via</Text>
            <Text style={styles.value}>{config.digest.send_via}</Text>
          </View>
        </View>
      </View>

      {/* Integrations */}
      {(config.linear || config.asana) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Integrations</Text>
          <View style={styles.card}>
            {config.linear && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Linear Team</Text>
                  <Text style={styles.value}>{config.linear.team_id}</Text>
                </View>
              </>
            )}
            {config.asana && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Asana Project</Text>
                  <Text style={styles.value}>{config.asana.project_name}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>App Version</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Daemon Connected</Text>
            <Text style={styles.value}>✅ Yes</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
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
    marginBottom: 12,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
  buttonPrimary: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  buttonText: {
    fontSize: 12,
    color: '#333',
  },
  buttonTextPrimary: {
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
  input: {
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
});
