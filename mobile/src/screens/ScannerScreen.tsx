import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { apiGet } from '../config/api';
import type { InventoryItem } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  primary: '#1a237e',
  overlay: 'rgba(0,0,0,0.6)',
  accent: '#42a5f5',
};

const ALL_BARCODE_TYPES = [
  'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
  'code39', 'code128', 'codabar', 'itf14',
  'pdf417', 'aztec', 'datamatrix',
] as const;

export function ScannerScreen() {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    if (isFocused) {
      setScanned(false);
      setLooking(false);
    }
  }, [isFocused]);

  if (!permission) {
    return <View style={styles.centered}><Text>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permText}>
          This app needs camera access to scan QR codes and barcodes on inventory items.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || looking) return;
    setScanned(true);

    // Try to parse as JSON (QR code from our system)
    try {
      const parsed = JSON.parse(data) as { id?: string; sku?: string; action?: string; location_id?: string };
      if (parsed.id) {
        navigation.navigate('ItemDetail', {
          itemId: parsed.id,
          ...(parsed.location_id ? { locationId: parsed.location_id } : {}),
        });
        return;
      }
    } catch {
      // Not JSON — treat as barcode / SKU
    }

    // Look up by SKU
    setLooking(true);
    try {
      const items = await apiGet<InventoryItem[]>('/items');
      const match = items.find(
        i => i.sku.toLowerCase() === data.toLowerCase()
      );

      if (match) {
        navigation.navigate('ItemDetail', { itemId: match.id });
      } else {
        Alert.alert(
          'No Item Found',
          `No inventory item found for barcode:\n${data}`,
          [
            {
              text: 'Create Item',
              onPress: () => navigation.navigate('CreateItem', { sku: data }),
            },
            { text: 'Scan Again', onPress: () => { setScanned(false); setLooking(false); } },
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        'Lookup Failed',
        'Could not check the barcode against the server.',
        [{ text: 'Scan Again', onPress: () => { setScanned(false); setLooking(false); } }]
      );
    } finally {
      setLooking(false);
    }
  };

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ALL_BARCODE_TYPES as any }}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          {looking ? (
            <ActivityIndicator color="#ffffff" size="small" style={{ marginBottom: 8 }} />
          ) : null}
          <Text style={styles.hint}>
            {looking
              ? 'Looking up item…'
              : scanned
              ? 'Opening item…'
              : 'Scan a QR code or barcode'}
          </Text>
          {scanned && !looking && (
            <TouchableOpacity style={styles.btn} onPress={() => { setScanned(false); setLooking(false); }}>
              <Text style={styles.btnText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const FRAME = 240;
const CORNER = 24;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#f5f5f5' },
  permTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  permText: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24 },
  btn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10, marginTop: 12,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  overlay: { flex: 1 },
  topOverlay: { flex: 1, backgroundColor: COLORS.overlay },
  middleRow: { height: FRAME, flexDirection: 'row' },
  sideOverlay: { flex: 1, backgroundColor: COLORS.overlay },
  scanFrame: { width: FRAME, height: FRAME },
  bottomOverlay: {
    flex: 1, backgroundColor: COLORS.overlay,
    alignItems: 'center', paddingTop: 24,
  },
  hint: { color: '#ffffff', fontSize: 14, marginBottom: 16 },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: COLORS.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },
});
