// Configuración de negocio centralizada

export const AREAS = {
  barberia: { key: 'barberia', label: 'Barbería', emoji: '💈' },
  women: { key: 'women', label: 'Zona Women', emoji: '💅' },
}

export const ESTADOS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completada: 'Completada',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
}

export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
}

export const TIPOS_PRODUCTO = {
  venta: 'Venta al cliente',
  consumo_interno: 'Consumo interno',
}

// Horario visible en la agenda (horas en formato 24h)
export const HORARIO = { inicio: 8, fin: 20 }
export const SLOT_MIN = 15
// Huecos (tiempos muertos) mínimos a resaltar en la agenda
export const MIN_TIEMPO_MUERTO = 30
// Alerta de inventario por defecto
export const STOCK_MINIMO_DEFAULT = 5
