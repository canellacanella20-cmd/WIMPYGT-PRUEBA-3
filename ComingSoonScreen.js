import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from './theme';

export default function ComingSoonScreen({ route }) {
  const nombre = route?.params?.nombre || 'Esta sección';
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚧</Text>
      <Text style={styles.title}>{nombre}</Text>
      <Text style={styles.text}>La construimos en el siguiente paso.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  text: { color: colors.inkSoft, fontSize: 13, textAlign: 'center' },
});
