import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image,
} from 'react-native';
import * as Print from 'expo-print';
import { useApp } from './AppContext';
import { cobrarVenta, listenVentasEnRango } from './firestore';
import { money, round2, METODOS, TIPOS_PEDIDO } from './format';
import { colors, radius } from './theme';
import { WIMPY_LOGO_BASE64 } from './logo';function ticketHtml(venta, config) {
  const fecha = new Date(venta.fechaISO);
  const fechaTxt = fecha.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaTxt = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const metodo = METODOS[venta.metodoPago] || METODOS.efectivo;
  const tipo = TIPOS_PEDIDO[venta.tipoPedido] || TIPOS_PEDIDO.local;
  const nombreNegocio = (config.nombre || 'WIMPY').toUpperCase();
  const mensajeBienvenida = config.ticketMensaje || '¡Gracias por su visita!';

  const filas = venta.items.map((it) => `
    <tr>
      <td style="padding:3px 0;font-size:10.5px;vertical-align:top;">${it.cantidad}</td>
      <td style="padding:3px 0;font-size:10.5px;vertical-align:top;">${it.nombre}</td>
      <td style="padding:3px 0;font-size:10.5px;text-align:right;vertical-align:top;">${money(it.precio)}</td>
      <td style="padding:3px 0;font-size:10.5px;text-align:right;vertical-align:top;">${money(it.precio * it.cantidad)}</td>
    </tr>`).join('');

  return `
  <html>
  <head>
    <style>
      @page { size: 57mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { width: 54mm; margin: 0 auto; padding: 6px 5px 14px; font-family: Helvetica, Arial, sans-serif; color: #111; }
      .center { text-align: center; }
      .dashed { border-top: 1.5px dashed #111; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; }
    </style>
  </head>
  <body>
    <div class="center" style="margin-bottom:6px;">
      <img src="${WIMPY_LOGO_BASE64}" style="width:120px; height:auto;" />
    </div>

    <div class="center" style="font-size:10px; font-weight:700; margin-bottom:6px;">
      ★ ${mensajeBienvenida.toUpperCase()} ★
    </div>

    <div class="dashed"></div>

    <div class="center" style="font-size:12px; font-weight:800; margin-bottom:2px;">${nombreNegocio}</div>
    ${config.ticketDireccion ? `<div class="center" style="font-size:9.5px;">📍 ${config.ticketDireccion}</div>` : ''}
    ${config.ticketTelefono ? `<div class="center" style="font-size:9.5px; margin-top:2px;">📞 ${config.ticketTelefono}</div>` : ''}

    <div class="dashed"></div>

    <table style="font-size:9.5px;">
      <tr><td>Fecha:</td><td style="text-align:right;">${fechaTxt}</td></tr>
      <tr><td>Hora:</td><td style="text-align:right;">${horaTxt}</td></tr>
      <tr><td>No. de ticket:</td><td style="text-align:right;">${(venta.id || '').slice(-6).toUpperCase()}</td></tr>
    </table>

    <div class="dashed"></div>

    <table>
      <thead>
        <tr style="background:#111; color:#fff;">
          <td style="padding:3px 0 3px 3px; font-size:9px; font-weight:700;">CANT.</td>
          <td style="padding:3px 0; font-size:9px; font-weight:700;">DESCRIPCIÓN</td>
          <td style="padding:3px 0; font-size:9px; font-weight:700; text-align:right;">PRECIO</td>
          <td style="padding:3px 3px 3px 0; font-size:9px; font-weight:700; text-align:right;">TOTAL</td>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>

    <div class="dashed"></div>

    <table style="font-size:10.5px;">
      <tr><td>Subtotal:</td><td style="text-align:right;">${money(venta.total)}</td></tr>
      <tr><td>Descuento:</td><td style="text-align:right;">${money(0)}</td></tr>
    </table>
    <table style="margin-top:4px;">
      <tr>
        <td style="font-size:14px; font-weight:800;">TOTAL:</td>
        <td style="font-size:14px; font-weight:800; text-align:right;">${money(venta.total)}</td>
      </tr>
    </table>

    <table style="font-size:9.5px; margin-top:6px; color:#333;">
      <tr><td>Forma de pago:</td><td style="text-align:right;">${metodo.icon} ${metodo.label}</td></tr>
      <tr><td>Pedido:</td><td style="text-align:right;">${tipo.icon} ${tipo.label}</td></tr>
    </table>
    ${venta.nota ? `<div style="font-size:9.5px; margin-top:4px;">📍 ${venta.nota}</div>` : ''}

    <div style="border:1.5px dashed #111; border-radius:6px; padding:8px 4px; margin-top:12px; text-align:center;">
      <div style="font-size:10px; font-weight:800;">¡GRACIAS POR PREFERIRNOS!</div>
      <div style="font-size:10.5px; font-style:italic; margin-top:2px;">Buen provecho</div>
    </div>

    <div class="center" style="font-size:9px; margin-top:10px; letter-spacing:0.5px;">— — — VUELVA PRONTO — — —</div>
  </body>
  </html>`;
}

