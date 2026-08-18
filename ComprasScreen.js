import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, FlatList,
} from 'react-native';
import { useApp } from './AppContext';
import {
  listenProveedores, guardarProveedor, eliminarProveedor,
  listenComprasEnRango, registrarCompra,
} from './firestore';
import { money, round2 } from './format';
import { colors, radius } from './theme';

function inicioDeMes() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function finDeHoy() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
}

export default function ComprasScreen() {
  const { insumos } = useApp();
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);

  const [proveedorNombre, setProveedorNombre] = useState('');
  const [proveedorPickerVisible, setProveedorPickerVisible] = useState(false);
  const [carrito, setCarrito] = useState([]); // [{insumoId, nombre, unidad, cantidad, costoUnitario}]
  const [insumoPickerVisible, setInsumoPickerVisible] = useState(false);
  const [insumoSel, setInsumoSel] = useState(null);
  const [cantidadSel, setCantidadSel] = useState('');
  const [costoSel, setCostoSel] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [nuevoProveedorVisible, setNuevoProveedorVisible] = useState(false);
  const [formProveedor, setFormProveedor] = useState({ nombre: '', contacto: '', telefono: '' });

  useEffect(() => {
    const unsubP = listenProveedores(setProveedores);
    const unsubC = listenComprasEnRango(inicioDeMes(), finDeHoy(), setCompras);
    return () => { unsubP(); unsubC(); };
  }, []);

  const totalCarrito = carrito.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);

  function addInsumoACarrito() {
    if (!insumoSel) { Alert.alert('Elige un insumo.'); return; }
    const cantidad = Number(cantidadSel);
    const costo = Number(costoSel);
    if (!cantidad || cantidad <= 0 || isNaN(cantidad)) { Alert.alert('Escribe una cantidad válida.'); return; }
    if (isNaN(costo) || costo < 0) { Alert.alert('Escribe un costo válido.'); return; }
    setCarrito((c) => {
      const sinEste = c.filter((i) => i.insumoId !== insumoSel.id);
      return [...sinEste, { insumoId: insumoSel.id, nombre: insumoSel.nombre, unidad: insumoSel.unidad, cantidad, costoUnitario: costo }];
    });
    setInsumoPickerVisible(false);
    setInsumoSel(null);
    setCantidadSel('');
    setCostoSel('');
  }

  function quitarDeCarrito(insumoId) {
    setCarrito((c) => c.filter((i) => i.insumoId !== insumoId));
  }

  async function guardarNuevoProveedor() {
    if (!formProveedor.nombre.trim()) { Alert.alert('Escribe el nombre del proveedor.'); return; }
    await guardarProveedor(null, { ...formProveedor, nombre: formProveedor.nombre.trim() });
    setProveedorNombre(formProveedor.nombre.trim());
    setFormProveedor({ nombre: '', contacto: '', telefono: '' });
    setNuevoProveedorVisible(false);
  }

  function confirmarEliminarProveedor(id, nombre) {
    Alert.alert('Eliminar proveedor', `¿Eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarProveedor(id) },
    ]);
  }

  async function handleRegistrarCompra() {
    if (!proveedorNombre.trim()) { Alert.alert('Elige o escribe un proveedor.'); return; }
    if (carrito.length === 0) { Alert.alert('Agrega al menos un insumo a la compra.'); return; }
    setGuardando(true);
    try {
      await registrarCompra({
        proveedorNombre: proveedorNombre.trim(),
        items: carrito,
        total: round2(totalCarrito),
        notas: notas.trim(),
        fechaISO: new Date().toISOString(),
      });
      setCarrito([]);
      setProveedorNombre('');
      setNotas('');
      Alert.alert('Compra registrada', 'El stock de los insumos ya se actualizó.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo registrar la compra. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Text style={styles.title}>COMPRAS</Text>
        <Text style={styles.subtitle}>Registra lo que le compras a tus proveedores. El stock se suma solo.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nueva compra</Text>

          <Text style={styles.label}>Proveedor</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setProveedorPickerVisible(true)}>
            <Text style={proveedorNombre ? styles.selectBtnText : styles.selectBtnPlaceholder}>
              {proveedorNombre || 'Elegir proveedor'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 14 }]}>Insumos de esta compra</Text>
          {carrito.length === 0 ? (
            <Text style={styles.hint}>Sin insumos agregados todavía.</Text>
          ) : (
            carrito.map((item) => (
              <View key={item.insumoId} style={styles.carritoRow}>
                <Text style={styles.carritoNombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={styles.carritoDetalle}>{item.cantidad} {item.unidad} × {money(item.costoUnitario)}</Text>
                <Text style={styles.carritoTotal}>{money(item.cantidad * item.costoUnitario)}</Text>
                <TouchableOpacity onPress={() => quitarDeCarrito(item.insumoId)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.linkBtn} onPress={() => setInsumoPickerVisible(true)}>
            <Text style={styles.linkBtnText}>+ Agregar insumo a la compra</Text>
          </TouchableOpacity>

          {carrito.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total de la compra</Text>
              <Text style={styles.totalValue}>{money(totalCarrito)}</Text>
            </View>
          )}

          <Text style={[styles.label, { marginTop: 10 }]}>Notas (opcional)</Text>
          <TextInput style={styles.input} value={notas} onChangeText={setNotas} placeholder="Ej. factura #123, pagado de contado" />

          <TouchableOpacity
            style={[styles.btnPrimary, (carrito.length === 0 || guardando) && styles.btnDisabled]}
            disabled={carrito.length === 0 || guardando}
            onPress={handleRegistrarCompra}
          >
            <Text style={styles.btnPrimaryText}>{guardando ? 'Guardando…' : 'Registrar compra'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>COMPRAS DE ESTE MES</Text>
        {compras.length === 0 ? (
          <Text style={styles.hint}>Todavía no has registrado compras este mes.</Text>
        ) : (
          compras.map((c) => (
            <View key={c.id} style={styles.compraCard}>
              <View style={styles.compraTop}>
                <Text style={styles.compraProveedor}>{c.proveedorNombre}</Text>
                <Text style={styles.compraTotal}>{money(c.total)}</Text>
              </View>
              <Text style={styles.compraFecha}>
                {new Date(c.fechaISO).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
              <Text style={styles.compraItems} numberOfLines={2}>
                {c.items.map((i) => `${i.cantidad} ${i.unidad} ${i.nombre}`).join(', ')}
              </Text>
              {!!c.notas && <Text style={styles.compraNotas}>📝 {c.notas}</Text>}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal: elegir/crear proveedor */}
      <Modal visible={proveedorPickerVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.modalTitle}>Elegir proveedor</Text>
            <FlatList
              style={{ maxHeight: 260 }}
              data={proveedores}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <View style={styles.provRow}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => { setProveedorNombre(item.nombre); setProveedorPickerVisible(false); }}>
                    <Text style={styles.provNombre}>{item.nombre}</Text>
                    {!!item.telefono && <Text style={styles.provSub}>{item.telefono}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmarEliminarProveedor(item.id, item.nombre)}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.hint}>Todavía no tienes proveedores.</Text>}
            />
            <TouchableOpacity style={styles.linkBtn} onPress={() => { setProveedorPickerVisible(false); setNuevoProveedorVisible(true); }}>
              <Text style={styles.linkBtnText}>+ Nuevo proveedor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnGhost, { marginTop: 10 }]} onPress={() => setProveedorPickerVisible(false)}>
              <Text style={styles.btnGhostText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: nuevo proveedor */}
      <Modal visible={nuevoProveedorVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.modalTitle}>Nuevo proveedor</Text>
            <Text style={styles.label}>Nombre</Text>
            <TextInput style={styles.input} value={formProveedor.nombre} onChangeText={(t) => setFormProveedor({ ...formProveedor, nombre: t })} placeholder="Ej. Distribuidora El Sol" />
            <Text style={styles.label}>Contacto (opcional)</Text>
            <TextInput style={styles.input} value={formProveedor.contacto} onChangeText={(t) => setFormProveedor({ ...formProveedor, contacto: t })} placeholder="Nombre de la persona" />
            <Text style={styles.label}>Teléfono (opcional)</Text>
            <TextInput style={styles.input} value={formProveedor.telefono} onChangeText={(t) => setFormProveedor({ ...formProveedor, telefono: t })} keyboardType="phone-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => { setNuevoProveedorVisible(false); setProveedorPickerVisible(true); }}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={guardarNuevoProveedor}>
                <Text style={styles.btnPrimaryText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: elegir insumo para la compra */}
      <Modal visible={insumoPickerVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pickerBox}>
            <Text style={styles.modalTitle}>Agregar insumo</Text>
            <FlatList
              style={{ maxHeight: 200 }}
              data={insumos}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerRow, insumoSel?.id === item.id && styles.pickerRowActive]}
                  onPress={() => setInsumoSel(item)}
                >
                  <Text>{item.nombre} ({item.unidad})</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.hint}>No tienes insumos creados. Ve a Inventario primero.</Text>}
            />
            <Text style={styles.label}>Cantidad comprada</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={cantidadSel} onChangeText={setCantidadSel} placeholder="0" />
            <Text style={styles.label}>Costo por unidad (Q)</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={costoSel} onChangeText={setCostoSel} placeholder="0.00" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setInsumoPickerVisible(false)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={addInsumoACarrito}>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.inkSoft, fontSize: 13, marginBottom: 14 },
  card: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 14, marginBottom: 18 },
  cardTitle: { fontWeight: '700', fontSize: 15, color: colors.ink, marginBottom: 4 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.inkSoft, fontWeight: '700', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: 9, fontSize: 13, color: colors.ink, backgroundColor: '#fff' },
  selectBtn: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  selectBtnText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  selectBtnPlaceholder: { color: colors.inkSoft, fontSize: 13 },
  hint: { fontSize: 12.5, color: colors.inkSoft },
  carritoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 6 },
  carritoNombre: { flex: 1, fontSize: 13, color: colors.ink },
  carritoDetalle: { fontSize: 11.5, color: colors.inkSoft },
  carritoTotal: { fontSize: 12.5, fontWeight: '700', color: colors.ink, width: 60, textAlign: 'right' },
  removeBtn: { color: colors.danger, fontSize: 15, paddingHorizontal: 4 },
  linkBtn: { marginTop: 8 },
  linkBtnText: { color: colors.secondaryDark, fontWeight: '700', fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 10, borderTopWidth: 2, borderTopColor: colors.ink },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.ink },
  btnPrimary: { backgroundColor: colors.secondary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  btnDisabled: { backgroundColor: colors.lineStrong },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  btnGhostText: { color: colors.inkSoft, fontWeight: '600' },
  sectionLabel: { fontSize: 11, letterSpacing: 0.5, color: colors.inkSoft, fontWeight: '700', marginBottom: 8 },
  compraCard: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 12, marginBottom: 8 },
  compraTop: { flexDirection: 'row', justifyContent: 'space-between' },
  compraProveedor: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
  compraTotal: { fontWeight: '800', fontSize: 13.5, color: colors.secondaryDark },
  compraFecha: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  compraItems: { fontSize: 12, color: colors.ink, marginTop: 4 },
  compraNotas: { fontSize: 11.5, color: colors.inkSoft, marginTop: 4, fontStyle: 'italic' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pickerBox: { width: '88%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  provRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  provNombre: { fontSize: 13.5, color: colors.ink, fontWeight: '600' },
  provSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  pickerRow: { padding: 10, borderRadius: 8 },
  pickerRowActive: { backgroundColor: colors.warningSoft },
});
