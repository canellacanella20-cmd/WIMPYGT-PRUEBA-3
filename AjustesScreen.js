import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { useApp } from './AppContext';
import { guardarConfig } from './firestore';
import { colors, radius } from './theme';

export default function AjustesScreen() {
  const { config, setRole } = useApp();
  const [nombre, setNombre] = useState(config.nombre || '');
  const [mensaje, setMensaje] = useState(config.ticketMensaje || '');
  const [direccion, setDireccion] = useState(config.ticketDireccion || '');

  useEffect(() => {
    setNombre(config.nombre || '');
    setMensaje(config.ticketMensaje || '');
    setDireccion(config.ticketDireccion || '');
  }, [config.nombre, config.ticketMensaje, config.ticketDireccion]);

  async function guardar() {
    await guardarConfig({ nombre: nombre.trim() || 'WIMPY', ticketMensaje: mensaje, ticketDireccion: direccion });
    Alert.alert('Guardado', 'Los cambios se aplicarán a todos los teléfonos conectados.');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>AJUSTES</Text>

      <Text style={styles.label}>Nombre del negocio</Text>
      <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />

      <Text style={styles.label}>Dirección (aparece en el ticket)</Text>
      <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} />

      <Text style={styles.label}>Mensaje del ticket</Text>
      <TextInput style={styles.input} value={mensaje} onChangeText={setMensaje} />

      <TouchableOpacity style={styles.btnPrimary} onPress={guardar}>
        <Text style={styles.btnPrimaryText}>Guardar cambios</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnGhost} onPress={() => setRole(null)}>
        <Text style={styles.btnGhostText}>Cambiar de usuario</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 16 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.inkSoft, fontWeight: '700', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center', marginTop: 24 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhost: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  btnGhostText: { color: colors.danger, fontWeight: '600' },
});