async function imprimirTicket(venta, config) {
  try {
    await Print.printAsync({ html: ticketHtml(venta, config), width: 162 });
  } catch (e) {
    Alert.alert('No se pudo imprimir', 'Intenta de nuevo.');
  }
}

export default function VenderScreen() {
  const { menu, insumos, config, setRole } = useApp();
  const [ticket, setTicket] = useState([]); // [{platilloId, nombre, precio, cantidad}]
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [tipoPedido, setTipoPedido] = useState('local');
  const [nota, setNota] = useState('');
  const [cobrando, setCobrando] = useState(false);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [lastVenta, setLastVenta] = useState(null);
  const [modo, setModo] = useState('menu'); // 'menu' | 'carrito'

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const unsub = listenVentasEnRango(start, end, setVentasHoy);
    return unsub;
  }, []);

  const categorias = useMemo(() => {
    const map = {};
    menu.forEach((p) => {
      const c = p.categoria || 'Otros';
      if (!map[c]) map[c] = [];
      map[c].push(p);
    });
    return map;
  }, [menu]);

  const total = ticket.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const totalHoy = ventasHoy.reduce((s, v) => s + v.total, 0);
  const porMetodoHoy = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  ventasHoy.forEach((v) => {
    porMetodoHoy[v.metodoPago || 'efectivo'] += v.total;
  });

  function addItem(platillo) {
    setTicket((prev) => {
      const existing = prev.find((i) => i.platilloId === platillo.id);
      if (existing) {
        return prev.map((i) =>
          i.platilloId === platillo.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { platilloId: platillo.id, nombre: platillo.nombre, precio: platillo.precio, cantidad: 1 }];
    });
  }

  function changeQty(id, delta) {
    setTicket((prev) => {
      return prev
        .map((i) => (i.platilloId === id ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0);
    });
  }

  function removeItem(id) {
    setTicket((prev) => prev.filter((i) => i.platilloId !== id));
  }

  async function handleCobrar() {
    if (ticket.length === 0 || cobrando) return;
    setCobrando(true);
    const nuevaVenta = {
      fechaISO: new Date().toISOString(),
      items: ticket.map((i) => ({ ...i })),
      total: round2(total),
      metodoPago,
      tipoPedido,
      nota: tipoPedido === 'domicilio' ? nota.trim() : '',
    };
    try {
      const { id, stockBajo } = await cobrarVenta(nuevaVenta, menu);
      const ventaConId = { ...nuevaVenta, id };
      setTicket([]);
      setNota('');
      setLastVenta(ventaConId);
      if (stockBajo.length) {
        const unicos = [...new Set(stockBajo)];
        setTimeout(() => Alert.alert('Stock bajo', 'Atención: stock bajo o agotado de: ' + unicos.join(', ')), 300);
      }
      Alert.alert(
        'Venta cobrada',
        `Total: ${money(nuevaVenta.total)}`,
        [
          { text: 'Cerrar', style: 'cancel' },
          { text: '🖨 Imprimir ticket', onPress: () => imprimirTicket(ventaConId, config) },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la venta. Intenta de nuevo.');
    } finally {
      setCobrando(false);
    }
  }

  const totalItems = ticket.reduce((s, i) => s + i.cantidad, 0);

  // ─────────────────────────── VISTA: MENÚ (elegir platillos) ───────────────────────────
  if (modo === 'menu') {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: totalItems > 0 ? 90 : 20 }}>
          <Text style={styles.title}>VENDER</Text>
          <Text style={styles.subtitle}>Toca los platillos para agregarlos al carrito.</Text>

          {menu.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: colors.inkSoft }}>
                Todavía no tienes platillos registrados. Agrégalos en la pestaña Menú.
              </Text>
            </View>
          ) : (
            Object.keys(categorias).map((cat) => (
              <View key={cat} style={{ marginBottom: 4 }}>
                <Text style={styles.categoryLabel}>{cat.toUpperCase()}</Text>
                <View style={styles.dishGrid}>
                  {categorias[cat].map((p) => (
                    <TouchableOpacity key={p.id} style={styles.dishBtn} onPress={() => addItem(p)}>
                      {p.imagenUrl ? (
                        <Image source={{ uri: p.imagenUrl }} style={styles.dishImage} />
                      ) : (
                        <View style={[styles.dishImage, styles.dishImagePlaceholder]}>
                          <Text style={{ fontSize: 22 }}>🍽️</Text>
                        </View>
                      )}
                      <Text style={styles.dishName} numberOfLines={2}>{p.nombre}</Text>
                      <Text style={styles.dishPrice}>{money(p.precio)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}

          {/* Resumen de hoy */}
          <View style={styles.todayCard}>
            <Text style={styles.todayTitle}>Ventas de hoy · {money(totalHoy)}</Text>
            <View style={styles.cajaChica}>
              <Text style={styles.cajaChicaText}>💵 Efectivo hoy: {money(porMetodoHoy.efectivo)}</Text>
              <Text style={styles.cajaChicaSub}>💳 Tarjeta: {money(porMetodoHoy.tarjeta)}   🏦 Depósito: {money(porMetodoHoy.transferencia)}</Text>
            </View>
            {ventasHoy.length === 0 ? (
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>Aún no registras ventas hoy.</Text>
            ) : (
              ventasHoy.slice(0, 8).map((v) => (
                <TouchableOpacity key={v.id} style={styles.miniTicket} onPress={() => imprimirTicket(v, config)}>
                  <View style={styles.miniTicketTop}>
                    <Text style={styles.miniTicketMeta}>
                      {new Date(v.fechaISO).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.miniTicketMeta}>{METODOS[v.metodoPago]?.icon}</Text>
                      <Text style={styles.printIcon}>🖨</Text>
                    </View>
                  </View>
                  <Text style={styles.miniTicketItems} numberOfLines={2}>
                    {v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}
                  </Text>
                  <Text style={styles.miniTicketTotal}>{money(v.total)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <TouchableOpacity style={{ alignItems: 'center', marginTop: 20, marginBottom: 10 }} onPress={() => setRole(null)}>
            <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 12.5 }}>Cambiar de usuario</Text>
          </TouchableOpacity>
        </ScrollView>

        {totalItems > 0 && (
          <TouchableOpacity style={styles.floatingCartBar} onPress={() => setModo('carrito')}>
            <Text style={styles.floatingCartText}>🛒 Ir al carrito ({totalItems})</Text>
            <Text style={styles.floatingCartTotal}>{money(total)}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ─────────────────────────── VISTA: CARRITO (cobrar) ───────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 14 }}>
      <TouchableOpacity onPress={() => setModo('menu')} style={styles.backRow}>
        <Text style={styles.backText}>‹ Volver al menú</Text>
      </TouchableOpacity>

      <Text style={styles.title}>CARRITO</Text>
      <Text style={styles.subtitle}>Revisa la comanda, elige la forma de pago y cobra.</Text>

      <View style={styles.ticketCard}>
        <Text style={styles.ticketTitle}>Comanda actual</Text>
        {ticket.length === 0 ? (
          <Text style={styles.ticketEmpty}>Toca un platillo para agregarlo</Text>
        ) : (
          ticket.map((item) => (
            <View key={item.platilloId} style={styles.ticketLine}>
              <Text style={styles.ticketLineName} numberOfLines={1}>{item.nombre}</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.platilloId, -1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{item.cantidad}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(item.platilloId, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.lineTotal}>{money(item.precio * item.cantidad)}</Text>
              <TouchableOpacity onPress={() => removeItem(item.platilloId)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{money(total)}</Text>
        </View>

        <View style={styles.metodoRow}>
          {Object.entries(TIPOS_PEDIDO).map(([key, t]) => (
            <TouchableOpacity
              key={key}
              style={[styles.metodoBtn, tipoPedido === key && styles.metodoBtnActive]}
              onPress={() => setTipoPedido(key)}
            >
              <Text style={styles.metodoIcon}>{t.icon}</Text>
              <Text style={[styles.metodoLabel, tipoPedido === key && styles.metodoLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tipoPedido === 'domicilio' && (
          <TextInput
            style={styles.input}
            placeholder="Dirección / referencia de entrega (opcional)"
            value={nota}
            onChangeText={setNota}
          />
        )}

        <View style={styles.metodoRow}>
          {Object.entries(METODOS).map(([key, m]) => (
            <TouchableOpacity
              key={key}
              style={[styles.metodoBtn, metodoPago === key && styles.metodoBtnActive]}
              onPress={() => setMetodoPago(key)}
            >
              <Text style={styles.metodoIcon}>{m.icon}</Text>
              <Text style={[styles.metodoLabel, metodoPago === key && styles.metodoLabelActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.chargeBtn, (ticket.length === 0 || cobrando) && styles.chargeBtnDisabled]}
          disabled={ticket.length === 0 || cobrando}
          onPress={async () => { await handleCobrar(); setModo('menu'); }}
        >
          <Text style={styles.chargeBtnText}>{cobrando ? 'Guardando…' : 'COBRAR VENTA'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: 0.5 },
  subtitle: { color: colors.inkSoft, fontSize: 13, marginBottom: 14 },
  empty: { padding: 24, borderWidth: 1, borderColor: colors.lineStrong, borderStyle: 'dashed', borderRadius: radius, alignItems: 'center' },
  categoryLabel: { fontSize: 11, letterSpacing: 1, color: colors.teal, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  dishGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dishBtn: {
    width: '31%', backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.lineStrong,
    borderRadius: 8, padding: 10, marginBottom: 8,
  },
  dishName: { fontWeight: '600', fontSize: 12.5, color: colors.ink, marginBottom: 4 },
  dishPrice: { fontSize: 12.5, color: colors.amberDark, fontWeight: '600' },
  dishImage: { width: '100%', height: 64, borderRadius: 6, marginBottom: 6, backgroundColor: colors.line },
  dishImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

  floatingCartBar: {
    position: 'absolute', left: 14, right: 14, bottom: 14, backgroundColor: colors.ink,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000',
    shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  floatingCartText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  floatingCartTotal: { color: colors.accent, fontWeight: '800', fontSize: 15.5 },
  backRow: { marginBottom: 4 },
  backText: { color: colors.secondaryDark, fontWeight: '700', fontSize: 13.5 },

  ticketCard: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 14, marginTop: 20 },
  ticketTitle: { fontWeight: '700', fontSize: 15, color: colors.ink, marginBottom: 6 },
  ticketEmpty: { color: colors.inkSoft, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  ticketLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 6 },
  ticketLineName: { flex: 1, fontSize: 13.5, color: colors.ink },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 15, color: colors.ink },
  qtyNum: { fontSize: 13, minWidth: 16, textAlign: 'center', color: colors.ink },
  lineTotal: { width: 60, textAlign: 'right', fontSize: 13, color: colors.ink },
  removeBtn: { color: colors.rust, fontSize: 16, paddingHorizontal: 4 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTopWidth: 2, borderTopColor: colors.ink },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.ink },
  totalValue: { fontSize: 18, fontWeight: '800', color: colors.ink },

  metodoRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  metodoBtn: { flex: 1, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  metodoBtnActive: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  metodoIcon: { fontSize: 16 },
  metodoLabel: { fontSize: 11, color: colors.inkSoft, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  metodoLabelActive: { color: colors.teal },

  input: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: 9, marginTop: 8, fontSize: 13, color: colors.ink },

  chargeBtn: { backgroundColor: colors.secondary, borderRadius: 8, padding: 13, marginTop: 14, alignItems: 'center' },
  chargeBtnDisabled: { backgroundColor: colors.lineStrong },
  chargeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

  todayCard: { marginTop: 18 },
  todayTitle: { fontWeight: '700', fontSize: 14, color: colors.ink, marginBottom: 8 },
  cajaChica: { backgroundColor: colors.tealSoft, borderWidth: 1, borderColor: colors.teal, borderRadius: 8, padding: 10, marginBottom: 10 },
  cajaChicaText: { color: colors.teal, fontWeight: '700', fontSize: 12.5 },
  cajaChicaSub: { color: colors.teal, fontSize: 11.5, marginTop: 3 },
  miniTicket: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginBottom: 8 },
  miniTicketTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  miniTicketMeta: { fontSize: 11, color: colors.inkSoft },
  miniTicketItems: { fontSize: 12.5, color: colors.ink, marginBottom: 4 },
  miniTicketTotal: { textAlign: 'right', fontWeight: '700', color: colors.teal },
  printIcon: { fontSize: 13 },
});
