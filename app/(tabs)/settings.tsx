import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { bridgeClient, BRIDGE_URL, getBridgeApiKey, ProbeResult } from '@/utils/bridge-client';
import { setStoredApiKey, clearStoredApiKey } from '@/utils/bridge-auth';

interface Config {
  user?: { name?: string; timezone?: string };
  email_accounts?: Array<{ email: string; account_type: string }>;
  digest?: { frequency?: string; recipient?: string };
}

function maskKey(key: string | null): string {
  if (!key) return 'Not set';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export default function SettingsScreen() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [keySaving, setKeySaving] = useState(false);
  const [currentKey, setCurrentKey] = useState<string | null>(getBridgeApiKey());
  const [tailscaleResult, setTailscaleResult] = useState<ProbeResult | null>(null);
  const [tailscaleRunning, setTailscaleRunning] = useState(false);
  const [daemonResult, setDaemonResult] = useState<ProbeResult | null>(null);
  const [daemonRunning, setDaemonRunning] = useState(false);

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

  const onSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      Alert.alert('Bridge API key', 'Enter a non-empty key.');
      return;
    }
    setKeySaving(true);
    try {
      await setStoredApiKey(trimmed);
      setCurrentKey(trimmed);
      setKeyInput('');
      Alert.alert('Bridge API key', 'Saved. New key is in use immediately.');
    } catch (err) {
      Alert.alert(
        'Bridge API key',
        err instanceof Error ? err.message : 'Save failed'
      );
    } finally {
      setKeySaving(false);
    }
  };

  const onTestTailscale = async () => {
    setTailscaleRunning(true);
    setTailscaleResult(null);
    const result = await bridgeClient.tailscaleProbe();
    setTailscaleResult(result);
    setTailscaleRunning(false);
  };

  const onTestDaemon = async () => {
    setDaemonRunning(true);
    setDaemonResult(null);
    const result = await bridgeClient.daemonProbe();
    setDaemonResult(result);
    setDaemonRunning(false);
  };

  const onClearKey = async () => {
    Alert.alert(
      'Clear bridge API key?',
      'CLEO will run unauthenticated until you set a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearStoredApiKey();
            setCurrentKey(null);
          },
        },
      ]
    );
  };

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
        <Text style={styles.sectionTitle}>Bridge Connection</Text>
        <View style={styles.row}>
          <Text style={styles.label}>URL</Text>
          <Text style={[styles.value, styles.email]}>{BRIDGE_URL}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>API key</Text>
          <Text style={styles.value}>
            {keyRevealed ? currentKey || 'Not set' : maskKey(currentKey)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setKeyRevealed((v) => !v)}>
          <Text style={styles.linkText}>
            {keyRevealed ? 'Hide' : 'Reveal'} key
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 12 }]}>Set new API key</Text>
        <TextInput
          style={styles.keyInput}
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="paste 64-char hex from Doppler"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!keyRevealed}
          editable={!keySaving}
        />
        <View style={styles.keyButtonRow}>
          <TouchableOpacity
            style={[
              styles.keyButton,
              styles.keyButtonPrimary,
              (!keyInput.trim() || keySaving) && styles.keyButtonDisabled,
            ]}
            onPress={onSaveKey}
            disabled={!keyInput.trim() || keySaving}
          >
            {keySaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.keyButtonText}>Save</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.keyButton, styles.keyButtonDanger]}
            onPress={onClearKey}
            disabled={!currentKey}
          >
            <Text style={styles.keyButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          Generate with: openssl rand -hex 32. Set on the bridge with:
          doppler secrets set CLEO_BRIDGE_API_KEY=&lt;key&gt; -p CLEO -c dev,
          then paste the same value here.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Tests</Text>

        <TouchableOpacity
          style={[styles.probeButton, tailscaleRunning && styles.keyButtonDisabled]}
          onPress={onTestTailscale}
          disabled={tailscaleRunning}
        >
          {tailscaleRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.keyButtonText}>Test Tailscale reachability</Text>
          )}
        </TouchableOpacity>
        {tailscaleResult && <ProbeResultLine label="Tailscale" result={tailscaleResult} />}

        <TouchableOpacity
          style={[
            styles.probeButton,
            { marginTop: 10 },
            daemonRunning && styles.keyButtonDisabled,
          ]}
          onPress={onTestDaemon}
          disabled={daemonRunning}
        >
          {daemonRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.keyButtonText}>Test daemon health</Text>
          )}
        </TouchableOpacity>
        {daemonResult && <ProbeResultLine label="Daemon" result={daemonResult} />}

        <Text style={[styles.footnote, { marginTop: 10 }]}>
          Tailscale probe hits /health-check (unauthenticated) — confirms the
          tunnel is up. Daemon probe hits /state with the saved API key —
          differentiates "key wrong" (401) from "daemon down" (timeout).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.footnote}>
          Other settings are configured on the server. To make changes, use the
          CLEO daemon or contact your administrator.
        </Text>
      </View>
    </ScrollView>
  );
}

function ProbeResultLine({ label, result }: { label: string; result: ProbeResult }) {
  const ok = result.ok;
  const tone = ok ? '#1B5E20' : '#B71C1C';
  let summary: string;
  if (ok) {
    summary = `${result.status ?? 200} OK · ${result.latencyMs}ms`;
  } else if (result.status) {
    summary = `${result.status} · ${result.latencyMs}ms`;
  } else if (result.error) {
    summary = `${result.error} · ${result.latencyMs}ms`;
  } else {
    summary = `failed · ${result.latencyMs}ms`;
  }
  return (
    <Text style={[styles.probeResult, { color: tone }]}>
      {label}: {summary}
    </Text>
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
  linkText: {
    color: '#007AFF',
    fontSize: 13,
    paddingVertical: 8,
  },
  keyInput: {
    marginTop: 6,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 13,
    color: '#222',
  },
  keyButtonRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  keyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonPrimary: { backgroundColor: '#007AFF' },
  keyButtonDanger: { backgroundColor: '#C0392B' },
  keyButtonDisabled: { backgroundColor: '#B0B0B0' },
  keyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  probeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  probeResult: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
});
