import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { locationsApi } from '../config/api';
import type { Location } from '../types';
import { FAB } from '../components/FAB';

const COLORS = { primary: '#1a237e', accent: '#3949ab', danger: '#d32f2f', border: '#e0e0e0' };

function locLabel(zone?: string | null, aisle?: string | null, bin?: string | null) {
  return [zone, aisle, bin].filter(Boolean).join(' › ') || '—';
}

// ── Form modal ────────────────────────────────────────────────────────────────
function LocationFormModal({
  visible, initial, locations, onSave, onClose,
}: {
  visible: boolean;
  initial: Location | null;
  locations: Location[];
  onSave: (data: { zone: string; aisle: string; bin: string; parent_id: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [zone, setZone] = useState(initial?.zone ?? '');
  const [aisle, setAisle] = useState(initial?.aisle ?? '');
  const [bin, setBin] = useState(initial?.bin ?? '');
  const [parentId, setParentId] = useState<string | null>(initial?.parent_id ?? null);
  const [saving, setSaving] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);

  // reset state when modal opens with new initial
  React.useEffect(() => {
    setZone(initial?.zone ?? '');
    setAisle(initial?.aisle ?? '');
    setBin(initial?.bin ?? '');
    setParentId(initial?.parent_id ?? null);
  }, [visible, initial]);

  const availableParents = locations.filter(l => !initial || l.id !== initial.id);
  const selectedParent = availableParents.find(l => l.id === parentId);

  const handleSubmit = async () => {
    if (!zone.trim()) { Alert.alert('Validation', 'Zone/Name is required.'); return; }
    setSaving(true);
    try {
      await onSave({ zone: zone.trim(), aisle: aisle.trim(), bin: bin.trim(), parent_id: parentId });
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>{initial ? 'Edit Location' : 'New Location'}</Text>

          <Text style={modal.label}>Zone / Name *</Text>
          <TextInput style={modal.input} value={zone} onChangeText={setZone} placeholder="e.g. Warehouse A" placeholderTextColor="#aaa" />

          <Text style={modal.label}>Aisle</Text>
          <TextInput style={modal.input} value={aisle} onChangeText={setAisle} placeholder="e.g. Aisle 3" placeholderTextColor="#aaa" />

          <Text style={modal.label}>Bin</Text>
          <TextInput style={modal.input} value={bin} onChangeText={setBin} placeholder="e.g. Bin 12" placeholderTextColor="#aaa" />

          <Text style={modal.label}>Parent Location</Text>
          <TouchableOpacity style={modal.picker} onPress={() => setShowParentPicker(true)}>
            <Text style={[modal.pickerText, !selectedParent && modal.placeholder]}>
              {selectedParent ? locLabel(selectedParent.zone, selectedParent.aisle, selectedParent.bin) : 'None (top-level)'}
            </Text>
            <Text style={modal.chevron}>▼</Text>
          </TouchableOpacity>

          {/* Parent picker sub-modal */}
          <Modal visible={showParentPicker} animationType="fade" transparent onRequestClose={() => setShowParentPicker(false)}>
            <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setShowParentPicker(false)}>
              <View style={[modal.sheet, { maxHeight: '50%' }]}>
                <Text style={modal.title}>Select Parent</Text>
                <ScrollView>
                  <TouchableOpacity style={modal.row} onPress={() => { setParentId(null); setShowParentPicker(false); }}>
                    <Text style={modal.rowNone}>— None (top-level) —</Text>
                  </TouchableOpacity>
                  {availableParents.map(l => (
                    <TouchableOpacity key={l.id} style={modal.row} onPress={() => { setParentId(l.id); setShowParentPicker(false); }}>
                      <Text style={modal.rowText}>{locLabel(l.zone, l.aisle, l.bin)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

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

// ── Main screen ───────────────────────────────────────────────────────────────
export function LocationsScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Location | null | undefined>(undefined); // undefined = closed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await locationsApi.list();
      setLocations(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async (data: { zone: string; aisle: string; bin: string; parent_id: string | null }) => {
    if (editing) {
      await locationsApi.update(editing.id, data);
    } else {
      await locationsApi.create(data);
    }
    await load();
  };

  const handleDelete = (loc: Location) => {
    Alert.alert('Delete Location', `Remove "${locLabel(loc.zone, loc.aisle, loc.bin)}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await locationsApi.remove(loc.id);
            setLocations(prev => prev.filter(l => l.id !== loc.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const parent = (loc: Location) => locations.find(l => l.id === loc.parent_id);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={locations}
        keyExtractor={l => l.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[COLORS.primary]} />}
        contentContainerStyle={locations.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>No locations yet</Text>
              <Text style={styles.emptyHint}>Tap + to add one</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const p = parent(item);
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{locLabel(item.zone, item.aisle, item.bin)}</Text>
                {p && <Text style={styles.sub}>📍 Under: {locLabel(p.zone, p.aisle, p.bin)}</Text>}
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(item)}>
                <Text style={styles.editTxt}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <FAB onPress={() => setEditing(null)} />

      <LocationFormModal
        visible={editing !== undefined}
        initial={editing ?? null}
        locations={locations}
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
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  sub: { fontSize: 12, color: '#888', marginTop: 2 },
  editBtn: { paddingLeft: 10, paddingTop: 2 },
  editTxt: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  deleteBtn: { paddingLeft: 10, paddingTop: 2 },
  deleteTxt: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.primary, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: '#fafafa', color: '#222',
  },
  picker: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: 15, color: '#222', flex: 1 },
  placeholder: { color: '#aaa' },
  chevron: { fontSize: 12, color: '#999' },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowNone: { fontSize: 15, color: '#999', fontStyle: 'italic' },
  rowText: { fontSize: 15, color: '#222' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  btnCancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  btnSave: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
