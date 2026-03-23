import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { InventoryItem } from '../types';

interface ItemCardProps {
  item: InventoryItem;
  onPress: () => void;
}

const COLORS = {
  primary: '#1a237e',
  lowStock: '#c62828',
  okStock: '#2e7d32',
  border: '#e0e0e0',
  bg: '#ffffff',
  text: '#212121',
  subtext: '#757575',
};

export function ItemCard({ item, onPress }: ItemCardProps) {
  const isLow = item.quantity < item.min_threshold;

  return (
    <TouchableOpacity style={[styles.card, isLow && styles.cardLow]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.leftBar, { backgroundColor: isLow ? COLORS.lowStock : COLORS.okStock }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.badge, isLow ? styles.badgeLow : styles.badgeOk]}>
            <Text style={styles.badgeText}>{isLow ? 'LOW' : 'OK'}</Text>
          </View>
        </View>
        <Text style={styles.sku}>SKU: {item.sku}</Text>
        <View style={styles.footer}>
          <Text style={styles.qty}>
            Qty: <Text style={[styles.qtyNum, isLow && styles.qtyLow]}>{item.quantity}</Text>
            {' / '}<Text style={styles.threshold}>{item.min_threshold} min</Text>
          </Text>
          {item.category_name && (
            <Text style={styles.category}>{item.category_name}</Text>
          )}
        </View>
        {item.location_zone && (
          <Text style={styles.location}>
            {[item.location_zone, item.location_aisle, item.location_bin].filter(Boolean).join(' › ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLow: {
    borderColor: '#ffcdd2',
  },
  leftBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeLow: { backgroundColor: '#ffcdd2' },
  badgeOk: { backgroundColor: '#c8e6c9' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sku: {
    fontSize: 12,
    color: COLORS.subtext,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qty: {
    fontSize: 13,
    color: COLORS.text,
  },
  qtyNum: {
    fontWeight: '700',
    color: COLORS.okStock,
  },
  qtyLow: {
    color: COLORS.lowStock,
  },
  threshold: {
    color: COLORS.subtext,
  },
  category: {
    fontSize: 11,
    color: COLORS.primary,
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  location: {
    fontSize: 11,
    color: COLORS.subtext,
    marginTop: 4,
  },
});
