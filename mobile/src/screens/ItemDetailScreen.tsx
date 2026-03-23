import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiGet, apiPost, itemsApi, categoriesApi, locationsApi, suppliersApi, itemLocationsApi } from '../config/api';
import type { InventoryItem, Transaction, TransactionType, Category, Location, Supplier, ItemLocation } from '../types';
import type { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'ItemDetail'>;
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

// ── PickerModal helper (reused from CreateItemScreen pattern) ─────────────────
function PickerModal<T extends { id: string; name?: string }>({
  visible, title, items, labelKey, onSelect, onClose,
}: {
  visible: boolean; title: string; items: T[];
  labelKey?: keyof T;
  onSelect: (item: T | null) => void; onClose: () => void;
}) {
  const key = labelKey ?? ('name' as keyof T);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={editStyles.pickerOverlay}>
        <View style={editStyles.pickerSheet}>
          <Text style={editStyles.pickerTitle}>{title}</Text>
          <ScrollView>
            <TouchableOpacity style={editStyles.pickerItem} onPress={() => { onSelect(null); onClose(); }}>
              <Text style={editStyles.pickerItemNone}>None</Text>
            </TouchableOpacity>
            {items.map(it => (
              <TouchableOpacity key={it.id} style={editStyles.pickerItem} onPress={() => { onSelect(it); onClose(); }}>
                <Text style={editStyles.pickerItemText}>{String(it[key] ?? it.id)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit item modal ───────────────────────────────────────────────────────────
function EditItemModal({
  visible, item, onSaved, onClose,
}: {
  visible: boolean; item: InventoryItem;
  onSaved: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [sku, setSku] = useState(item.sku);
  const [description, setDescription] = useState(item.description ?? '');
  const [price, setPrice] = useState(String(item.price));
  const [minThreshold, setMinThreshold] = useState(String(item.min_threshold));
  const [categoryId, setCategoryId] = useState<string | null>(item.category_id ?? null);
  const [locationId, setLocationId] = useState<string | null>(item.location_id ?? null);
  const [supplierId, setSupplierId] = useState<string | null>((item as any).supplier_id ?? null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showCat, setShowCat] = useState(false);
  const [showLoc, setShowLoc] = useState(false);
  const [showSup, setShowSup] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(item.name); setSku(item.sku);
      setDescription(item.description ?? '');
      setPrice(String(item.price));
      setMinThreshold(String(item.min_threshold));
      setCategoryId(item.category_id ?? null);
      setLocationId(item.location_id ?? null);
      setSupplierId((item as any).supplier_id ?? null);
      Promise.all([categoriesApi.list(), locationsApi.list(), suppliersApi.list()]).then(
        ([c, l, s]) => { setCategories(c); setLocations(l); setSuppliers(s); },
      );
    }
  }, [visible, item]);

  const catLabel = (categoryId && categories.find(c => c.id === categoryId)?.name) || 'None';
  const locLabel = (() => {
    const loc = locationId ? locations.find(l => l.id === locationId) : null;
    if (!loc) return 'None';
    return [loc.zone, loc.aisle, loc.bin].filter(Boolean).join(' › ');
  })();
  const supLabel = (supplierId && suppliers.find(s => s.id === supplierId)?.name) || 'None';

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Name is required.'); return; }
    if (!sku.trim()) { Alert.alert('Validation', 'SKU is required.'); return; }
    setSaving(true);
    try {
      await itemsApi.update(item.id, {
        name: name.trim(), sku: sku.trim().toUpperCase(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        min_threshold: parseInt(minThreshold, 10) || 0,
        category_id: categoryId ?? null,
        location_id: locationId ?? null,
        supplier_id: supplierId ?? null,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={editStyles.overlay}>
        <View style={editStyles.sheet}>
          <Text style={editStyles.title}>Edit Item</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'Name *', value: name, set: setName, placeholder: 'Widget A' },
              { label: 'SKU *', value: sku, set: setSku, placeholder: 'WGT-001' },
              { label: 'Description', value: description, set: setDescription, placeholder: 'Optional…', multi: true },
              { label: 'Unit Price ($)', value: price, set: setPrice, placeholder: '0.00', keyboard: 'decimal-pad' },
              { label: 'Min Threshold', value: minThreshold, set: setMinThreshold, placeholder: '5', keyboard: 'numeric' },
            ].map(f => (
              <View key={f.label}>
                <Text style={editStyles.label}>{f.label}</Text>
                <TextInput
                  style={[editStyles.input, f.multi && editStyles.multiline]}
                  value={f.value} onChangeText={f.set}
                  placeholder={f.placeholder} placeholderTextColor="#aaa"
                  keyboardType={(f as any).keyboard ?? 'default'}
                  multiline={f.multi}
                />
              </View>
            ))}

            {[ 
              { label: 'Category', lv: catLabel, onPress: () => setShowCat(true) },
              { label: 'Location', lv: locLabel, onPress: () => setShowLoc(true) },
              { label: 'Supplier', lv: supLabel, onPress: () => setShowSup(true) },
            ].map(p => (
              <View key={p.label}>
                <Text style={editStyles.label}>{p.label}</Text>
                <TouchableOpacity style={editStyles.pickerBtn} onPress={p.onPress}>
                  <Text style={editStyles.pickerBtnText}>{p.lv}</Text>
                  <Text style={editStyles.pickerChevron}>›</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={editStyles.btnRow}>
            <TouchableOpacity style={editStyles.btnCancel} onPress={onClose}>
              <Text style={editStyles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={editStyles.btnSave} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={editStyles.btnSaveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <PickerModal
        visible={showCat} title="Category"
        items={categories} labelKey="name"
        onSelect={c => setCategoryId(c?.id ?? null)} onClose={() => setShowCat(false)}
      />
      <PickerModal
        visible={showLoc} title="Location"
        items={locations.map(l => ({ ...l, name: [l.zone, l.aisle, l.bin].filter(Boolean).join(' › ') }))}
        labelKey="name"
        onSelect={l => setLocationId(l?.id ?? null)} onClose={() => setShowLoc(false)}
      />
      <PickerModal
        visible={showSup} title="Supplier"
        items={suppliers} labelKey="name"
        onSelect={s => setSupplierId(s?.id ?? null)} onClose={() => setShowSup(false)}
      />
    </Modal>
  );
}

export function ItemDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { itemId } = route.params;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transaction form
  const [txType, setTxType] = useState<TxType>('IN');
  const [txQty, setTxQty] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemData, txData, locsData] = await Promise.all([
        apiGet<InventoryItem>(`/items/${itemId}`),
        apiGet<Transaction[]>(`/transactions/${itemId}`),
        itemLocationsApi.list(itemId),
      ]);
      setItem(itemData);
      setTransactions(txData);
      setItemLocations(locsData);
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
      navigation.setOptions({
        title: item.name,
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 12, marginRight: 4 }}>
            <TouchableOpacity onPress={() => setShowEdit(true)}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Text style={{ color: '#ff8a80', fontSize: 14, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [item]);

  const handleDelete = () => {
    if (!item) return;
    Alert.alert('Delete Item', `Remove "${item.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await itemsApi.remove(item.id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed to delete.');
          }
        },
      },
    ]);
  };

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
    <>
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

          {/* All locations breakdown */}
          {itemLocations.length > 0 && (
            <View style={styles.locationsSection}>
              <Text style={styles.locationsSectionTitle}>Stock by Location</Text>
              {itemLocations.map(il => (
                <View key={il.id} style={styles.locationRow}>
                  <Text style={styles.locationName}>
                    📍 {[il.zone, il.aisle, il.bin].filter(Boolean).join(' › ')}
                  </Text>
                  <Text style={styles.locationQty}>{il.quantity} units</Text>
                </View>
              ))}
            </View>
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

    {item && showEdit && (
      <EditItemModal
        visible={showEdit}
        item={item}
        onSaved={loadData}
        onClose={() => setShowEdit(false)}
      />
    )}
    </>
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
  locationsSection: {
    marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12,
  },
  locationsSectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.subtext, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  locationName: { fontSize: 12, color: COLORS.text, flex: 1 },
  locationQty: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
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

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, maxHeight: '90%',
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.primary, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#fafafa', color: '#222',
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  pickerBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa',
  },
  pickerBtnText: { fontSize: 15, color: '#222' },
  pickerChevron: { fontSize: 18, color: '#999' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  btnCancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  btnSave: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  // PickerModal styles
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.40)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, maxHeight: '60%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 12, textAlign: 'center' },
  pickerItem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemText: { fontSize: 15, color: '#222' },
  pickerItemNone: { fontSize: 15, color: '#999', fontStyle: 'italic' },
});
