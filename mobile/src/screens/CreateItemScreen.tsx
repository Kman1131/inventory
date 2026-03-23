import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { apiPost, categoriesApi, locationsApi, suppliersApi } from '../config/api';
import type { Category, Location, Supplier } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateItem'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLORS = { primary: '#1a237e', accent: '#3949ab', border: '#e0e0e0' };

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; autoCapitalize?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor="#aaa" keyboardType={keyboardType ?? 'default'}
        multiline={multiline} autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

function locLabel(loc: Location) {
  const parts = [loc.zone, loc.aisle, loc.bin].filter(Boolean);
  return parts.join(' â€º ');
}

function PickerModal<T extends { id: string }>({
  visible, title, items, onSelect, onClose, renderLabel,
}: {
  visible: boolean; title: string; items: T[]; onSelect: (item: T | null) => void;
  onClose: () => void; renderLabel: (item: T) => string;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity style={styles.sheetRow} onPress={() => { onSelect(null); onClose(); }}>
            <Text style={styles.sheetNone}>â€” None â€”</Text>
          </TouchableOpacity>
          <FlatList
            data={items} keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.sheetRow} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={styles.sheetItem}>{renderLabel(item)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function CreateItemScreen({ route }: Props) {
  const navigation = useNavigation<Nav>();
  const prefillSku = route.params?.sku ?? '';

  const [sku, setSku] = useState(prefillSku);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minThreshold, setMinThreshold] = useState('5');
  const [price, setPrice] = useState('0');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [showSupPicker, setShowSupPicker] = useState(false);

  useEffect(() => {
    Promise.all([categoriesApi.list(), locationsApi.list(), suppliersApi.list()])
      .then(([cats, locs, sups]) => { setCategories(cats); setLocations(locs); setSuppliers(sups); })
      .catch(() => {});
  }, []);

  const selectedCat = categories.find(c => c.id === categoryId);
  const selectedLoc = locations.find(l => l.id === locationId);
  const selectedSup = suppliers.find(s => s.id === supplierId);

  const handleSave = async () => {
    if (!sku.trim() || !name.trim()) {
      Alert.alert('Validation', 'SKU and Name are required.');
      return;
    }
    if (!locationId) {
      Alert.alert('Validation', 'Please select a location for this item.');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/items', {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        quantity: parseInt(quantity) || 0,
        min_threshold: parseInt(minThreshold) || 5,
        price: parseFloat(price) || 0,
        category_id: categoryId ?? null,
        location_id: locationId ?? null,
        supplier_id: supplierId ?? null,
      });
      Alert.alert('Success', `"${name}" has been added to inventory.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Field label="SKU *" value={sku} onChangeText={v => setSku(v.toUpperCase())} placeholder="e.g. WDG-001" autoCapitalize="characters" />
          <Field label="Name *" value={name} onChangeText={setName} placeholder="Item name" />
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Optionalâ€¦" multiline />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Initial Qty</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholderTextColor="#aaa" />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Min Stock</Text>
              <TextInput style={styles.input} value={minThreshold} onChangeText={setMinThreshold} keyboardType="numeric" placeholderTextColor="#aaa" />
            </View>
          </View>

          <View style={{ width: '50%' }}>
            <Text style={styles.label}>Unit Price ($)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor="#aaa" />
          </View>

          {/* Category picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowCatPicker(true)}>
              <Text style={[styles.pickerText, !selectedCat && styles.pickerPlaceholder]}>
                {selectedCat ? selectedCat.name : 'Select categoryâ€¦'}
              </Text>
              <Text style={styles.pickerChevron}>â–¼</Text>
            </TouchableOpacity>
          </View>

          {/* Location picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Location *</Text>
            <TouchableOpacity style={[styles.picker, !selectedLoc && styles.pickerError]} onPress={() => setShowLocPicker(true)}>
              <Text style={[styles.pickerText, !selectedLoc && styles.pickerPlaceholder]}>
                {selectedLoc ? locLabel(selectedLoc) : 'Select locationâ€¦'}
              </Text>
              <Text style={styles.pickerChevron}>â–¼</Text>
            </TouchableOpacity>
          </View>

          {/* Supplier picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Supplier</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowSupPicker(true)}>
              <Text style={[styles.pickerText, !selectedSup && styles.pickerPlaceholder]}>
                {selectedSup ? selectedSup.name : 'Select supplierâ€¦'}
              </Text>
              <Text style={styles.pickerChevron}>â–¼</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.btnText}>Save Item</Text>}
        </TouchableOpacity>
      </ScrollView>

      <PickerModal
        visible={showCatPicker} title="Select Category" items={categories}
        onSelect={c => setCategoryId(c?.id ?? null)} onClose={() => setShowCatPicker(false)}
        renderLabel={c => c.name}
      />
      <PickerModal
        visible={showLocPicker} title="Select Location" items={locations}
        onSelect={l => setLocationId(l?.id ?? null)} onClose={() => setShowLocPicker(false)}
        renderLabel={l => locLabel(l)}
      />
      <PickerModal
        visible={showSupPicker} title="Select Supplier" items={suppliers}
        onSelect={s => setSupplierId(s?.id ?? null)} onClose={() => setShowSupPicker(false)}
        renderLabel={s => s.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, gap: 14,
  },
  field: {},
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#222',
    backgroundColor: '#fafafa',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  picker: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fafafa',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: 15, color: '#222', flex: 1 },
  pickerPlaceholder: { color: '#aaa' },
  pickerChevron: { fontSize: 12, color: '#999', marginLeft: 8 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  // Modal picker
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingBottom: 32, maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.primary,
    textAlign: 'center', marginBottom: 8, paddingHorizontal: 16,
  },
  sheetRow: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sheetNone: { fontSize: 15, color: '#999', fontStyle: 'italic' },
  sheetItem: { fontSize: 15, color: '#222' },
});

