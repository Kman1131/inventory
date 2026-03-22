import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackRouteProp } from '@react-navigation/native-stack';
import { apiGet, apiPost } from '../config/api';
import type { InventoryItem, Transaction, TransactionType } from '../types';
import type { RootStackParamList } from '../../App';

type Route = NativeStackRouteProp<RootStackParamList, 'ItemDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  primary: '#1a237e',
  lowStock: '#c62828',
  okStock: '#2e7d32',
  bg: '#f5f5f5',
  card: '#ffffff',
  border: '#e0e0e0',
  text: '#212121',
  subtext: '#757575',
};

type TxType = TransactionType;

export function ItemDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { itemId } = route.params;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transaction form
  const [txType, setTxType] = useState<TxType>('IN');
  const [txQty, setTxQty] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemData, txData] = await Promise.all([
        apiGet<InventoryItem>(`/items/${itemId}`),
        apiGet<Transaction[]>(`/transactions/${itemId}`),
      ]);
      setItem(itemData);
      setTransactions(txData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId]);

  useEffect(() => {
    if (item) {
      navigation.setOptions({ title: item.name });
    }
  }, [item]);

  const handleSubmitTransaction = async () => {
    const qty = parseInt(txQty, 10);
    if (!txQty || isNaN(qty) || qty === 0) {
      Alert.alert('Invalid', 'Enter a non-zero quantity.');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/transactions', {
        item_id: itemId,
        type: txType,
        quantity_delta: txType === 'ADJUSTMENT' ? qty : Math.abs(qty),
        notes: txNotes || undefined,
        device_id: 'mobile-app',
      });
      setTxQty('');
      setTxNotes('');
      await loadData();
      Alert.alert('Recorded', `Transaction recorded successfully.`);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Item not found'}</Text>
        <TouchableOpacity style={styles.btn} onPress={loadData}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLow = item.quantity < item.min_threshold;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Item Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.sku}>SKU: {item.sku}</Text>
            </View>
            {item.qr_code_data && (
              <Image source={{ uri: item.qr_code_data }} style={styles.qr} />
            )}
          </View>

          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, isLow && styles.statValLow]}>{item.quantity}</Text>
              <Text style={styles.statLabel}>In Stock</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{item.min_threshold}</Text>
              <Text style={styles.statLabel}>Min Level</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>${item.price.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Unit Price</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, isLow ? styles.statusLow : styles.statusOk]}>
            <Text style={styles.statusText}>{isLow ? '⚠ LOW STOCK' : '✓ IN STOCK'}</Text>
          </View>

          {item.category_name && (
            <Text style={styles.meta}>Category: {item.category_name}</Text>
          )}
          {item.location_zone && (
            <Text style={styles.meta}>
              Location: {[item.location_zone, item.location_aisle, item.location_bin].filter(Boolean).join(' › ')}
            </Text>
          )}
        </View>

        {/* Record Transaction */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Record Transaction</Text>

          <View style={styles.typeRow}>
            {(['IN', 'OUT', 'ADJUSTMENT'] as TxType[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, txType === t && styles.typeBtnActive]}
                onPress={() => setTxType(t)}
              >
                <Text style={[styles.typeBtnText, txType === t && styles.typeBtnTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>
            {txType === 'ADJUSTMENT' ? 'Delta (+ or -)' : 'Quantity'}
          </Text>
          <TextInput
            style={styles.input}
            value={txQty}
            onChangeText={setTxQty}
            keyboardType="numeric"
            placeholder={txType === 'ADJUSTMENT' ? 'e.g. -5 or +10' : 'e.g. 10'}
          />

          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={txNotes}
            onChangeText={setTxNotes}
            placeholder="Reason for adjustment, PO number, etc."
            multiline
            numberOfLines={2}
          />

          <TouchableOpacity
            style={[styles.btn, submitting && styles.btnDisabled]}
            onPress={handleSubmitTransaction}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnText}>Record {txType}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 && (
            <Text style={styles.emptyText}>No transactions yet.</Text>
          )}
          {transactions.map(tx => (
            <View key={tx.id} style={styles.txRow}>
              <View style={[
                styles.txTypePill,
                tx.type === 'IN' ? styles.txIn : tx.type === 'OUT' ? styles.txOut : styles.txAdj,
              ]}>
                <Text style={styles.txTypeText}>{tx.type}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.txQty}>
                  {tx.quantity_delta > 0 ? '+' : ''}{tx.quantity_delta} units
                </Text>
                {tx.notes ? <Text style={styles.txNotes}>{tx.notes}</Text> : null}
                <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: COLORS.lowStock, marginBottom: 16,fontSize: 14 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  itemName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sku: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  qr: { width: 70, height: 70, borderRadius: 6 },
  description: { fontSize: 13, color: COLORS.subtext, marginBottom: 10 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  statValLow: { color: COLORS.lowStock },
  statLabel: { fontSize: 11, color: COLORS.subtext },
  statusBadge: {
    borderRadius: 8, padding: 8, alignItems: 'center', marginBottom: 10,
  },
  statusLow: { backgroundColor: '#ffebee' },
  statusOk: { backgroundColor: '#e8f5e9' },
  statusText: { fontWeight: '700', fontSize: 13 },
  meta: { fontSize: 12, color: COLORS.subtext, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  typeRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  typeBtnTextActive: { color: '#fff' },
  inputLabel: { fontSize: 12, color: COLORS.subtext, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    padding: 10, fontSize: 15, color: COLORS.text, marginBottom: 12,
  },
  inputMulti: { height: 60, textAlignVertical: 'top' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 10, padding: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  emptyText: { color: COLORS.subtext, fontSize: 13 },
  txRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  txTypePill: {
    width: 65, paddingVertical: 4, borderRadius: 6, alignItems: 'center',
  },
  txIn: { backgroundColor: '#e8f5e9' },
  txOut: { backgroundColor: '#ffebee' },
  txAdj: { backgroundColor: '#fff3e0' },
  txTypeText: { fontSize: 11, fontWeight: '700' },
  txQty: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txNotes: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  txDate: { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});
