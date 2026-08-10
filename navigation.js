import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useApp } from './AppContext';
import { colors } from './theme';

import VenderScreen from './VenderScreen';
import MenuScreen from './MenuScreen';
import InventarioScreen from './InventarioScreen';
import AjustesScreen from './AjustesScreen';
import ComingSoonScreen from './ComingSoonScreen';

const Tab = createBottomTabNavigator();

function icon(emoji) {
  return ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function AppTabs() {
  const { isOwner } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { borderTopColor: colors.line },
      }}
    >
      <Tab.Screen name="Vender" component={VenderScreen} options={{ title: 'Vender', tabBarIcon: icon('🧾') }} />
      {isOwner && (
        <>
          <Tab.Screen name="Menú" component={MenuScreen} options={{ title: 'Menú', tabBarIcon: icon('📋') }} />
          <Tab.Screen name="Inventario" component={InventarioScreen} options={{ title: 'Inventario', tabBarIcon: icon('📦') }} />
          <Tab.Screen
            name="Caja"
            component={ComingSoonScreen}
            initialParams={{ nombre: 'Cierre de caja e Ingresos/Egresos' }}
            options={{ title: 'Caja', tabBarIcon: icon('💰') }}
          />
          <Tab.Screen
            name="Reportes"
            component={ComingSoonScreen}
            initialParams={{ nombre: 'Reportes' }}
            options={{ title: 'Reportes', tabBarIcon: icon('📊') }}
          />
          <Tab.Screen name="Ajustes" component={AjustesScreen} options={{ title: 'Ajustes', tabBarIcon: icon('⚙️') }} />
        </>
      )}
    </Tab.Navigator>
  );
}
