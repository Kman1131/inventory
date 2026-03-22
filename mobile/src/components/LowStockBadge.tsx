import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LowStockBadgeProps {
  count: number;
}

export function LowStockBadge({ count }: LowStockBadgeProps) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  text: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
