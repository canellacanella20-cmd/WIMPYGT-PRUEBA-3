import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useApp } from './AppContext';
import { colors, radius } from './theme';

const OPCIONES = [
  { screen: 'Menú', icon: '📋', title: 'Menú', desc: 'Platillos, precios y recetas' },
  { screen: 'Inventario', icon: '📦', title: 'Inventario', desc: 'Insumos, stock y conteo físico' },
  { screen: 'Compras', icon: '🛒', title: 'Compras', desc: 'Registrar compras a proveedores' },
  { screen: 'Ajustes', icon: '⚙️', title: 'Ajustes', desc: 'Datos del negocio y ticket' },
];

export default function MasScreen({ navigation }) {
  const { setRole } = useApp();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14 }}>
      <Text style={styles.title}>MÁS</Text>
      <Text style={styles.subtitle}>Otras secciones de tu negocio</Text>

      {OPCIONES.map((op) => (
        <TouchableOpacity key={op.screen} style={styles.item} onPress={() => navigation.navigate(op.screen)}>
          <Text style={styles.itemIcon}>{op.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{op.title}</Text>
            <Text style={styles.itemDesc}>{op.desc}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={{ alignItems: 'center', marginTop: 24 }} onPress={() => setRole(null)}>
        <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 12.5 }}>Cambiar de usuario</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.inkSoft, fontSize: 13, marginBottom: 14 },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paperRaised,
    borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 14, marginBottom: 10, gap: 12,
  },
  itemIcon: { fontSize: 22 },
  itemTitle: { fontWeight: '700', fontSize: 14.5, color: colors.ink },
  itemDesc: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.inkSoft },
});
