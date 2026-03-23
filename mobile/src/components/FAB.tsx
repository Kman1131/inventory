import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COLORS = {
  primary: '#1a237e',
  accent: '#3949ab',
  fab: '#3f51b5',
};

const ACTIONS = [
  { label: 'New Item',     icon: '📦', screen: 'CreateItem'    as const, params: {} },
  { label: 'New Supplier', icon: '🏢', screen: 'CreateSupplier' as const, params: undefined },
] as const;

interface FABProps {
  style?: object;
  /** If provided, render a simple single-action FAB instead of the speed-dial */
  onPress?: () => void;
}

export function FAB({ style, onPress }: FABProps) {
  const navigation = useNavigation<Nav>();
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  // ── Simple single-action FAB ──────────────────────────────────────────────
  if (onPress) {
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Speed-dial FAB ────────────────────────────────────────────────────────

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(anim, { toValue, useNativeDriver: true, friction: 6 }).start();
    setOpen(!open);
  };

  const close = () => {
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
    setOpen(false);
  };

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <>
      {open && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={close} />
      )}
      <View style={[styles.container, style]}>
        {ACTIONS.map((action, i) => {
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(56 * (i + 1) + 8 * (i + 1))],
          });
          return (
            <Animated.View
              key={action.screen}
              style={[styles.miniBtn, { transform: [{ translateY }], opacity: anim }]}
            >
              <TouchableOpacity
                style={styles.miniFab}
                onPress={() => {
                  close();
                  setTimeout(() => {
                    if (action.screen === 'CreateItem') {
                      navigation.navigate('CreateItem', {});
                    } else {
                      navigation.navigate('CreateSupplier');
                    }
                  }, 150);
                }}
              >
                <Text style={styles.miniIcon}>{action.icon}</Text>
              </TouchableOpacity>
              <View style={styles.labelWrap}>
                <Text style={styles.label}>{action.label}</Text>
              </View>
            </Animated.View>
          );
        })}

        <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.85}>
          <Animated.Text style={[styles.fabIcon, { transform: [{ rotate }] }]}>+</Animated.Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.fab,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
    marginTop: -2,
  },
  miniBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  miniIcon: { fontSize: 20 },
  labelWrap: {
    position: 'absolute',
    right: 54,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  label: { color: '#ffffff', fontSize: 13, fontWeight: '600', whiteSpace: 'nowrap' } as any,
});
