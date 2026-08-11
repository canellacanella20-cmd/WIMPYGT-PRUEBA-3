import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import {
  listenVentasEnRango, listenMovimientosEnRango, registrarMovimiento,
  eliminarMovimiento, guardarCierre, listenCierres,
} from './firestore';
import { money, round2 } from './format';
import { colors, radius } from './theme';

const RANGOS = {
  hoy: 'Hoy',
  semana: 'Esta semana',
  mes: 'Este mes',
};

function rangoFechas(rango) {
  const now = new Date();
  let start;
  if (rango === 'hoy') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (rango === 'semana') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // lunes = inicio
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

export default function CajaScreen() {
  const [rango, setRango] = useState('hoy');
  const [ventas, setVentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [montoIngreso, setMontoIngreso] = useState('');
  const [conceptoIngreso, setConceptoIngreso] = useState('');
  const [montoEgreso, setMontoEgreso] = useState('');
  const [conceptoEgreso, setConceptoEgreso] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');

  const { start, end } = useMemo(() => rangoFechas(rango), [rango]);

  useEffect(() => {
    const unsubV = listenVentasEnRango(start, end, setVentas);
    const unsubM = listenMovimientosEnRango(start, end, setMovimientos);
    return () => { unsubV(); unsubM(); };
  }, [rango]);

  useEffect(() => {
    const unsub = listenCierres(setCierres);
    return unsub;
  }, []);

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
  const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  ventas.forEach((v) => { porMetodo[v.metodoPago || 'efectivo'] += v.total; });

  const totalIngresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  const efectivoQueDeberiaHaber = round2(porMetodo.efectivo + totalIngresos - totalEgresos);

  const contadoNum = Number(efectivoContado);
  const hayContado = efectivoContado !== '' && !isNaN(contadoNum);
  const diferencia = hayContado ? round2(contadoNum - efectivoQueDeberiaHaber) : null;

  async function handleIngreso() {
    const monto = Number(montoIngreso);
    if (!monto || monto <= 0 || isNaN(monto)) { Alert.alert('Escribe un monto válido.'); return; }
    if (!conceptoIngreso.trim()) { Alert.alert('Escribe un concepto (ej. quién pagó o por qué).'); return; }
    await registrarMovimiento('ingreso', monto, conceptoIngreso.trim());
    setMontoIngreso('');
    setConceptoIngreso('');
  }

  async function handleEgreso() {
    const monto = Number(montoEgreso);
    if (!monto || monto <= 0 || isNaN(monto)) { Alert.alert('Escribe un monto válido.'); return; }
    if (!conceptoEgreso.trim()) { Alert.alert('Escribe un concepto (ej. a quién se le pagó o por qué).'); return; }
    if (monto > efectivoQueDeberiaHaber) {
      Alert.alert(
        'Atención',
        'Este pago es mayor al efectivo que debería haber en caja. ¿Registrarlo de todas formas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Registrar de todas formas', onPress: () => confirmarEgreso(monto) },
        ]
      );
      return;
    }
    confirmarEgreso(monto);
  }

  async function confirmarEgreso(monto) {
    await registrarMovimiento('egreso', monto, conceptoEgreso.trim());
    setMontoEgreso('');
    setConceptoEgreso('');
  }

  function confirmarEliminarMovimiento(id) {
    Alert.alert('Eliminar', '¿Eliminar este movimiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminarMovimiento(id) },
    ]);
  }

  async function handleRegistrarCierre() {
    if (!hayContado || contadoNum < 0) { Alert.alert('Escribe el efectivo contado.'); return; }
    const etiquetas = { hoy: 'Cierre diario', semana: 'Cierre semanal', mes: 'Cierre mensual' };
    const cierre = {
      etiqueta: etiquetas[rango] || 'Cierre',
      rango,
      desde: start.toISOString(),
      hasta: end.toISOString(),
      total: round2(totalVentas),
      numVentas: ventas.length,
      porMetodo,
      totalIngresos: round2(totalIngresos),
      totalEgresos: round2(totalEgresos),
      efectivoQueDeberiaHaber,
      efectivoContado: contadoNum,
      diferencia,
      fechaRegistro: new Date().toISOString(),
    };
    await guardarCierre(cierre);
    setEfectivoContado('');
    Alert.alert('Cierre registrado', 'Se guardó el cierre de caja.');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14 }}>
      <Text style={styles.title}>CAJA</Text>
      <Text style={styles.subtitle}>Ingresos, egresos y cierre de caja</Text>

      <View style={styles.rangoRow}>
        {Object.entries(RANGOS).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.rangoBtn, rango === key && styles.rangoBtnActive]} onPress={() => setRango(key)}>
            <Text style={[styles.rangoText, rango === key && styles.rangoTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resumen */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Ventas ({ventas.length})</Text>
          <Text style={styles.summaryValue}>{money(totalVentas)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>💵 Efectivo en ventas</Text>
          <Text style={styles.summaryValue}>{money(porMetodo.efectivo)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>+ Ingresos</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{money(totalIngresos)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>− Egresos</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{money(totalEgresos)}</Text>
        </View>
      </View>

      {/* Ingresos / Egresos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 Ingreso a caja chica</Text>
        <View style={styles.formRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Monto" keyboardType="decimal-pad" value={montoIngreso} onChangeText={setMontoIngreso} />
          <TextInput style={[styles.input, { flex: 2 }]} placeholder="Concepto (ej. quién aportó)" value={conceptoIngreso} onChangeText={setConceptoIngreso} />
        </View>
        <TouchableOpacity style={styles.btnSuccess} onPress={handleIngreso}>
          <Text style={styles.btnSuccessText}>Registrar ingreso</Text>
        </TouchableOpacity>

        <Text style={[styles.cardTitle, { marginTop: 16 }]}>💸 Pago desde caja chica</Text>
        <View style={styles.formRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Monto" keyboardType="decimal-pad" value={montoEgreso} onChangeText={setMontoEgreso} />
          <TextInput style={[styles.input, { flex: 2 }]} placeholder="Concepto (ej. compra de hielo)" value={conceptoEgreso} onChangeText={setConceptoEgreso} />
        </View>
        <TouchableOpacity style={styles.btnDanger} onPress={handleEgreso}>
          <Text style={styles.btnDangerText}>Registrar pago</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de movimientos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Movimientos de {RANGOS[rango].toLowerCase()}</Text>
        {movimientos.length === 0 ? (
          <Text style={styles.hint}>Sin ingresos ni pagos registrados en este periodo.</Text>
        ) : (
          movimientos.map((m) => (
            <View key={m.id} style={styles.movRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.movConcepto}>{m.tipo === 'ingreso' ? '💰' : '💸'} {m.concepto}</Text>
                <Text style={styles.movFecha}>{new Date(m.fechaISO).toLocaleString('es-GT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={[styles.movMonto, { color: m.tipo === 'ingreso' ? colors.success : colors.danger }]}>
                {m.tipo === 'ingreso' ? '+' : '−'}{money(m.monto)}
              </Text>
              <TouchableOpacity onPress={() => confirmarEliminarMovimiento(m.id)}>
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Cierre de caja */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cierre de caja</Text>
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Efectivo que debería haber</Text>
            <View style={styles.disabledInput}><Text style={styles.disabledInputText}>{money(efectivoQueDeberiaHaber)}</Text></View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Efectivo contado</Text>
            <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={efectivoContado} onChangeText={setEfectivoContado} />
          </View>
        </View>
        {hayContado && (
          <Text style={[styles.diffText, { color: diferencia === 0 ? colors.inkSoft : diferencia > 0 ? colors.success : colors.danger }]}>
            {diferencia === 0 ? 'Cuadra exacto.' : diferencia > 0 ? `Sobrante: ${money(diferencia)}` : `Faltante: ${money(Math.abs(diferencia))}`}
          </Text>
        )}
        <TouchableOpacity style={styles.btnPrimary} onPress={handleRegistrarCierre}>
          <Text style={styles.btnPrimaryText}>Registrar cierre</Text>
        </TouchableOpacity>

        <Text style={[styles.cardTitle, { marginTop: 18 }]}>Cierres registrados</Text>
        {cierres.length === 0 ? (
          <Text style={styles.hint}>Todavía no has registrado ningún cierre.</Text>
        ) : (
          cierres.slice(0, 10).map((c) => {
            const dif = c.diferencia;
            const color = dif === 0 ? colors.inkSoft : dif > 0 ? colors.success : colors.danger;
            const fecha = new Date(c.fechaRegistro).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return (
              <View key={c.id} style={styles.cierreRow}>
                <Text style={styles.cierreTitle}>{c.etiqueta}</Text>
                <Text style={styles.cierreSub}>
                  {fecha} · debía {money(c.efectivoQueDeberiaHaber)} · contado {money(c.efectivoContado)} ·{' '}
                  <Text style={{ color, fontWeight: '700' }}>
                    {dif === 0 ? 'cuadrado' : dif > 0 ? `sobrante ${money(dif)}` : `faltante ${money(Math.abs(dif))}`}
                  </Text>
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.inkSoft, fontSize: 13, marginBottom: 14 },
  rangoRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rangoBtn: { flex: 1, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rangoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangoText: { fontSize: 12.5, color: colors.inkSoft, fontWeight: '600' },
  rangoTextActive: { color: '#fff' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  summaryCard: { width: '48%', backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 12 },
  summaryLabel: { fontSize: 11, color: colors.inkSoft, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: colors.ink },
  card: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 14, marginBottom: 14 },
  cardTitle: { fontWeight: '700', fontSize: 14, color: colors.ink, marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: 9, fontSize: 13, color: colors.ink, backgroundColor: '#fff' },
  label: { fontSize: 11, color: colors.inkSoft, marginBottom: 4, fontWeight: '600' },
  disabledInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 9, backgroundColor: colors.paper },
  disabledInputText: { fontSize: 13, color: colors.inkSoft },
  diffText: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  btnSuccess: { backgroundColor: colors.success, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnSuccessText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnDanger: { backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnDangerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  hint: { fontSize: 12.5, color: colors.inkSoft },
  movRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8 },
  movConcepto: { fontSize: 13, color: colors.ink },
  movFecha: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  movMonto: { fontWeight: '700', fontSize: 13 },
  deleteBtn: { color: colors.danger, fontSize: 14, paddingHorizontal: 2 },
  cierreRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  cierreTitle: { fontWeight: '700', fontSize: 13, color: colors.ink },
  cierreSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
});
