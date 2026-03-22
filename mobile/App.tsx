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

// ── Navigation types ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Tabs: undefined;
  ItemDetail: { itemId: string };
};

type TabParamList = {
  Dashboard: undefined;
  Scanner: undefined;
  Report: undefined;
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
    Report: '📄',
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
        options={{ title: 'Scan QR Code', tabBarLabel: 'Scan' }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{ title: 'Stock Report', tabBarLabel: 'Report' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Server Settings', tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

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
            options={{
              title: 'Item Detail',
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
