import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfig } from '../hooks/useConfig';
import { DEFAULT_PORT, getApiClient } from '../config/api';

const COLORS = {
  primary: '#1a237e',
  bg: '#f5f5f5',
  card: '#ffffff',
  border: '#e0e0e0',
  text: '#212121',
  subtext: '#757575',
  success: '#2e7d32',
  error: '#c62828',
};

export function SettingsScreen() {
  const { serverIp, serverPort, apiKey, isLoaded, setServerIp, setServerPort, setApiKey } = useConfig();
  const [ipInput, setIpInput] = useState('');
  const [portInput, setPortInput] = useState(DEFAULT_PORT);
  const [keyInput, setKeyInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  React.useEffect(() => {
    if (isLoaded) {
      setIpInput(serverIp);
      setPortInput(serverPort || DEFAULT_PORT);
      setKeyInput(apiKey);
    }
  }, [isLoaded, serverIp, serverPort, apiKey]);

  const normalizedPort = portInput.trim() || DEFAULT_PORT;

  const handleSave = async () => {
    await setServerIp(ipInput.trim());
    await setServerPort(normalizedPort);
    await setApiKey(keyInput.trim());
    Alert.alert('Saved', 'Server settings have been saved.');
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await setServerIp(ipInput.trim());
      await setServerPort(normalizedPort);
      await setApiKey(keyInput.trim());
      const client = await getApiClient();
      await client.get('/health');
      setTestResult('success');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Server Settings</Text>
        <Text style={styles.description}>
          Enter the local IP address of the PC running the inventory backend.{'\n'}
          If Docker maps the backend to a different host port, enter that port below.{'\n'}
          Find it by running{' '}
          <Text style={styles.code}>ipconfig</Text>
          {' '}on Windows or{' '}
          <Text style={styles.code}>ifconfig</Text>
          {' '}on Mac/Linux.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Server IP Address</Text>
          <TextInput
            style={styles.input}
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="e.g. 192.168.1.100"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Server Port</Text>
          <TextInput
            style={styles.input}
            value={portInput}
            onChangeText={setPortInput}
            placeholder={DEFAULT_PORT}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="Your API key"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />
        </View>

        {testResult && (
          <View style={[styles.resultBox, testResult === 'success' ? styles.resultOk : styles.resultErr]}>
            <Text style={styles.resultText}>
              {testResult === 'success'
                ? 'Connected successfully'
                : 'Could not connect. Check IP, port, and API key.'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleTest}
          disabled={testing}
        >
          {testing
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={styles.buttonSecondaryText}>Test Connection</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Current config</Text>
          <Text style={styles.infoRow}>IP: {serverIp || '(not set)'}</Text>
          <Text style={styles.infoRow}>Port: {serverPort || DEFAULT_PORT}</Text>
          <Text style={styles.infoRow}>API Key: {apiKey ? 'configured' : '(not set)'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  description: { fontSize: 13, color: COLORS.subtext, marginBottom: 20, lineHeight: 20 },
  code: { fontFamily: 'monospace', backgroundColor: '#e8eaf6', color: COLORS.primary },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.subtext, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 12, fontSize: 15, color: COLORS.text, backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: 15,
    alignItems: 'center', marginBottom: 12,
  },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  buttonSecondary: {
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: COLORS.primary,
  },
  buttonSecondaryText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  resultBox: { borderRadius: 8, padding: 12, marginBottom: 12 },
  resultOk: { backgroundColor: '#e8f5e9' },
  resultErr: { backgroundColor: '#ffebee' },
  resultText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  infoBox: {
    backgroundColor: '#e8eaf6', borderRadius: 10, padding: 14, marginTop: 8,
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  infoRow: { fontSize: 12, color: COLORS.text, marginBottom: 2 },
});