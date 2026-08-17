import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { listenVentasEnRango, listenMovimientosEnRango } from './firestore';
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
  const { config, menu } = useApp();
  const [rango, setRango] = useState('hoy');
  const [ventas, setVentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [verTodosProductos, setVerTodosProductos] = useState(false);
  const { start, end } = useMemo(() => rangoFechas(rango), [rango]);

  useEffect(() => {
    const unsubV = listenVentasEnRango(start, end, setVentas);
    const unsubM = listenMovimientosEnRango(start, end, setMovimientos);
    return () => { unsubV(); unsubM(); };
  }, [rango]);

  // Mapa platilloId -> departamento (categoría), para poder agrupar ventas por departamento
  const departamentoPorPlatilloId = useMemo(() => {
    const map = {};
    menu.forEach((p) => { map[p.id] = p.categoria || 'Sin departamento'; });
    return map;
  }, [menu]);

  const total = ventas.reduce((s, v) => s + v.total, 0);
  const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  ventas.forEach((v) => { porMetodo[v.metodoPago || 'efectivo'] += v.total; });

  const porTipo = { local: 0, domicilio: 0 };
  ventas.forEach((v) => { porTipo[v.tipoPedido || 'local'] += v.total; });

  const totalIngresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);
  const movimientosOrdenados = [...movimientos].sort((a, b) => new Date(b.fechaISO) - new Date(a.fechaISO));

  // Por platillo (todos, no solo los más vendidos)
  const productoMap = {};
  ventas.forEach((v) => {
    v.items.forEach((it) => {
      if (!productoMap[it.nombre]) productoMap[it.nombre] = { cantidad: 0, total: 0 };
      productoMap[it.nombre].cantidad += it.cantidad;
      productoMap[it.nombre].total += it.precio * it.cantidad;
    });
  });
  const todosProductos = Object.entries(productoMap)
    .map(([nombre, d]) => ({ nombre, ...d }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const productosMostrados = verTodosProductos ? todosProductos : todosProductos.slice(0, 8);

  // Por departamento (categoría)
  const departamentoMap = {};
  ventas.forEach((v) => {
    v.items.forEach((it) => {
      const depto = departamentoPorPlatilloId[it.platilloId] || 'Sin departamento';
      if (!departamentoMap[depto]) departamentoMap[depto] = { cantidad: 0, total: 0 };
      departamentoMap[depto].cantidad += it.cantidad;
      departamentoMap[depto].total += it.precio * it.cantidad;
    });
  });
  const porDepartamento = Object.entries(departamentoMap)
    .map(([nombre, d]) => ({ nombre, ...d }))
    .sort((a, b) => b.total - a.total);

  // Ventas por día (para el rango de semana/mes)
  const porDia = {};
  ventas.forEach((v) => {
    const d = new Date(v.fechaISO);
    const key = d.toLocaleDateString('es-GT', { weekday: 'short', day: '2-digit' });
    porDia[key] = (porDia[key] || 0) + v.total;
  });
  const diasOrdenados = Object.entries(porDia);
  const maxDia = Math.max(1, ...diasOrdenados.map(([, v]) => v));
  const maxDepto = Math.max(1, ...porDepartamento.map((d) => d.total));

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
          onPress={() => guardarReporteTicket({ ventas, total, porMetodo, porTipo, todosProductos, porDepartamento, totalIngresos, totalEgresos, movimientos: movimientosOrdenados }, rango, config)}
        >
          <Text style={styles.exportBtnText}>📄 Guardar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => imprimirReporte({ ventas, total, porMetodo, porTipo, todosProductos, porDepartamento, totalIngresos, totalEgresos, movimientos: movimientosOrdenados }, rango, config)}
        >
          <Text style={styles.exportBtnText}>🖨 Imprimir</Text>
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

      {/* Ingresos y egresos de caja */}
      <Text style={styles.sectionLabel}>INGRESOS Y EGRESOS DE CAJA</Text>
      <View style={styles.row3}>
        <View style={styles.miniCard}>
          <Text style={styles.miniIcon}>💰</Text>
          <Text style={[styles.miniValue, { color: colors.success }]}>+{money(totalIngresos)}</Text>
          <Text style={styles.miniLabel}>Ingresos</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniIcon}>💸</Text>
          <Text style={[styles.miniValue, { color: colors.danger }]}>−{money(totalEgresos)}</Text>
          <Text style={styles.miniLabel}>Egresos</Text>
        </View>
      </View>
      {movimientos.length === 0 ? (
        <Text style={[styles.hint, { marginTop: 8 }]}>Sin ingresos ni pagos registrados en este periodo (se agregan desde la pestaña Caja).</Text>
      ) : (
        <View style={[styles.card, { marginTop: 10 }]}>
          {movimientosOrdenados.map((m) => (
            <View key={m.id} style={styles.movRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.movConcepto}>{m.tipo === 'ingreso' ? '💰' : '💸'} {m.concepto}</Text>
                <Text style={styles.movFecha}>{new Date(m.fechaISO).toLocaleString('es-GT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={[styles.movMonto, { color: m.tipo === 'ingreso' ? colors.success : colors.danger }]}>
                {m.tipo === 'ingreso' ? '+' : '−'}{money(m.monto)}
              </Text>
            </View>
          ))}
        </View>
      )}

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

      {/* Por departamento */}
      <Text style={styles.sectionLabel}>VENTAS POR DEPARTAMENTO</Text>
      <View style={styles.card}>
        {porDepartamento.length === 0 ? (
          <Text style={styles.hint}>Sin ventas en este periodo. Los departamentos se toman de la "Categoría" que le pusiste a cada platillo en Menú.</Text>
        ) : (
          porDepartamento.map((d) => (
            <View key={d.nombre} style={styles.barRow}>
              <Text style={[styles.barLabel, { width: 100 }]} numberOfLines={1}>{d.nombre}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(d.total / maxDepto) * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={styles.barValue}>{money(d.total)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Por platillo */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
        <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>VENTAS POR PLATILLO</Text>
        {todosProductos.length > 8 && (
          <TouchableOpacity onPress={() => setVerTodosProductos((v) => !v)}>
            <Text style={styles.verTodosText}>{verTodosProductos ? 'Ver menos' : `Ver todos (${todosProductos.length})`}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.card}>
        {productosMostrados.length === 0 ? (
          <Text style={styles.hint}>Sin ventas en este periodo.</Text>
        ) : (
          productosMostrados.map((p, idx) => (
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

function reporteTicketHtml(datos, rango, config) {
  const { total, porDepartamento, todosProductos, totalIngresos, totalEgresos, movimientos } = datos;
  const nombreNegocio = (config.nombre || 'WIMPY').toUpperCase();
  const filasDepto = porDepartamento.map((d) => `
    <div style="display:flex; justify-content:space-between; font-size:10.5px; margin:4px 0;">
      <span style="flex:1;">${d.nombre}</span>
      <span style="width:34px; text-align:right;">${d.cantidad} U</span>
      <span style="width:60px; text-align:right;">${money(d.total)}</span>
    </div>`).join('');
  const filasProductos = todosProductos.map((p) => `
    <div style="display:flex; justify-content:space-between; font-size:10.5px; margin:4px 0;">
      <span style="flex:1;">${p.nombre}</span>
      <span style="width:34px; text-align:right;">${p.cantidad} U</span>
      <span style="width:60px; text-align:right;">${money(p.total)}</span>
    </div>`).join('');
  const filasMovimientos = movimientos.map((m) => `
    <div style="display:flex; justify-content:space-between; font-size:10.5px; margin:4px 0;">
      <span style="flex:1;">${m.tipo === 'ingreso' ? '💰' : '💸'} ${m.concepto}</span>
      <span style="width:60px; text-align:right;">${m.tipo === 'ingreso' ? '+' : '−'}${money(m.monto)}</span>
    </div>`).join('');

  return `
  <html>
  <head>
    <style>
      @page { size: 57mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { width: 54mm; margin: 0 auto; padding: 6px 5px 14px; font-family: Helvetica, Arial, sans-serif; color: #111; }
      .center { text-align: center; }
      .dashed { border-top: 1.5px dashed #111; margin: 8px 0; }
    </style>
  </head>
  <body>
    <div class="center" style="margin-bottom:6px;">
      <img src="${WIMPY_LOGO_BASE64}" style="width:100px; height:auto;" />
    </div>
    <div class="center" style="font-size:12px; font-weight:800;">${nombreNegocio}</div>
    <div class="center" style="font-size:10px; font-weight:700; margin-top:2px;">REPORTE DE VENTAS · ${RANGOS[rango].toUpperCase()}</div>
    <div class="center" style="font-size:9px; color:#555; margin-top:2px;">Generado el ${new Date().toLocaleString('es-GT')}</div>

    <div class="dashed"></div>
    <div style="font-size:10px; font-weight:800; margin-bottom:4px;">POR DEPARTAMENTO</div>
    ${filasDepto || '<div style="font-size:10px;color:#777;">Sin ventas</div>'}

    <div class="dashed"></div>
    <div style="font-size:10px; font-weight:800; margin-bottom:4px;">POR PLATILLO</div>
    ${filasProductos || '<div style="font-size:10px;color:#777;">Sin ventas</div>'}

    <div class="dashed"></div>
    <div style="font-size:10px; font-weight:800; margin-bottom:4px;">INGRESOS Y EGRESOS</div>
    <div style="display:flex; justify-content:space-between; font-size:10.5px; margin:4px 0;"><span>Ingresos</span><span>+${money(totalIngresos)}</span></div>
    <div style="display:flex; justify-content:space-between; font-size:10.5px; margin:4px 0;"><span>Egresos</span><span>−${money(totalEgresos)}</span></div>
    ${filasMovimientos ? `<div style="margin-top:4px;">${filasMovimientos}</div>` : ''}

    <div class="dashed"></div>
    <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:800;">
      <span>TOTAL VENTAS:</span><span>${money(total)}</span>
    </div>

    <div class="center" style="font-size:9px; margin-top:14px; letter-spacing:0.5px;">— — — FIN DEL REPORTE — — —</div>
  </body>
  </html>`;
}

async function guardarReporteTicket(datos, rango, config) {
  if (datos.ventas.length === 0) { Alert.alert('Sin datos', 'No hay ventas en este periodo para exportar.'); return; }
  try {
    const { uri } = await Print.printToFileAsync({ html: reporteTicketHtml(datos, rango, config), width: 162 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar reporte' });
    }
  } catch (e) {
    Alert.alert('No se pudo exportar', String(e?.message || e));
  }
}

async function imprimirReporte(datos, rango, config) {
  if (datos.ventas.length === 0) { Alert.alert('Sin datos', 'No hay ventas en este periodo para imprimir.'); return; }
  try {
    await Print.printAsync({ html: reporteTicketHtml(datos, rango, config), width: 162 });
  } catch (e) {
    Alert.alert('No se pudo imprimir', String(e?.message || e));
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
  verTodosText: { fontSize: 12, color: colors.secondaryDark, fontWeight: '700' },
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
  movRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8 },
  movConcepto: { fontSize: 13, color: colors.ink },
  movFecha: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  movMonto: { fontWeight: '700', fontSize: 13 },
});
