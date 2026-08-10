import {
  collection, doc, onSnapshot, setDoc, deleteDoc, addDoc,
  query, where, orderBy, runTransaction, getDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { round2 } from './format';

// ───────────────────────── MENU (platillos) ─────────────────────────
// Documento: { nombre, categoria, precio, receta: [{insumoId, cantidad}] }

export function listenMenu(callback) {
  return onSnapshot(collection(db, 'menu'), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function guardarPlatillo(id, data) {
  if (id) {
    await setDoc(doc(db, 'menu', id), data, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, 'menu'), data);
  return ref.id;
}

export async function eliminarPlatillo(id) {
  await deleteDoc(doc(db, 'menu', id));
}

// ───────────────────────── INSUMOS ─────────────────────────
// Documento: { nombre, unidad, stock, minimo }

export function listenInsumos(callback) {
  return onSnapshot(collection(db, 'insumos'), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function guardarInsumo(id, data) {
  if (id) {
    await setDoc(doc(db, 'insumos', id), data, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, 'insumos'), data);
  return ref.id;
}

export async function eliminarInsumo(id) {
  await deleteDoc(doc(db, 'insumos', id));
}

// ───────────────────────── CONFIG ─────────────────────────
// Un solo documento: config/general

export function listenConfig(callback) {
  return onSnapshot(doc(db, 'config', 'general'), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function guardarConfig(data) {
  await setDoc(doc(db, 'config', 'general'), data, { merge: true });
}

// ───────────────────────── VENTAS ─────────────────────────
// Documento: { fechaISO, items, total, metodoPago, tipoPedido, nota }
// Se guarda una venta y, en la misma transacción, se descuenta el
// inventario de los insumos usados según la receta de cada platillo.

export function listenVentasEnRango(start, end, callback) {
  const q = query(
    collection(db, 'ventas'),
    where('fechaISO', '>=', start.toISOString()),
    where('fechaISO', '<=', end.toISOString()),
    orderBy('fechaISO', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function cobrarVenta(ticket, menu) {
  // 1. Guardar la venta
  const ventaRef = await addDoc(collection(db, 'ventas'), ticket);

  // 2. Descontar inventario según receta (en una transacción, para que
  //    si dos teléfonos venden al mismo tiempo, el stock no se descuadre)
  const insumosAfectados = new Map(); // insumoId -> cantidadADescontar
  ticket.items.forEach((item) => {
    const platillo = menu.find((p) => p.id === item.platilloId);
    if (platillo?.receta?.length) {
      platillo.receta.forEach((ing) => {
        const actual = insumosAfectados.get(ing.insumoId) || 0;
        insumosAfectados.set(ing.insumoId, actual + ing.cantidad * item.cantidad);
      });
    }
  });

  const stockBajo = [];
  if (insumosAfectados.size > 0) {
    await runTransaction(db, async (tx) => {
      for (const [insumoId, cantidad] of insumosAfectados) {
        const ref = doc(db, 'insumos', insumoId);
        const snap = await tx.get(ref);
        if (!snap.exists()) continue;
        const insumo = snap.data();
        const nuevoStock = round2((insumo.stock || 0) - cantidad);
        tx.update(ref, { stock: nuevoStock });
        if (nuevoStock <= (insumo.minimo || 0)) stockBajo.push(insumo.nombre);
      }
    });
  }

  return { id: ventaRef.id, stockBajo };
}

// ───────────────────────── MOVIMIENTOS DE CAJA ─────────────────────────
// Documento: { tipo: 'ingreso'|'egreso', monto, concepto, fechaISO }

export function listenMovimientosEnRango(start, end, callback) {
  const q = query(
    collection(db, 'movimientos'),
    where('fechaISO', '>=', start.toISOString()),
    where('fechaISO', '<=', end.toISOString()),
    orderBy('fechaISO', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function registrarMovimiento(tipo, monto, concepto) {
  await addDoc(collection(db, 'movimientos'), {
    tipo, monto, concepto, fechaISO: new Date().toISOString(),
  });
}

export async function eliminarMovimiento(id) {
  await deleteDoc(doc(db, 'movimientos', id));
}

// ───────────────────────── CIERRES ─────────────────────────

export async function guardarCierre(cierre) {
  await addDoc(collection(db, 'cierres'), cierre);
}

export function listenCierres(callback) {
  const q = query(collection(db, 'cierres'), orderBy('fechaRegistro', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}
