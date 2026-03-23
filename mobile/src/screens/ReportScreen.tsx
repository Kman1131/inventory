import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PORT, STORAGE_KEYS, getApiBaseUrl } from '../config/api';

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

type ReportStatus = 'idle' | 'loading' | 'success' | 'error';

export function ReportScreen() {
  const [status, setStatus] = useState<ReportStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerateReport = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const [[, ip], [, apiKey]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.SERVER_IP,
        STORAGE_KEYS.API_KEY,
      ]);

      if (!ip || !apiKey) {
        throw new Error('Server IP and API key must be configured in Settings.');
      }

      // Use downloadAsync to avoid needing a Buffer polyfill.
      // API key is passed as query param since downloadAsync doesn't support headers.
      const baseUrl = await getApiBaseUrl();
      const downloadUrl = `${baseUrl}/reports/stock?apikey=${encodeURIComponent(apiKey)}`;
      const fileUri = `${FileSystem.cacheDirectory}stock-report-${Date.now()}.pdf`;

      const result = await FileSystem.downloadAsync(downloadUrl, fileUri);

      if (result.status !== 200) {
        throw new Error(`Server returned status ${result.status}`);
      }

      setStatus('success');

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Print or Share Stock Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Report Ready', 'PDF downloaded. Sharing is not available on this device.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Stock Report</Text>
        <Text style={styles.description}>
          Generate a PDF stock report from the server. The report includes all inventory items,
          highlights low-stock items, and shows total inventory value. You can print it directly
          to a Wi-Fi printer via the system share sheet.
        </Text>

        {/* Report Preview Card */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewHeaderText}>INVENTORY STOCK REPORT</Text>
          </View>
          <View style={styles.previewBody}>
            <View style={styles.previewRow}>
              <Text style={styles.previewCol}>SKU</Text>
              <Text style={styles.previewColWide}>Item Name</Text>
              <Text style={styles.previewCol}>Qty</Text>
              <Text style={styles.previewCol}>Status</Text>
            </View>
            <View style={[styles.previewRow, styles.previewRowLow]}>
              <Text style={styles.previewCol}>SKU-001</Text>
              <Text style={styles.previewColWide}>Sample Item A</Text>
              <Text style={[styles.previewCol, { color: COLORS.error }]}>2</Text>
              <Text style={[styles.previewCol, { color: COLORS.error, fontWeight: '700' }]}>LOW</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewCol}>SKU-002</Text>
              <Text style={styles.previewColWide}>Sample Item B</Text>
              <Text style={styles.previewCol}>14</Text>
              <Text style={[styles.previewCol, { color: COLORS.success }]}>OK</Text>
            </View>
            <Text style={styles.previewNote}>• Low-stock rows highlighted in red</Text>
            <Text style={styles.previewNote}>• Total value calculated on last page</Text>
          </View>
        </View>

        {/* Status */}
        {status === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Error: {errorMsg}</Text>
            <Text style={styles.errorHint}>Check your server connection in Settings.</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ Report generated and ready to print</Text>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.btn, status === 'loading' && styles.btnDisabled]}
          onPress={handleGenerateReport}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <View style={styles.btnRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.btnText, { marginLeft: 10 }]}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>
              {status === 'success' ? 'Generate Again' : 'Generate & Print Report'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoItem}>1. Tap the button above</Text>
          <Text style={styles.infoItem}>2. The server generates a PDF from the latest stock data</Text>
          <Text style={styles.infoItem}>3. Your phone's share sheet opens</Text>
          <Text style={styles.infoItem}>4. Select your Wi-Fi printer (AirPrint / Google Cloud Print)</Text>
          <Text style={styles.infoItem}>5. Default backend port is {DEFAULT_PORT} unless you changed it in Settings</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  description: { fontSize: 13, color: COLORS.subtext, lineHeight: 20, marginBottom: 20 },
  previewCard: {
    backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  previewHeader: {
    backgroundColor: COLORS.primary, padding: 10, alignItems: 'center',
  },
  previewHeaderText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  previewBody: { padding: 12 },
  previewRow: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  previewRowLow: { backgroundColor: '#fff5f5' },
  previewCol: { width: 60, fontSize: 11, color: COLORS.text },
  previewColWide: { flex: 1, fontSize: 11, color: COLORS.text },
  previewNote: { fontSize: 10, color: COLORS.subtext, marginTop: 6 },
  errorBox: {
    backgroundColor: '#ffebee', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
  errorHint: { color: COLORS.error, fontSize: 12, marginTop: 4 },
  successBox: {
    backgroundColor: '#e8f5e9', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  successText: { color: COLORS.success, fontWeight: '600', fontSize: 13 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: 16, alignItems: 'center',
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.7 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  infoBox: { backgroundColor: '#e8eaf6', borderRadius: 10, padding: 14 },
  infoTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  infoItem: { fontSize: 12, color: COLORS.text, marginBottom: 4, lineHeight: 18 },
});
