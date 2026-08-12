import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { listenVentasEnRango } from './firestore';
import { useApp } from './AppContext';
import { money } from './format';
import { colors, radius } from './theme';
import { WIMPY_LOGO_BASE64 } from './logo';

const RANGOS = { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' };

function rangoFechas(rango) {
  const now = new Date();
  let start;
  if (rango === 'hoy') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (rango === 'semana') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start, end };
}

export default function ReportesScreen() {
  const { config } = useApp();
  const [rango, setRango] = useState('hoy');
  const [ventas, setVentas] = useState([]);
  const { start, end } = useMemo(() => rangoFechas(rango), [rango]);

  useEffect(() => {
    const unsub = listenVentasEnRango(start, end, setVentas);
    return unsub;
  }, [rango]);

  const total = ventas.reduce((s, v) => s + v.total, 0);
  const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  ventas.forEach((v) => { porMetodo[v.metodoPago || 'efectivo'] += v.total; });

  const porTipo = { local: 0, domicilio: 0 };
  ventas.forEach((v) => { porTipo[v.tipoPedido || 'local'] += v.total; });

  // Producto más vendidos (por cantidad)
  const productoMap = {};
  ventas.forEach((v) => {
    v.items.forEach((it) => {
      if (!productoMap[it.nombre]) productoMap[it.nombre] = { cantidad: 0, total: 0 };
      productoMap[it.nombre].cantidad += it.cantidad;
      productoMap[it.nombre].total += it.precio * it.cantidad;
    });
  });
  const topProductos = Object.entries(productoMap)
    .map(([nombre, d]) => ({ nombre, ...d }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8);

  // Ventas por día (para el rango de semana/mes)
  const porDia = {};
  ventas.forEach((v) => {
    const d = new Date(v.fechaISO);
    const key = d.toLocaleDateString('es-GT', { weekday: 'short', day: '2-digit' });
    porDia[key] = (porDia[key] || 0) + v.total;
  });
  const diasOrdenados = Object.entries(porDia);
  const maxDia = Math.max(1, ...diasOrdenados.map(([, v]) => v));

  const promedioPorVenta = ventas.length ? total / ventas.length : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14 }}>
      <Text style={styles.title}>REPORTES</Text>
      <Text style={styles.subtitle}>Resumen de ventas por periodo</Text>

      <View style={styles.rangoRow}>
        {Object.entries(RANGOS).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.rangoBtn, rango === key && styles.rangoBtnActive]} onPress={() => setRango(key)}>
            <Text style={[styles.rangoText, rango === key && styles.rangoTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => exportarPDF({ ventas, total, porMetodo, porTipo, topProductos }, rango, config)}
        >
          <Text style={styles.exportBtnText}>📄 Exportar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => exportarExcel(ventas, rango)}>
          <Text style={styles.exportBtnText}>📊 Exportar Excel</Text>
        </TouchableOpacity>
      </View>

      {/* Totales grandes */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Ventas totales</Text>
        <Text style={styles.heroValue}>{money(total)}</Text>
        <Text style={styles.heroSub}>{ventas.length} venta(s) · promedio {money(promedioPorVenta)}</Text>
      </View>

      {/* Por método de pago */}
      <Text style={styles.sectionLabel}>POR MÉTODO DE PAGO</Text>
      <View style={styles.row3}>
        <View style={styles.miniCard}>
          <Text style={styles.miniIcon}>💵</Text>
          <Text style={styles.miniValue}>{money(porMetodo.efectivo)}</Text>
          <Text style={styles.miniLabel}>Efectivo</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniIcon}>💳</Text>
          <Text style={styles.miniValue}>{money(porMetodo.tarjeta)}</Text>
          <Text style={styles.miniLabel}>Tarjeta</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniIcon}>🏦</Text>
          <Text style={styles.miniValue}>{money(porMetodo.transferencia)}</Text>
          <Text style={styles.miniLabel}>Depósito</Text>
        </View>
      </View>

      {/* Por tipo de pedido */}
      <Text style={styles.sectionLabel}>POR TIPO DE PEDIDO</Text>
      <View style={styles.row3}>
        <View style={[styles.miniCard, { flex: 1 }]}>
          <Text style={styles.miniIcon}>🍽️</Text>
          <Text style={styles.miniValue}>{money(porTipo.local)}</Text>
          <Text style={styles.miniLabel}>Para comer aquí</Text>
        </View>
        <View style={[styles.miniCard, { flex: 1 }]}>
          <Text style={styles.miniIcon}>🛵</Text>
          <Text style={styles.miniValue}>{money(porTipo.domicilio)}</Text>
          <Text style={styles.miniLabel}>A domicilio</Text>
        </View>
      </View>

      {/* Ventas por día (solo si hay más de un día) */}
      {diasOrdenados.length > 1 && (
        <>
          <Text style={styles.sectionLabel}>VENTAS POR DÍA</Text>
          <View style={styles.card}>
            {diasOrdenados.map(([dia, val]) => (
              <View key={dia} style={styles.barRow}>
                <Text style={styles.barLabel}>{dia}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(val / maxDia) * 100}%` }]} />
                </View>
                <Text style={styles.barValue}>{money(val)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Top productos */}
      <Text style={styles.sectionLabel}>PRODUCTOS MÁS VENDIDOS</Text>
      <View style={styles.card}>
        {topProductos.length === 0 ? (
          <Text style={styles.hint}>Sin ventas en este periodo.</Text>
        ) : (
          topProductos.map((p, idx) => (
            <View key={p.nombre} style={styles.prodRow}>
              <Text style={styles.prodRank}>{idx + 1}</Text>
              <Text style={styles.prodNombre} numberOfLines={1}>{p.nombre}</Text>
              <Text style={styles.prodCantidad}>{p.cantidad}×</Text>
              <Text style={styles.prodTotal}>{money(p.total)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportarExcel(ventas, rango) {
  if (ventas.length === 0) { Alert.alert('Sin datos', 'No hay ventas en este periodo para exportar.'); return; }
  const filas = [
    ['Fecha', 'Hora', 'Platillos', 'Método de pago', 'Tipo de pedido', 'Total'],
    ...ventas.map((v) => {
      const d = new Date(v.fechaISO);
      return [
        d.toLocaleDateString('es-GT'),
        d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        v.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(' | '),
        v.metodoPago,
        v.tipoPedido,
        v.total.toFixed(2),
      ];
    }),
  ];
  const csv = filas.map((f) => f.map(csvEscape).join(',')).join('\n');
  const uri = FileSystem.documentDirectory + `reporte_${rango}_${Date.now()}.csv`;
  try {
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Guardar reporte (Excel/CSV)' });
    }
  } catch (e) {
    Alert.alert('No se pudo exportar', 'Intenta de nuevo.');
  }
}

async function exportarPDF(datos, rango, config) {
  const { ventas, total, porMetodo, porTipo, topProductos } = datos;
  if (ventas.length === 0) { Alert.alert('Sin datos', 'No hay ventas en este periodo para exportar.'); return; }
  const filasProductos = topProductos.map((p, i) => `
    <tr>
      <td style="padding:4px;">${i + 1}</td>
      <td style="padding:4px;">${p.nombre}</td>
      <td style="padding:4px;text-align:right;">${p.cantidad}</td>
      <td style="padding:4px;text-align:right;">${money(p.total)}</td>
    </tr>`).join('');
  const html = `
    <html><body style="font-family:Helvetica,Arial,sans-serif; padding:24px; color:#111;">
      <div style="text-align:center; margin-bottom:8px;"><img src="${WIMPY_LOGO_BASE64}" style="width:100px;"/></div>
      <h2 style="text-align:center; margin:4px 0;">${config.nombre || 'WIMPY'} — Reporte de ventas (${RANGOS[rango]})</h2>
      <p style="text-align:center; color:#555; margin-top:0;">Generado el ${new Date().toLocaleString('es-GT')}</p>
      <h3>Resumen</h3>
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:4px;">Ventas totales</td><td style="padding:4px;text-align:right;font-weight:bold;">${money(total)} (${ventas.length} ventas)</td></tr>
        <tr><td style="padding:4px;">💵 Efectivo</td><td style="padding:4px;text-align:right;">${money(porMetodo.efectivo)}</td></tr>
        <tr><td style="padding:4px;">💳 Tarjeta</td><td style="padding:4px;text-align:right;">${money(porMetodo.tarjeta)}</td></tr>
        <tr><td style="padding:4px;">🏦 Depósito</td><td style="padding:4px;text-align:right;">${money(porMetodo.transferencia)}</td></tr>
        <tr><td style="padding:4px;">🍽️ Para comer aquí</td><td style="padding:4px;text-align:right;">${money(porTipo.local)}</td></tr>
        <tr><td style="padding:4px;">🛵 A domicilio</td><td style="padding:4px;text-align:right;">${money(porTipo.domicilio)}</td></tr>
      </table>
      <h3>Productos más vendidos</h3>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="background:#111;color:#fff;"><td style="padding:4px;">#</td><td style="padding:4px;">Producto</td><td style="padding:4px;text-align:right;">Cant.</td><td style="padding:4px;text-align:right;">Total</td></tr>
        ${filasProductos}
      </table>
    </body></html>`;
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar reporte (PDF)' });
    }
  } catch (e) {
    Alert.alert('No se pudo exportar', 'Intenta de nuevo.');
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.inkSoft, fontSize: 13, marginBottom: 14 },
  rangoRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rangoBtn: { flex: 1, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  rangoBtnActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  rangoText: { fontSize: 12.5, color: colors.inkSoft, fontWeight: '600' },
  rangoTextActive: { color: '#fff' },
  exportRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  exportBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  exportBtnText: { fontSize: 12.5, color: colors.primary, fontWeight: '700' },
  heroCard: { backgroundColor: colors.secondary, borderRadius: radius, padding: 18, marginBottom: 6, alignItems: 'center' },
  heroLabel: { color: '#FFE9D2', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  heroValue: { color: '#fff', fontSize: 30, fontWeight: '800' },
  heroSub: { color: '#FFE9D2', fontSize: 12, marginTop: 4, fontWeight: '600' },
  sectionLabel: { fontSize: 11, letterSpacing: 0.5, color: colors.inkSoft, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  row3: { flexDirection: 'row', gap: 8 },
  miniCard: { flex: 1, backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 10, alignItems: 'center' },
  miniIcon: { fontSize: 18, marginBottom: 4 },
  miniValue: { fontWeight: '800', fontSize: 13.5, color: colors.ink },
  miniLabel: { fontSize: 10.5, color: colors.inkSoft, marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 14 },
  hint: { fontSize: 12.5, color: colors.inkSoft },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  barLabel: { width: 46, fontSize: 11, color: colors.inkSoft },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.line, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 6 },
  barValue: { width: 70, textAlign: 'right', fontSize: 11.5, color: colors.ink, fontWeight: '600' },
  prodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8 },
  prodRank: { width: 18, fontSize: 12, color: colors.inkSoft, fontWeight: '700' },
  prodNombre: { flex: 1, fontSize: 13, color: colors.ink },
  prodCantidad: { fontSize: 12, color: colors.secondaryDark, fontWeight: '700' },
  prodTotal: { width: 70, textAlign: 'right', fontSize: 12.5, color: colors.ink, fontWeight: '600' },
});
