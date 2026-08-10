export function money(n) {
  const v = Math.round((n || 0) * 100) / 100;
  return 'Q ' + v.toFixed(2);
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function pad(n) {
  return n.toString().padStart(2, '0');
}

export function isoDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function monthKey(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}

export function sameDay(d1, d2) {
  return isoDate(d1) === isoDate(d2);
}

export function todayLabel() {
  const now = new Date();
  const txt = now.toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const METODOS = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  tarjeta: { label: 'Tarjeta', icon: '💳' },
  transferencia: { label: 'Depósito', icon: '🏦' },
};

export const TIPOS_PEDIDO = {
  local: { label: 'Para comer aquí', icon: '🍽️' },
  domicilio: { label: 'A domicilio', icon: '🛵' },
};

export const UNIDADES = [
  'unidad', 'kg', 'g', 'l', 'ml', 'libra', 'onza', 'paquete', 'porción',
];
