import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { apiPost } from '../config/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLORS = { primary: '#1a237e', accent: '#3949ab', border: '#e0e0e0' };

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        autoCapitalize="sentences"
      />
    </View>
  );
}

export function CreateSupplierScreen() {
  const navigation = useNavigation<Nav>();

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Company name is required.');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/suppliers', {
        name: name.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      Alert.alert('Supplier Added', `"${name}" has been saved.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Field label="Company Name *" value={name} onChangeText={setName} placeholder="Supplier Co." />
          <Field label="Contact Name" value={contactName} onChangeText={setContactName} placeholder="Jane Smith" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="orders@supplier.com" keyboardType="email-address" />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 555 0100" keyboardType="phone-pad" />
          <Field label="Address" value={address} onChangeText={setAddress} placeholder="123 Warehouse St, City…" multiline />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Payment terms, lead times…" multiline />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.btnText}>Save Supplier</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#222',
    backgroundColor: '#fafafa',
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
