import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useApp } from './AppContext';
import { guardarConfig } from './firestore';
import { colors } from './theme';

export default function GateScreen() {
  const { setRole, config } = useApp();
  const [pinModal, setPinModal] = useState(null); // null | 'ask' | 'create'
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  function handleEmployee() {
    setRole('employee');
  }

  function handleOwner() {
    if (config.ownerPin) {
      setPinModal('ask');
    } else {
      setPinModal('create');
    }
    setPinInput('');
    setPinConfirm('');
  }

  async function confirmAskPin() {
    if (pinInput === config.ownerPin) {
      setPinModal(null);
      setRole('owner');
    } else {
      Alert.alert('PIN incorrecto', 'Intenta de nuevo.');
    }
  }

  async function confirmCreatePin() {
    if (!pinInput) {
      Alert.alert('Escribe un PIN.');
      return;
    }
    if (pinInput !== pinConfirm) {
      Alert.alert('Los PIN no coinciden', 'Intenta de nuevo.');
      return;
    }
    await guardarConfig({ ownerPin: pinInput });
    setPinModal(null);
    setRole('owner');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>{config.nombre || 'WIMPY'}</Text>
      <Text style={styles.sub}>¿Quién va a usar la app?</Text>

      <TouchableOpacity style={styles.btnPrimary} onPress={handleOwner}>
        <Text style={styles.btnPrimaryText}>👤 Soy el dueño</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={handleEmployee}>
        <Text style={styles.btnSecondaryText}>🧾 Soy empleado</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        El empleado solo puede registrar ventas. No ve menú, inventario ni reportes.
      </Text>

      <Modal visible={pinModal === 'ask'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>PIN del dueño</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              value={pinInput}
              onChangeText={setPinInput}
              autoFocus
              placeholder="PIN"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setPinModal(null)}>
                <Text style={styles.modalBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={confirmAskPin}>
                <Text style={styles.modalBtnText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={pinModal === 'create'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Crea un PIN para el dueño</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="Nuevo PIN"
              autoFocus
            />
            <TextInput
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
              value={pinConfirm}
              onChangeText={setPinConfirm}
              placeholder="Confirma el PIN"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setPinModal(null)}>
                <Text style={styles.modalBtnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={confirmCreatePin}>
                <Text style={styles.modalBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  brand: {
    color: colors.paper,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sub: { color: '#C9B8AF', fontSize: 14, marginBottom: 28 },
  btnPrimary: {
    width: '100%', maxWidth: 300, backgroundColor: colors.rust,
    padding: 16, borderRadius: 12, marginBottom: 10,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  btnSecondary: {
    width: '100%', maxWidth: 300, backgroundColor: colors.paperRaised,
    padding: 16, borderRadius: 12,
  },
  btnSecondaryText: { color: colors.ink, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  hint: { color: '#8A7A72', fontSize: 12, textAlign: 'center', marginTop: 16, maxWidth: 260 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: colors.ink },
  input: {
    borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8,
    padding: 10, fontSize: 15, marginBottom: 10, color: colors.ink,
  },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
  modalBtnGhost: { paddingVertical: 8, paddingHorizontal: 12 },
  modalBtnGhostText: { color: colors.inkSoft, fontWeight: '600' },
  modalBtn: { backgroundColor: colors.ink, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  modalBtnText: { color: colors.paper, fontWeight: '700' },
});
