import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { suppliersApi } from '../config/api';
import type { Supplier } from '../types';
import { FAB } from '../components/FAB';

const COLORS = { primary: '#1a237e', accent: '#3949ab', danger: '#d32f2f', border: '#e0e0e0' };

// â”€â”€ Form modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SupplierFormModal({
  visible, initial, onSave, onClose,
}: {
  visible: boolean;
  initial: Supplier | null;
  onSave: (data: Partial<Supplier>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [contactName, setContactName] = useState(initial?.contact_name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setName(initial?.name ?? '');
    setContactName(initial?.contact_name ?? '');
    setEmail(initial?.email ?? '');
    setPhone(initial?.phone ?? '');
    setAddress(initial?.address ?? '');
    setNotes(initial?.notes ?? '');
  }, [visible, initial]);

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Company name is required.'); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>{initial ? 'Edit Supplier' : 'New Supplier'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'Company Name *', value: name, set: setName, placeholder: 'Supplier Co.' },
              { label: 'Contact Name', value: contactName, set: setContactName, placeholder: 'Jane Smith' },
              { label: 'Email', value: email, set: setEmail, placeholder: 'orders@supplier.com', keyboard: 'email-address' },
              { label: 'Phone', value: phone, set: setPhone, placeholder: '+1 555 0100', keyboard: 'phone-pad' },
              { label: 'Address', value: address, set: setAddress, placeholder: '123 Warehouse St', multi: true },
              { label: 'Notes', value: notes, set: setNotes, placeholder: 'Payment terms', multi: true },
            ].map(f => (
              <View key={f.label}>
                <Text style={modal.label}>{f.label}</Text>
                <TextInput
                  style={[modal.input, f.multi && modal.multiline]}
                  value={f.value} onChangeText={f.set}
                  placeholder={f.placeholder} placeholderTextColor="#aaa"
                  keyboardType={(f as any).keyboard ?? 'default'}
                  multiline={f.multi}
                />
              </View>
            ))}
          </ScrollView>
          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.btnCancel} onPress={onClose}>
              <Text style={modal.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.btnSave} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.btnSaveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// â”€â”€ Main screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Supplier | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await suppliersApi.list();
      setSuppliers(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async (data: Partial<Supplier>) => {
    if (editing) {
      await suppliersApi.update(editing.id, data);
    } else {
      await suppliersApi.create(data);
    }
    await load();
  };

  const handleDelete = (s: Supplier) => {
    Alert.alert('Delete Supplier', `Remove "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await suppliersApi.remove(s.id);
            setSuppliers(prev => prev.filter(x => x.id !== s.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={suppliers}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[COLORS.primary]} />}
        contentContainerStyle={suppliers.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>ðŸ¢</Text>
              <Text style={styles.emptyText}>No suppliers yet</Text>
              <Text style={styles.emptyHint}>Tap + to add one</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              {item.contact_name && <Text style={styles.sub}>{item.contact_name}</Text>}
              {item.email && <Text style={styles.sub}>âœ‰ {item.email}</Text>}
              {item.phone && <Text style={styles.sub}>ðŸ“ž {item.phone}</Text>}
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(item)}>
              <Text style={styles.editTxt}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteTxt}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <FAB onPress={() => setEditing(null)} />

      <SupplierFormModal
        visible={editing !== undefined}
        initial={editing ?? null}
        onSave={handleSave}
        onClose={() => setEditing(undefined)}
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
  card: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, flexDirection: 'row', alignItems: 'flex-start',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  sub: { fontSize: 13, color: '#666', marginTop: 2 },
  editBtn: { paddingLeft: 10, paddingTop: 2 },
  editTxt: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  deleteBtn: { paddingLeft: 10, paddingTop: 2 },
  deleteTxt: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, maxHeight: '85%',
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.primary, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: '#fafafa', color: '#222',
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  btnCancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  btnSave: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
