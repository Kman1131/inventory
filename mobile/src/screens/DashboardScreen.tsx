import React, { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFetchInventory } from '../hooks/useFetchInventory';
import { ItemCard } from '../components/ItemCard';
import { FAB } from '../components/FAB';
import type { InventoryItem } from '../types';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  primary: '#1a237e',
  lowStock: '#c62828',
  bg: '#f5f5f5',
  text: '#212121',
  subtext: '#757575',
};

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { items, loading, error, refresh } = useFetchInventory('/items');

  useEffect(() => {
    refresh();
  }, []);

  const allItems = items;
  const lowStockItems = items.filter(i => i.quantity < i.min_threshold);

  const handlePress = (item: InventoryItem) => {
    navigation.navigate('ItemDetail', { itemId: item.id });
  };

  if (loading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <Text style={styles.hintText}>Check Server IP in Settings tab</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{allItems.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={[styles.stat, lowStockItems.length > 0 && styles.statAlert]}>
          <Text style={[styles.statNum, lowStockItems.length > 0 && styles.statNumAlert]}>
            {lowStockItems.length}
          </Text>
          <Text style={[styles.statLabel, lowStockItems.length > 0 && styles.statLabelAlert]}>
            Low Stock
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>
            ${allItems.reduce((s, i) => s + i.quantity * i.price, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Value</Text>
        </View>
      </View>

      {lowStockItems.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            ⚠  {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need restocking
          </Text>
        </View>
      )}

      <FlatList
        data={allItems}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => handlePress(item)} />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items yet.</Text>
            <Text style={styles.emptyHint}>Use the Scanner to add items or check backend connection.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 90 }}
      />

      <FAB onPress={() => navigation.navigate('CreateItem', {})} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.subtext },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { fontSize: 14, color: COLORS.lowStock, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 8, marginBottom: 12,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  hintText: { fontSize: 12, color: COLORS.subtext },
  statsBar: {
    flexDirection: 'row', backgroundColor: COLORS.primary,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  stat: { flex: 1, alignItems: 'center' },
  statAlert: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  statNumAlert: { color: '#ffcdd2' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statLabelAlert: { color: '#ffcdd2' },
  alertBanner: {
    backgroundColor: '#ffebee', paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#ffcdd2',
  },
  alertText: { color: COLORS.lowStock, fontWeight: '600', fontSize: 13 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.subtext, marginBottom: 8 },
  emptyHint: { fontSize: 13, color: COLORS.subtext, textAlign: 'center' },
});
