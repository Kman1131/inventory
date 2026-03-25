import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ItemDetailScreen } from './src/screens/ItemDetailScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SuppliersScreen } from './src/screens/SuppliersScreen';
import { LocationsScreen } from './src/screens/LocationsScreen';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { PurchaseOrdersScreen } from './src/screens/PurchaseOrdersScreen';
import { CreateItemScreen } from './src/screens/CreateItemScreen';
import { CreateSupplierScreen } from './src/screens/CreateSupplierScreen';

// ── Navigation types ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Tabs: undefined;
  ItemDetail: { itemId: string };
  CreateItem: { sku?: string };
  CreateSupplier: undefined;
  Locations: undefined;
  Categories: undefined;
  Suppliers: undefined;
  Orders: undefined;
  Report: undefined;
};

type TabParamList = {
  Dashboard: undefined;
  Scanner: undefined;
  Settings: undefined;
};

// ── Navigators ────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const COLORS = {
  primary: '#1a237e',
  accent: '#3949ab',
  inactive: '#9e9e9e',
  bg: '#ffffff',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '📦',
    Scanner: '📷',
    Settings: '⚙️',
  };
  return (
    <View style={tabStyles.iconWrap}>
      <Text style={{ fontSize: focused ? 22 : 20 }}>{icons[name]}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
});

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: { backgroundColor: COLORS.bg, borderTopWidth: 1 },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inventory', tabBarLabel: 'Inventory' }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ title: 'Scan Barcode / QR', tabBarLabel: 'Scan' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

const headerOpts = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontWeight: '700' as const },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator>
          <Stack.Screen
            name="Tabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ItemDetail"
            component={ItemDetailScreen}
            options={{ title: 'Item Detail', ...headerOpts }}
          />
          <Stack.Screen
            name="CreateItem"
            component={CreateItemScreen}
            options={{ title: 'Add Item', ...headerOpts }}
          />
          <Stack.Screen
            name="CreateSupplier"
            component={CreateSupplierScreen}
            options={{ title: 'Add Supplier', ...headerOpts }}
          />
          <Stack.Screen
            name="Locations"
            component={LocationsScreen}
            options={{ title: 'Locations', ...headerOpts }}
          />
          <Stack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={{ title: 'Categories', ...headerOpts }}
          />
          <Stack.Screen
            name="Suppliers"
            component={SuppliersScreen}
            options={{ title: 'Suppliers', ...headerOpts }}
          />
          <Stack.Screen
            name="Orders"
            component={PurchaseOrdersScreen}
            options={{ title: 'Purchase Orders', ...headerOpts }}
          />
          <Stack.Screen
            name="Report"
            component={ReportScreen}
            options={{ title: 'Stock Report', ...headerOpts }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
