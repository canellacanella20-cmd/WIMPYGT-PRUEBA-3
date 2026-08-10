import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert,
} from 'react-native';
import { useApp } from './AppContext';
import { guardarInsumo, eliminarInsumo } from './firestore';
import { round2, UNIDADES } from './format';
import { colors, radius } from './theme';

const emptyForm = { nombre: '', unidad: 'unidad', stock: '', minimo: '' };

export default function InventarioScreen() {
  const { insumos } = useApp();
  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [ajustes, setAjustes] = useState({}); // insumoId -> texto de ajuste (+5 / -3)

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setFormVisible(true);
  }

  function openEdit(i) {
    setEditId(i.id);
    setForm({ nombre: i.nombre, unidad: i.unidad, stock: String(i.stock), minimo: String(i.minimo) });
    setFormVisible(true);
  }

  async function save() {
    if (!form.nombre.trim() || form.stock === '' || isNaN(Number(form.stock))) {
      Alert.alert('Datos incompletos', 'Escribe un nombre y un stock válido.');
      return;
    }
    await guardarInsumo(editId, {
      nombre: form.nombre.trim(),
      unidad: form.unidad,
      stock: Number(form.stock),
      minimo: Number(form.minimo) || 0,
    });
    setFormVisible(false);
  }

  function confirmDelete(id, nombre) {
    Alert.alert('Eliminar insumo', `¿Eliminar "${nombre}" del inventario?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarInsumo(id) },
    ]);
  }

  async function aplicarAjuste(item) {
    const texto = ajustes[item.id];
    const delta = Number(texto);
    if (!texto || isNaN(delta) || delta === 0) return;
    const nuevoStock = round2(item.stock + delta);
    await guardarInsumo(item.id, { stock: nuevoStock });
    setAjustes((a) => ({ ...a, [item.id]: '' }));
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>INVENTARIO</Text>
            <Text style={styles.subtitle}>Stock de insumos. Se descuenta solo al vender platillos con receta.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Text style={styles.addBtnText}>+ Insumo</Text>
          </TouchableOpacity>
        </View>

        {insumos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.inkSoft }}>Todavía no tienes insumos. Agrega el primero.</Text>
          </View>
        ) : (
          insumos.map((i) => {
            const low = i.stock <= i.minimo;
            const pct = i.minimo > 0 ? Math.min(100, (i.stock / (i.minimo * 2 || 1)) * 100) : 100;
            return (
              <View key={i.id} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => openEdit(i)}>
                    <Text style={styles.itemTitle}>{i.nombre}</Text>
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemSub}>{i.stock} {i.unidad} · mínimo {i.minimo}</Text>
                      <View style={[styles.badge, low ? styles.badgeLow : styles.badgeOk]}>
                        <Text style={[styles.badgeText, { color: low ? colors.danger : colors.success }]}>
                          {low ? 'Stock bajo' : 'OK'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.stockBar}>
                      <View style={[styles.stockBarFill, { width: `${pct}%`, backgroundColor: low ? colors.danger : colors.success }]} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.ajusteRow}>
                    <TextInput
                      style={styles.ajusteInput}
                      placeholder="+/-"
                      keyboardType="numbers-and-punctuation"
                      value={ajustes[i.id] || ''}
                      onChangeText={(t) => setAjustes((a) => ({ ...a, [i.id]: t }))}
                    />
                    <TouchableOpacity style={styles.ajusteBtn} onPress={() => aplicarAjuste(i)}>
                      <Text style={styles.ajusteBtnText}>Ajustar stock</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(i.id, i.nombre)}>
                      <Text style={styles.deleteBtn}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={formVisible} animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: 18 }}>
          <Text style={styles.modalTitle}>{editId ? 'Editar insumo' : 'Nuevo insumo'}</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} value={form.nombre} onChangeText={(t) => setForm({ ...form, nombre: t })} placeholder="Ej. Pan de hamburguesa" />

          <Text style={styles.label}>Unidad</Text>
          <View style={styles.chipsRow}>
            {UNIDADES.map((u) => (
              <TouchableOpacity key={u} style={[styles.chip, form.unidad === u && styles.chipActive]} onPress={() => setForm({ ...form, unidad: u })}>
                <Text style={[styles.chipText, form.unidad === u && styles.chipTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Stock actual</Text>
          <TextInput style={styles.input} value={form.stock} onChangeText={(t) => setForm({ ...form, stock: t })} keyboardType="decimal-pad" placeholder="0" />

          <Text style={styles.label}>Stock mínimo (para alertas)</Text>
          <TextInput style={styles.input} value={form.minimo} onChangeText={(t) => setForm({ ...form, minimo: t })} keyboardType="decimal-pad" placeholder="0" />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setFormVisible(false)}>
              <Text style={styles.btnGhostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={save}>
              <Text style={styles.btnPrimaryText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.inkSoft, fontSize: 12.5, flex: 1, marginRight: 10 },
  addBtn: { backgroundColor: colors.secondary, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, alignSelf: 'flex-start' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { padding: 24, borderWidth: 1, borderColor: colors.lineStrong, borderStyle: 'dashed', borderRadius: radius, alignItems: 'center', marginTop: 10 },
  item: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 12, marginBottom: 8 },
  itemTitle: { fontWeight: '700', fontSize: 14.5, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  itemSub: { fontSize: 12, color: colors.inkSoft },
  badge: { borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  badgeOk: { backgroundColor: colors.successSoft },
  badgeLow: { backgroundColor: colors.dangerSoft },
  badgeText: { fontSize: 11, fontWeight: '700' },
  stockBar: { height: 6, backgroundColor: colors.line, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  stockBarFill: { height: '100%', borderRadius: 4 },
  ajusteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  ajusteInput: { width: 56, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 6, padding: 6, fontSize: 12.5, textAlign: 'center' },
  ajusteBtn: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  ajusteBtnText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  deleteBtn: { color: colors.danger, fontSize: 12, fontWeight: '600', marginLeft: 'auto' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 16 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.inkSoft, fontWeight: '700', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: '#fff' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.inkSoft },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24, marginBottom: 40 },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 14 },
  btnGhostText: { color: colors.inkSoft, fontWeight: '600' },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});
