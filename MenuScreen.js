import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, FlatList,
} from 'react-native';
import { useApp } from './AppContext';
import { guardarPlatillo, eliminarPlatillo } from './firestore';
import { money } from './format';
import { colors, radius } from './theme';

const emptyForm = { nombre: '', categoria: '', precio: '', receta: [] };

export default function MenuScreen() {
  const { menu, insumos } = useApp();
  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [recetaPickerVisible, setRecetaPickerVisible] = useState(false);
  const [recetaInsumoId, setRecetaInsumoId] = useState(null);
  const [recetaCantidad, setRecetaCantidad] = useState('');

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setFormVisible(true);
  }

  function openEdit(p) {
    setEditId(p.id);
    setForm({ nombre: p.nombre, categoria: p.categoria || '', precio: String(p.precio), receta: p.receta || [] });
    setFormVisible(true);
  }

  async function save() {
    if (!form.nombre.trim() || !form.precio || isNaN(Number(form.precio))) {
      Alert.alert('Datos incompletos', 'Escribe un nombre y un precio válido.');
      return;
    }
    await guardarPlatillo(editId, {
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim() || 'Otros',
      precio: Number(form.precio),
      receta: form.receta,
    });
    setFormVisible(false);
  }

  function confirmDelete(id, nombre) {
    Alert.alert('Eliminar platillo', `¿Eliminar "${nombre}" del menú?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarPlatillo(id) },
    ]);
  }

  function addIngrediente() {
    if (!recetaInsumoId || !recetaCantidad || isNaN(Number(recetaCantidad)) || Number(recetaCantidad) <= 0) {
      Alert.alert('Selecciona un insumo y una cantidad válida.');
      return;
    }
    setForm((f) => {
      const receta = f.receta.filter((r) => r.insumoId !== recetaInsumoId);
      receta.push({ insumoId: recetaInsumoId, cantidad: Number(recetaCantidad) });
      return { ...f, receta };
    });
    setRecetaPickerVisible(false);
    setRecetaInsumoId(null);
    setRecetaCantidad('');
  }

  function removeIngrediente(insumoId) {
    setForm((f) => ({ ...f, receta: f.receta.filter((r) => r.insumoId !== insumoId) }));
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>MENÚ</Text>
            <Text style={styles.subtitle}>Platillos, precios y sus recetas</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Text style={styles.addBtnText}>+ Platillo</Text>
          </TouchableOpacity>
        </View>

        {menu.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.inkSoft }}>Todavía no tienes platillos. Agrega el primero.</Text>
          </View>
        ) : (
          menu.map((p) => (
            <View key={p.id} style={styles.item}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(p)}>
                <Text style={styles.itemTitle}>{p.nombre}</Text>
                <Text style={styles.itemSub}>
                  {p.categoria || 'Otros'} · {money(p.precio)}
                  {p.receta?.length ? ` · ${p.receta.length} insumo(s)` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(p.id, p.nombre)}>
                <Text style={styles.deleteBtn}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal: crear/editar platillo */}
      <Modal visible={formVisible} animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: 18 }}>
          <Text style={styles.modalTitle}>{editId ? 'Editar platillo' : 'Nuevo platillo'}</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} value={form.nombre} onChangeText={(t) => setForm({ ...form, nombre: t })} placeholder="Ej. Hamburguesa Clásica" />

          <Text style={styles.label}>Categoría</Text>
          <TextInput style={styles.input} value={form.categoria} onChangeText={(t) => setForm({ ...form, categoria: t })} placeholder="Ej. Hamburguesas" />

          <Text style={styles.label}>Precio (Q)</Text>
          <TextInput style={styles.input} value={form.precio} onChangeText={(t) => setForm({ ...form, precio: t })} keyboardType="decimal-pad" placeholder="0.00" />

          <Text style={[styles.label, { marginTop: 14 }]}>Receta (insumos que se descuentan al vender)</Text>
          {form.receta.length === 0 ? (
            <Text style={styles.hint}>Sin receta asignada — no se descontará inventario al vender este platillo.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {form.receta.map((r) => {
                const ins = insumos.find((i) => i.id === r.insumoId);
                return (
                  <View key={r.insumoId} style={styles.tag}>
                    <Text style={styles.tagText}>{ins ? ins.nombre : '?'} · {r.cantidad} {ins?.unidad || ''}</Text>
                    <TouchableOpacity onPress={() => removeIngrediente(r.insumoId)}>
                      <Text style={styles.tagRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          <TouchableOpacity style={styles.linkBtn} onPress={() => setRecetaPickerVisible(true)}>
            <Text style={styles.linkBtnText}>+ Agregar insumo a la receta</Text>
          </TouchableOpacity>

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

      {/* Modal: elegir insumo para la receta */}
      <Modal visible={recetaPickerVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.modalTitle}>Agregar insumo</Text>
            <FlatList
              style={{ maxHeight: 220 }}
              data={insumos}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerRow, recetaInsumoId === item.id && styles.pickerRowActive]}
                  onPress={() => setRecetaInsumoId(item.id)}
                >
                  <Text>{item.nombre} ({item.unidad})</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.hint}>No tienes insumos creados. Ve a Inventario primero.</Text>}
            />
            <Text style={styles.label}>Cantidad usada por platillo</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={recetaCantidad} onChangeText={setRecetaCantidad} placeholder="0" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setRecetaPickerVisible(false)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={addIngrediente}>
                <Text style={styles.btnPrimaryText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.inkSoft, fontSize: 13 },
  addBtn: { backgroundColor: colors.secondary, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { padding: 24, borderWidth: 1, borderColor: colors.lineStrong, borderStyle: 'dashed', borderRadius: radius, alignItems: 'center', marginTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 12, marginBottom: 8 },
  itemTitle: { fontWeight: '700', fontSize: 14.5, color: colors.ink },
  itemSub: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  deleteBtn: { color: colors.danger, fontSize: 12.5, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 16 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.inkSoft, fontWeight: '700', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: 10, fontSize: 14, color: colors.ink, backgroundColor: '#fff' },
  hint: { fontSize: 12, color: colors.inkSoft, marginBottom: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.successSoft, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  tagText: { fontSize: 12, color: colors.success },
  tagRemove: { color: colors.danger, fontWeight: '700' },
  linkBtn: { marginTop: 8 },
  linkBtnText: { color: colors.secondaryDark, fontWeight: '700', fontSize: 13 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24, marginBottom: 40 },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 14 },
  btnGhostText: { color: colors.inkSoft, fontWeight: '600' },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pickerBox: { width: '88%', backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  pickerRow: { padding: 10, borderRadius: 8 },
  pickerRowActive: { backgroundColor: colors.warningSoft },
});
