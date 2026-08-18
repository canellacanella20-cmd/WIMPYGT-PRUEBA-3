import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useApp } from './AppContext';
import { colors } from './theme';

import VenderScreen from './VenderScreen';
import CajaScreen from './CajaScreen';
import ReportesScreen from './ReportesScreen';
import MasScreen from './MasScreen';
import MenuScreen from './MenuScreen';
import InventarioScreen from './InventarioScreen';
import ComprasScreen from './ComprasScreen';
import AjustesScreen from './AjustesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function icon(emoji) {
  return ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '800' },
};

function MainTabs() {
  const { isOwner } = useApp();
  return (
    <Tab.Navigator
      screenOptions={{
        ...headerOptions,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { borderTopColor: colors.line },
      }}
    >
      <Tab.Screen name="Vender" component={VenderScreen} options={{ title: 'Vender', tabBarIcon: icon('🧾') }} />
      {isOwner && (
        <>
          <Tab.Screen name="Caja" component={CajaScreen} options={{ title: 'Caja', tabBarIcon: icon('💰') }} />
          <Tab.Screen name="Reportes" component={ReportesScreen} options={{ title: 'Reportes', tabBarIcon: icon('📊') }} />
          <Tab.Screen name="Más" component={MasScreen} options={{ title: 'Más', headerShown: false, tabBarIcon: icon('⋯') }} />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function AppTabs() {
  const { isOwner } = useApp();
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      {isOwner && (
        <>
          <Stack.Screen name="Menú" component={MenuScreen} />
          <Stack.Screen name="Inventario" component={InventarioScreen} />
          <Stack.Screen name="Compras" component={ComprasScreen} />
          <Stack.Screen name="Ajustes" component={AjustesScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
