import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersApi, suppliersApi, itemsApi } from '../config/api';
import type { PurchaseOrder, Supplier, InventoryItem } from '../types';
import { FAB } from '../components/FAB';

const COLORS = {
  primary: '#1a237e', accent: '#3949ab', danger: '#d32f2f',
  border: '#e0e0e0', success: '#2e7d32', warning: '#e65100',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:      { bg: '#e3f2fd', text: '#1565c0' },
  sent:       { bg: '#fff8e1', text: '#f57f17' },
  received:   { bg: '#e8f5e9', text: '#2e7d32' },
  cancelled:  { bg: '#fce4ec', text: '#c62828' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Create PO modal ───────────────────────────────────────────────────────────
function CreatePOModal({
  visible, suppliers, items: allItems, onSave, onClose,
}: {
  visible: boolean;
  suppliers: Supplier[];
  items: InventoryItem[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<{ sku: string; name: string; quantity_ordered: number; unit_price: number; item_id?: string }[]>([
    { sku: '', name: '', quantity_ordered: 1, unit_price: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [showSupPicker, setShowSupPicker] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState<number | null>(null);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const updateItem = (idx: number, field: string, value: any) => {
    setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const pickInventoryItem = (idx: number, invItem: InventoryItem) => {
    setPoItems(prev => prev.map((it, i) => i === idx ? {
      ...it, sku: invItem.sku, name: invItem.name, unit_price: invItem.price, item_id: invItem.id,
    } : it));
    setShowItemPicker(null);
  };

  const handleSave = async () => {
    const validItems = poItems.filter(i => i.sku.trim() && i.name.trim() && i.quantity_ordered > 0);
    if (validItems.length === 0) {
      Alert.alert('Validation', 'Add at least one item with SKU, name and quantity > 0.');
      return;
    }
    setSaving(true);
    try {
      await purchaseOrdersApi.create({ supplier_id: supplierId, notes: notes.trim() || undefined, items: validItems });
      onSave();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create PO.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>New Purchase Order</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Supplier */}
            <Text style={modal.label}>Supplier</Text>
            <TouchableOpacity style={modal.picker} onPress={() => setShowSupPicker(true)}>
              <Text style={[modal.pickerText, !selectedSupplier && modal.placeholder]}>
                {selectedSupplier ? selectedSupplier.name : 'Select supplier (optional)…'}
              </Text>
              <Text style={modal.chevron}>▼</Text>
            </TouchableOpacity>

            {/* Notes */}
            <Text style={modal.label}>Notes</Text>
            <TextInput
              style={modal.input} value={notes} onChangeText={setNotes}
              placeholder="Payment terms, delivery notes…" placeholderTextColor="#aaa" multiline
            />

            {/* PO Items */}
            <Text style={[modal.label, { marginTop: 16 }]}>Items *</Text>
            {poItems.map((it, idx) => (
              <View key={idx} style={modal.poItemCard}>
                <TouchableOpacity
                  style={[modal.picker, { marginBottom: 6 }]}
                  onPress={() => setShowItemPicker(idx)}
                >
                  <Text style={[modal.pickerText, !it.name && modal.placeholder]}>
                    {it.name || '— Pick from inventory or enter manually —'}
                  </Text>
                  <Text style={modal.chevron}>▼</Text>
                </TouchableOpacity>
                <View style={modal.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={modal.smallLabel}>SKU</Text>
                    <TextInput
                      style={modal.input} value={it.sku}
                      onChangeText={v => updateItem(idx, 'sku', v.toUpperCase())}
                      placeholder="SKU" placeholderTextColor="#aaa" autoCapitalize="characters"
                    />
                  </View>
                  <View style={{ width: 80 }}>
                    <Text style={modal.smallLabel}>Qty</Text>
                    <TextInput
                      style={modal.input} value={String(it.quantity_ordered)}
                      onChangeText={v => updateItem(idx, 'quantity_ordered', parseInt(v) || 1)}
                      keyboardType="numeric" placeholderTextColor="#aaa"
                    />
                  </View>
                  <View style={{ width: 90 }}>
                    <Text style={modal.smallLabel}>Unit $</Text>
                    <TextInput
                      style={modal.input} value={String(it.unit_price)}
                      onChangeText={v => updateItem(idx, 'unit_price', parseFloat(v) || 0)}
                      keyboardType="decimal-pad" placeholderTextColor="#aaa"
                    />
                  </View>
                </View>
                {poItems.length > 1 && (
                  <TouchableOpacity onPress={() => setPoItems(prev => prev.filter((_, i) => i !== idx))}>
                    <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>Remove line</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={modal.addLineBtn}
              onPress={() => setPoItems(prev => [...prev, { sku: '', name: '', quantity_ordered: 1, unit_price: 0 }])}
            >
              <Text style={modal.addLineTxt}>+ Add Line</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.btnCancel} onPress={onClose}>
              <Text style={modal.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.btnSave} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.btnSaveText}>Create PO</Text>}
            </TouchableOpacity>
          </View>

          {/* Supplier picker */}
          <Modal visible={showSupPicker} animationType="fade" transparent onRequestClose={() => setShowSupPicker(false)}>
            <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setShowSupPicker(false)}>
              <View style={[modal.sheet, { maxHeight: '50%' }]}>
                <Text style={modal.title}>Select Supplier</Text>
                <ScrollView>
                  <TouchableOpacity style={modal.listRow} onPress={() => { setSupplierId(null); setShowSupPicker(false); }}>
                    <Text style={modal.rowNone}>— None —</Text>
                  </TouchableOpacity>
                  {suppliers.map(s => (
                    <TouchableOpacity key={s.id} style={modal.listRow} onPress={() => { setSupplierId(s.id); setShowSupPicker(false); }}>
                      <Text style={modal.rowText}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Inventory item picker */}
          <Modal visible={showItemPicker !== null} animationType="fade" transparent onRequestClose={() => setShowItemPicker(null)}>
            <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setShowItemPicker(null)}>
              <View style={[modal.sheet, { maxHeight: '60%' }]}>
                <Text style={modal.title}>Pick from Inventory</Text>
                <FlatList
                  data={allItems} keyExtractor={i => i.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={modal.listRow} onPress={() => showItemPicker !== null && pickInventoryItem(showItemPicker, item)}>
                      <Text style={modal.rowText}>{item.name}</Text>
                      <Text style={modal.rowSub}>SKU: {item.sku}  ·  ${item.price}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function PurchaseOrdersScreen() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [posData, supData, itemData] = await Promise.all([
        purchaseOrdersApi.list(), suppliersApi.list(), itemsApi.list(),
      ]);
      setPos(posData); setSuppliers(supData); setItems(itemData);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUpdateStatus = (po: PurchaseOrder) => {
    const statuses: PurchaseOrder['status'][] = ['draft', 'sent', 'received', 'cancelled'];
    Alert.alert('Update Status', `PO ${po.po_number}`, statuses.map(s => ({
      text: s.charAt(0).toUpperCase() + s.slice(1),
      style: s === 'cancelled' ? 'destructive' : 'default',
      onPress: async () => {
        try {
          await purchaseOrdersApi.update(po.id, { status: s });
          await load();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      },
    })));
  };

  const handleDelete = (po: PurchaseOrder) => {
    Alert.alert('Delete PO', `Remove ${po.po_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await purchaseOrdersApi.remove(po.id);
            setPos(prev => prev.filter(p => p.id !== po.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleAutoGenerate = async () => {
    Alert.alert('Auto-Generate POs', 'Create purchase orders for all items below minimum stock?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Generate', onPress: async () => {
          try {
            const generated = await purchaseOrdersApi.autoGenerate();
            await load();
            Alert.alert('Done', `${generated.length} purchase order(s) created.`);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const totalValue = (po: PurchaseOrder) =>
    (po.items ?? []).reduce((s, i) => s + i.quantity_ordered * i.unit_price, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Auto-generate button */}
      <TouchableOpacity style={styles.autoBtn} onPress={handleAutoGenerate}>
        <Text style={styles.autoBtnText}>⚡ Auto-Generate from Low Stock</Text>
      </TouchableOpacity>

      <FlatList
        data={pos}
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[COLORS.primary]} />}
        contentContainerStyle={pos.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No purchase orders</Text>
              <Text style={styles.emptyHint}>Tap + to create one</Text>
            </View>
          ) : null
        }
        renderItem={({ item: po }) => {
          const sc = STATUS_COLORS[po.status] ?? STATUS_COLORS.draft;
          const val = totalValue(po);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.poNum}>{po.po_number}</Text>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeTxt, { color: sc.text }]}>{po.status}</Text>
                </View>
              </View>
              {po.supplier_name && <Text style={styles.supplier}>🏢 {po.supplier_name}</Text>}
              <Text style={styles.meta}>{formatDate(po.created_at)}</Text>
              {po.items && <Text style={styles.meta}>{po.items.length} line{po.items.length !== 1 ? 's' : ''}  ·  ${val.toFixed(2)}</Text>}
              {po.notes && <Text style={styles.notes} numberOfLines={1}>{po.notes}</Text>}

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus(po)}>
                  <Text style={styles.actionTxt}>Status</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={() => handleDelete(po)}>
                  <Text style={[styles.actionTxt, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <FAB onPress={() => setShowCreate(true)} />

      <CreatePOModal
        visible={showCreate}
        suppliers={suppliers}
        items={items}
        onSave={load}
        onClose={() => setShowCreate(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 4 },
  emptyHint: { fontSize: 13, color: '#999' },
  autoBtn: {
    margin: 12, backgroundColor: COLORS.accent, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  autoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  poNum: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  supplier: { fontSize: 13, color: '#444', marginBottom: 2 },
  meta: { fontSize: 12, color: '#888', marginBottom: 2 },
  notes: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionDanger: { borderColor: '#ffcdd2' },
  actionTxt: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, maxHeight: '90%',
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.primary, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 8 },
  smallLabel: { fontSize: 11, fontWeight: '600', color: '#666', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: '#fafafa', color: '#222',
  },
  picker: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: 14, color: '#222', flex: 1 },
  placeholder: { color: '#aaa' },
  chevron: { fontSize: 12, color: '#999' },
  row: { flexDirection: 'row', gap: 8 },
  poItemCard: {
    borderWidth: 1, borderColor: '#e8eaf6', borderRadius: 10,
    padding: 10, marginBottom: 8, backgroundColor: '#f8f9ff',
  },
  addLineBtn: {
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, borderStyle: 'dashed',
    paddingVertical: 10, alignItems: 'center', marginTop: 4, marginBottom: 12,
  },
  addLineTxt: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  listRow: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowNone: { fontSize: 15, color: '#999', fontStyle: 'italic' },
  rowText: { fontSize: 15, color: '#222' },
  rowSub: { fontSize: 12, color: '#888', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnCancel: {
    flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  btnCancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  btnSave: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
