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
  transferencia: 'Transferencia (Nequi / Daviplata / Bre-B)',
  tarjeta: 'Tarjeta (Débito / Crédito / Datáfono)',
  nequi: 'Transferencia (Nequi / Bre-B)',
}

export const TIPOS_PRODUCTO = {
  venta: 'Venta al cliente',
  consumo_interno: 'Insumos / Consumo interno',
  herramienta: 'Equipos, Máquinas y Dotación',
}

export const CATEGORIAS_INVENTARIO = {
  venta: { key: 'venta', label: 'Venta al Cliente', emoji: '🛍️', desc: 'Ceras, minoxidil, fijadores, pomadas' },
  insumo: { key: 'insumo', label: 'Insumos y Cuchillas', emoji: '🪒', desc: 'Cuchillas, papel cuello, alcohol, talco' },
  esmalte: { key: 'esmalte', label: 'Esmaltes y Uñas', emoji: '💅', desc: 'Esmaltes Masglo, acrílicos, tips, limas' },
  dotacion: { key: 'dotacion', label: 'Prendas y Dotación', emoji: '🥼', desc: 'Capas de corte, delantales, toallas' },
  maquina: { key: 'maquina', label: 'Máquinas y Equipos', emoji: '⚡', desc: 'Clippers Wahl, patilleras, secadores, lámparas' },
}

export const PROVEEDORES_DEFAULT = [
  'Wahl Professional',
  'Babyliss Pro',
  'Dorco / Super-Max (Cuchillas)',
  'Masglo Cosméticos',
  'Reuzel Grooming',
  'Barber Pro Supply',
  'Distribuidora Belleza Total',
]

export const SERVICIOS_EXTRAS_COMUNES = [
  { id: 'extra_cejas', nombre: '+ Cejas', precio: 5000 },
  { id: 'extra_barba', nombre: '+ Barba y Perfilado', precio: 15000 },
  { id: 'extra_cejas_barba', nombre: '+ Cejas y Barba', precio: 20000 },
]

// Horario visible en la agenda (9:00 AM a 9:00 PM)
export const HORARIO = { inicio: 9, fin: 21 }
export const SLOT_MIN = 15
// Huecos (tiempos muertos) mínimos a resaltar en la agenda
export const MIN_TIEMPO_MUERTO = 30
// Alerta de inventario por defecto
export const STOCK_MINIMO_DEFAULT = 5

export const DIAS_SEMANA = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' },
]

export const REDES_SOCIALES = {
  instagram: 'https://instagram.com/elitebarberstudio',
  tiktok: 'https://tiktok.com/@elitebarberstudio',
  facebook: 'https://facebook.com/elitebarberstudio',
  whatsapp: 'https://wa.me/573124614214',
  telefono: '+57 312 461 4214',
}
