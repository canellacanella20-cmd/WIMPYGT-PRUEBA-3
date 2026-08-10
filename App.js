import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './AppContext';
import GateScreen from './GateScreen';
import AppTabs from './navigation';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from './theme';

function Root() {
  const { role, loading } = useApp();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.inkSoft }}>Cargando…</Text>
      </View>
    );
  }

  if (!role) return <GateScreen />;

  return (
    <NavigationContainer>
      <AppTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Root />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
});
