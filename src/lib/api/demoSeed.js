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
      porcentaje_comision: 50,
    }),
  )
  women.forEach((n, i) =>
    usuarios.push({
      id: uid(), barberia_id: B, rol: 'empleado', nombre: n, area: 'women', activo: true,
      email: `${n.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@demo.com`,
      porcentaje_comision: 50,
    }),
  )
  usuarios.forEach((u) => (u.password = 'demo123'))

  const s = (nombre, area, precio, duracion_minutos) => ({ id: uid(), barberia_id: B, nombre, area, precio, duracion_minutos, activo: true })
  const servicios = [
    s('Corte Simple / Fade', 'barberia', 25000, 30),
    s('Corte + Cejas', 'barberia', 30000, 35),
    s('Corte + Barba + Cejas (Completo)', 'barberia', 45000, 50),
    s('Barba y Perfilado', 'barberia', 15000, 20),
    s('Cejas Solas', 'barberia', 5000, 15),
    s('Afeitado Tradicional', 'barberia', 20000, 30),
    s('Manicure tradicional', 'women', 25000, 45),
    s('Pedicure spa', 'women', 35000, 60),
    s('Uñas acrílicas', 'women', 85000, 120),
    s('Semipermanente', 'women', 45000, 60),
    s('Cepillado y Peinado', 'women', 35000, 45),
    s('Corte dama', 'women', 40000, 60),
  ]

  const p = (nombre, tipo, categoria, proveedor, stock_actual, precio_compra, precio_venta) => ({
    id: uid(),
    barberia_id: B,
    nombre,
    tipo,
    categoria,
    proveedor,
    stock_actual,
    stock_minimo: 5,
    precio_compra,
    precio_venta,
  })

  const inventario = [
    // Venta al cliente
    p('Cera mate Reuzel Clay Pomade', 'venta', 'venta', 'Reuzel Grooming', 12, 22000, 42000),
    p('Pomada brillo Suavecito', 'venta', 'venta', 'Barber Pro Supply', 8, 18000, 35000),
    p('Aceite para barba y bigote', 'venta', 'venta', 'Reuzel Grooming', 8, 15000, 32000),
    p('Minoxidil 5% Kirkland (60ml)', 'venta', 'venta', 'Barber Pro Supply', 10, 35000, 60000),
    p('Shampoo anticaspa y control grasa', 'venta', 'venta', 'Distribuidora Belleza Total', 6, 14000, 28000),
    p('Kit cuidado y brillo de uñas', 'venta', 'venta', 'Masglo Cosméticos', 6, 12000, 25000),

    // Insumos y cuchillas
    p('Cuchillas Dorco Prime Platinum (caja x100)', 'consumo_interno', 'insumo', 'Dorco / Super-Max (Cuchillas)', 8, 25000, 0),
    p('Cuchillas Super-Max Super Platinum (x100)', 'consumo_interno', 'insumo', 'Dorco / Super-Max (Cuchillas)', 5, 22000, 0),
    p('Papel de cuello elástico (rollo x5)', 'consumo_interno', 'insumo', 'Barber Pro Supply', 15, 8000, 0),
    p('Talco barbero perfumado extra fino', 'consumo_interno', 'insumo', 'Barber Pro Supply', 6, 10000, 0),
    p('Alcohol antiséptico 70% 1 Litro', 'consumo_interno', 'insumo', 'Distribuidora Belleza Total', 12, 9000, 0),
    p('Gel de afeitar transparente de precisión', 'consumo_interno', 'insumo', 'Barber Pro Supply', 9, 14000, 0),

    // Esmaltes y Uñas
    p('Esmalte tradicional Masglo (Colección)', 'venta', 'esmalte', 'Masglo Cosméticos', 25, 6000, 12000),
    p('Esmalte semipermanente Masglo Gel Evolution', 'venta', 'esmalte', 'Masglo Cosméticos', 18, 14000, 28000),
    p('Polvo Acrílico Mia Secret 2oz', 'venta', 'esmalte', 'Masglo Cosméticos', 10, 18000, 35000),
    p('Limas profesionales grano 100/180 (paq)', 'consumo_interno', 'esmalte', 'Masglo Cosméticos', 20, 3500, 0),
    p('Acetona pura desmaquilladora 1L', 'consumo_interno', 'esmalte', 'Distribuidora Belleza Total', 4, 11000, 0),

    // Prendas y Dotación
    p('Capa de corte impermeable diseño Barber', 'herramienta', 'dotacion', 'Barber Pro Supply', 10, 25000, 0),
    p('Delantal de barbero en lona y cuero', 'herramienta', 'dotacion', 'Barber Pro Supply', 4, 45000, 0),
    p('Toallas microfibra negras (paquete x6)', 'consumo_interno', 'dotacion', 'Distribuidora Belleza Total', 18, 24000, 0),

    // Máquinas y Herramientas
    p('Máquina Wahl Magic Clip Cordless 5 Stars', 'herramienta', 'maquina', 'Wahl Professional', 3, 420000, 0),
    p('Patillera Babyliss Pro Skeleton GoldFX', 'herramienta', 'maquina', 'Babyliss Pro', 2, 390000, 0),
    p('Lámpara UV/LED SunX Plus 72W para Uñas', 'herramienta', 'maquina', 'Distribuidora Belleza Total', 3, 75000, 0),
    p('Secador Babyliss Pro 2000W Iónico', 'herramienta', 'maquina', 'Babyliss Pro', 2, 160000, 0),
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
