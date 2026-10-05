// Datos de demostración (se generan relativos a la fecha actual)
import { HORARIO } from '../constants'
import { addDays, startOfDay } from '../format'

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

// PRNG determinístico para que la demo sea estable
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const CLIENTES = [
  'Juan Pablo', 'Miguel Ángel', 'Alejandro', 'Diego', 'Nicolás', 'Samuel', 'David', 'Esteban',
  'Tomás', 'Cristian', 'Brayan', 'Jhon', 'Óscar', 'Mauricio', 'Ricardo', 'Fernando',
  'María José', 'Isabella', 'Mariana', 'Gabriela', 'Paula', 'Natalia', 'Juliana', 'Andrea',
  'Carolina', 'Manuela', 'Sara', 'Luisa', 'Ana María', 'Catalina',
]

export function buildSeed() {
  const rand = rng(20261005)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  const barberia = {
    id: uid(),
    nombre: 'Elite Barber Studio',
    suscripcion_activa: true,
    comision_incluye_productos: false,
  }
  const B = barberia.id

  const usuarios = [
    { id: uid(), barberia_id: B, rol: 'admin', nombre: 'Andrea Salazar', email: 'admin@demo.com', area: null, porcentaje_comision: 0, activo: true },
  ]
  const barberos = ['Carlos Méndez', 'Andrés Rojas', 'Julián Torres', 'Santiago Pérez', 'Mateo Gómez', 'Felipe Castro', 'Daniel Ríos', 'Sebastián Vargas', 'Kevin Morales']
  const women = ['Valentina López', 'Camila Herrera', 'Laura Martínez', 'Daniela Ruiz', 'Sofía Ramírez']
  barberos.forEach((n, i) =>
    usuarios.push({
      id: uid(), barberia_id: B, rol: 'empleado', nombre: n, area: 'barberia', activo: true,
      email: `${n.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@demo.com`,
      porcentaje_comision: [40, 45, 50][i % 3],
    }),
  )
  women.forEach((n, i) =>
    usuarios.push({
      id: uid(), barberia_id: B, rol: 'empleado', nombre: n, area: 'women', activo: true,
      email: `${n.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@demo.com`,
      porcentaje_comision: [45, 50][i % 2],
    }),
  )
  usuarios.forEach((u) => (u.password = 'demo123'))

  const s = (nombre, area, precio, duracion_minutos) => ({ id: uid(), barberia_id: B, nombre, area, precio, duracion_minutos, activo: true })
  const servicios = [
    s('Corte clásico', 'barberia', 25000, 30),
    s('Corte + Barba', 'barberia', 35000, 45),
    s('Degradado / Fade', 'barberia', 30000, 45),
    s('Barba perfilada', 'barberia', 15000, 30),
    s('Afeitado con navaja', 'barberia', 20000, 30),
    s('Cejas y diseño', 'barberia', 10000, 15),
    s('Manicure tradicional', 'women', 25000, 45),
    s('Pedicure spa', 'women', 32000, 60),
    s('Uñas acrílicas', 'women', 85000, 120),
    s('Semipermanente', 'women', 45000, 60),
    s('Corte dama', 'women', 40000, 60),
    s('Cepillado', 'women', 35000, 45),
  ]

  const p = (nombre, tipo, stock_actual, precio_compra, precio_venta) => ({ id: uid(), barberia_id: B, nombre, tipo, stock_actual, stock_minimo: 5, precio_compra, precio_venta })
  const inventario = [
    p('Cera mate Reuzel', 'venta', 12, 22000, 42000),
    p('Pomada brillo', 'venta', 4, 18000, 35000),
    p('Aceite para barba', 'venta', 8, 15000, 32000),
    p('Shampoo anticaspa', 'venta', 3, 14000, 28000),
    p('Minoxidil 5%', 'venta', 10, 35000, 60000),
    p('Kit cuidado de uñas', 'venta', 6, 12000, 25000),
    p('Esmalte semipermanente', 'consumo_interno', 22, 9000, 0),
    p('Cuchillas desechables (caja)', 'consumo_interno', 3, 25000, 0),
    p('Talco barbero', 'consumo_interno', 6, 8000, 0),
    p('Toallas desechables', 'consumo_interno', 40, 500, 0),
    p('Acetona pura', 'consumo_interno', 2, 7000, 0),
  ]

  const citas = []
  const caja = []
  const caja_productos = []
  const empleados = usuarios.filter((u) => u.rol === 'empleado')
  const now = new Date()
  const hoy = startOfDay(now)
  const vendibles = inventario.filter((x) => x.tipo === 'venta')

  for (let d = -13; d <= 2; d++) {
    const dia = addDays(hoy, d)
    if (dia.getDay() === 0 && d !== 0) continue // domingos cerrado (excepto hoy, para la demo)
    for (const emp of empleados) {
      const servs = servicios.filter((x) => x.area === emp.area)
      let cursor = new Date(dia)
      cursor.setHours(HORARIO.inicio, [0, 15, 30][Math.floor(rand() * 3)], 0, 0)
      const fin = new Date(dia)
      fin.setHours(HORARIO.fin, 0, 0, 0)
      while (true) {
        // hueco aleatorio (tiempos muertos)
        cursor = new Date(cursor.getTime() + [0, 0, 15, 30, 45, 60, 90][Math.floor(rand() * 7)] * 60000)
        const serv = pick(servs)
        const end = new Date(cursor.getTime() + serv.duracion_minutos * 60000)
        if (end > fin) break
        if (d > 0 && rand() < 0.45) { cursor = end; continue } // días futuros menos llenos

        let estado
        if (end <= now) {
          // pasado: casi todo pagado; algunas completadas sin cobrar (para la Caja)
          const r = rand()
          estado = r < 0.06 ? 'cancelada' : (d >= -1 && r > 0.88 ? 'completada' : 'pagada')
        } else if (cursor <= now) {
          estado = 'en_proceso'
        } else {
          estado = rand() < 0.05 ? 'cancelada' : 'pendiente'
        }

        const cita = {
          id: uid(), barberia_id: B, cliente: pick(CLIENTES),
          cliente_telefono: `30${Math.floor(rand() * 9)} ${Math.floor(100 + rand() * 899)} ${Math.floor(1000 + rand() * 8999)}`,
          empleado_id: emp.id, servicio_id: serv.id, estado,
          fecha_hora: cursor.toISOString(), duracion_minutos: serv.duracion_minutos,
          fecha_fin: end.toISOString(), precio: serv.precio, notas: '',
          created_at: addDays(cursor, -1).toISOString(),
        }
        citas.push(cita)

        if (estado === 'pagada') {
          const cajaId = uid()
          let totalProd = 0
          if (rand() < 0.18) {
            const prod = pick(vendibles)
            const cant = rand() < 0.8 ? 1 : 2
            totalProd = prod.precio_venta * cant
            caja_productos.push({ id: uid(), barberia_id: B, caja_id: cajaId, producto_id: prod.id, cantidad: cant, precio_unitario: prod.precio_venta, subtotal: totalProd })
          }
          caja.push({
            id: cajaId, barberia_id: B, cita_id: cita.id, empleado_id: emp.id, registrado_por: usuarios[0].id,
            metodo_pago: rand() < 0.55 ? 'efectivo' : 'nequi',
            total_servicio: serv.precio, total_productos: totalProd, total_pago: serv.precio + totalProd,
            porcentaje_aplicado: emp.porcentaje_comision,
            comision_empleado: Math.round(serv.precio * emp.porcentaje_comision) / 100,
            created_at: new Date(end.getTime() + 5 * 60000).toISOString(),
          })
        }
        cursor = end
      }
    }
  }

  return {
    barberia,
    usuarios,
    servicios,
    inventario,
    citas,
    caja,
    caja_productos,
    invitaciones: [],
    seededAt: now.toISOString(),
  }
}

export { uid }
