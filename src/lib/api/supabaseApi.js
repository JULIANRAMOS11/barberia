// Implementación real contra Supabase.
// El aislamiento por barbería lo garantiza el RLS en la base de datos:
// ninguna consulta necesita enviar barberia_id (se rellena por DEFAULT mi_barberia_id()).
import { supabase } from '../supabase'

function traducir(error) {
  if (!error) return 'Error desconocido'
  if (error.code === '23P01') return 'El empleado ya tiene una cita que se cruza con ese horario'
  if (error.code === '23503') return 'No se puede eliminar: el registro está siendo usado. Desactívalo en su lugar.'
  if (error.code === '23505') return 'Ya existe un registro con esos datos'
  if (error.message === 'Invalid login credentials') return 'Correo o contraseña incorrectos'
  if (error.message?.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de ingresar'
  return error.message
}

function check({ data, error }) {
  if (error) throw new Error(traducir(error))
  return data
}

const CITA_SELECT =
  '*, empleado:usuarios(id, nombre, area), servicio:servicios(id, nombre, precio, duracion_minutos)'

const CAJA_SELECT = `*,
  cita:citas(cliente, fecha_hora, empleado:usuarios(id, nombre, area), servicio:servicios(nombre)),
  productos:caja_productos(cantidad, precio_unitario, subtotal, producto:inventario(nombre))`

export const supabaseApi = {
  // ---------------- Auth ----------------
  async signIn(email, password) {
    check(await supabase.auth.signInWithPassword({ email, password }))
  },
  async signUp(email, password) {
    const data = check(await supabase.auth.signUp({ email, password }))
    return { needsConfirmation: !data.session }
  },
  async signOut() {
    await supabase.auth.signOut()
  },
  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  },
  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Diferir para no hacer llamadas a Supabase dentro del callback
      setTimeout(() => cb(session), 0)
    })
    return () => data.subscription.unsubscribe()
  },
  async getProfile(userId) {
    return check(
      await supabase.from('usuarios').select('*, barberia:barberias(*)').eq('id', userId).maybeSingle(),
    )
  },

  // ---------------- Barbería ----------------
  async updateBarberia(id, patch) {
    return check(await supabase.from('barberias').update(patch).eq('id', id).select().single())
  },

  // ---------------- Equipo ----------------
  async listEquipo({ area, soloActivos = false } = {}) {
    let q = supabase.from('usuarios').select('*').eq('rol', 'empleado').order('nombre')
    if (area) q = q.eq('area', area)
    if (soloActivos) q = q.eq('activo', true)
    return check(await q)
  },
  async updateUsuario(id, patch) {
    return check(await supabase.from('usuarios').update(patch).eq('id', id).select().single())
  },
  async listInvitaciones() {
    return check(await supabase.from('invitaciones').select('*').eq('usada', false).order('created_at'))
  },
  async createInvitacion(inv) {
    return check(await supabase.from('invitaciones').insert(inv).select().single())
  },
  async deleteInvitacion(id) {
    check(await supabase.from('invitaciones').delete().eq('id', id))
  },

  // ---------------- Servicios ----------------
  async listServicios({ soloActivos = false } = {}) {
    let q = supabase.from('servicios').select('*').order('nombre')
    if (soloActivos) q = q.eq('activo', true)
    return check(await q)
  },
  async saveServicio({ id, ...s }) {
    if (id) return check(await supabase.from('servicios').update(s).eq('id', id).select().single())
    return check(await supabase.from('servicios').insert(s).select().single())
  },
  async deleteServicio(id) {
    check(await supabase.from('servicios').delete().eq('id', id))
  },

  // ---------------- Citas ----------------
  async listCitas({ desde, hasta, empleadoId, empleadoIds, estados } = {}) {
    let q = supabase.from('citas').select(CITA_SELECT).order('fecha_hora')
    if (desde) q = q.gte('fecha_hora', new Date(desde).toISOString())
    if (hasta) q = q.lt('fecha_hora', new Date(hasta).toISOString())
    if (empleadoId) q = q.eq('empleado_id', empleadoId)
    if (empleadoIds) q = q.in('empleado_id', empleadoIds.length ? empleadoIds : ['00000000-0000-0000-0000-000000000000'])
    if (estados) q = q.in('estado', estados)
    return check(await q)
  },
  async createCita(c) {
    const payload = {
      cliente: c.cliente,
      cliente_telefono: c.cliente_telefono || null,
      empleado_id: c.empleado_id,
      servicio_id: c.servicio_id,
      fecha_hora: new Date(c.fecha_hora).toISOString(),
      notas: c.notas || null,
      // duracion/precio/fecha_fin los calcula el trigger; se envían para satisfacer NOT NULL
      duracion_minutos: 0,
      precio: 0,
      fecha_fin: new Date(c.fecha_hora).toISOString(),
    }
    return check(await supabase.from('citas').insert(payload).select(CITA_SELECT).single())
  },
  async updateCita(id, patch) {
    const p = { ...patch }
    if (p.fecha_hora) p.fecha_hora = new Date(p.fecha_hora).toISOString()
    return check(await supabase.from('citas').update(p).eq('id', id).select(CITA_SELECT).single())
  },
  async cambiarEstadoMiCita(id, estado) {
    check(await supabase.rpc('cambiar_estado_mi_cita', { p_cita_id: id, p_estado: estado }))
  },

  // ---------------- Inventario ----------------
  async listInventario() {
    return check(await supabase.from('inventario').select('*').order('nombre'))
  },
  async saveProducto({ id, ...p }) {
    if (id) return check(await supabase.from('inventario').update(p).eq('id', id).select().single())
    return check(await supabase.from('inventario').insert(p).select().single())
  },
  async deleteProducto(id) {
    check(await supabase.from('inventario').delete().eq('id', id))
  },
  async ajustarStock(id, delta) {
    const actual = check(await supabase.from('inventario').select('stock_actual').eq('id', id).single())
    const nuevo = Math.max(0, actual.stock_actual + delta)
    return check(await supabase.from('inventario').update({ stock_actual: nuevo }).eq('id', id).select().single())
  },

  // ---------------- Caja ----------------
  async procesarPago({ citaId, metodo, productos = [] }) {
    let res = await supabase.rpc('procesar_pago', {
      p_cita_id: citaId,
      p_metodo: metodo,
      p_productos: productos.filter((p) => p.cantidad > 0),
    })

    // Si la base de datos aún no tiene 'transferencia' o 'tarjeta' en su enum, fallback automático a 'nequi'
    if (res.error && (metodo === 'transferencia' || metodo === 'tarjeta') && res.error.message?.includes('metodo_pago')) {
      res = await supabase.rpc('procesar_pago', {
        p_cita_id: citaId,
        p_metodo: 'nequi',
        p_productos: productos.filter((p) => p.cantidad > 0),
      })
    }
    return check(res)
  },
  async listCaja({ desde, hasta, empleadoId } = {}) {
    let q = supabase.from('caja_diaria').select(CAJA_SELECT).order('created_at', { ascending: false })
    if (desde) q = q.gte('created_at', new Date(desde).toISOString())
    if (hasta) q = q.lt('created_at', new Date(hasta).toISOString())
    if (empleadoId) q = q.eq('empleado_id', empleadoId)
    const list = check(await q)
    return (list || []).map((item) => ({
      ...item,
      empleado: item.cita?.empleado || { nombre: 'Profesional', area: 'barberia' },
    }))
  },

  // ---------------- Reserva Pública (WhatsApp / Clientes) ----------------
  async getPublicCatalog() {
    const [barberias, servicios, empleados] = await Promise.all([
      supabase.from('barberias').select('id, nombre').limit(1).maybeSingle(),
      supabase.from('servicios').select('*').eq('activo', true).order('nombre'),
      supabase.from('usuarios').select('id, nombre, area').eq('rol', 'empleado').eq('activo', true).order('nombre'),
    ])
    return {
      barberia: check(barberias),
      servicios: check(servicios),
      empleados: check(empleados),
    }
  },
  async getPublicDisponibilidad({ empleadoId, fecha, duracionMinutos = 30 }) {
    const targetDay = new Date(fecha)
    targetDay.setHours(0, 0, 0, 0)
    const targetDayEnd = new Date(targetDay)
    targetDayEnd.setDate(targetDayEnd.getDate() + 1)

    const citas = check(
      await supabase
        .from('citas')
        .select('fecha_hora, fecha_fin')
        .eq('empleado_id', empleadoId)
        .neq('estado', 'cancelada')
        .gte('fecha_hora', targetDay.toISOString())
        .lt('fecha_hora', targetDayEnd.toISOString())
    )

    const slots = []
    const now = new Date()
    const isToday = now.getFullYear() === targetDay.getFullYear() &&
      now.getMonth() === targetDay.getMonth() &&
      now.getDate() === targetDay.getDate()

    for (let h = 8; h < 20; h++) {
      for (const m of [0, 15, 30, 45]) {
        const slotStart = new Date(targetDay)
        slotStart.setHours(h, m, 0, 0)
        const slotEnd = new Date(slotStart.getTime() + duracionMinutos * 60000)

        const limitFin = new Date(targetDay)
        limitFin.setHours(20, 0, 0, 0)
        if (slotEnd > limitFin) continue

        if (isToday && slotStart.getTime() <= now.getTime() + 15 * 60000) continue

        const choca = citas.some((c) => {
          const cIni = new Date(c.fecha_hora).getTime()
          const cFin = new Date(c.fecha_fin).getTime()
          return slotStart.getTime() < cFin && slotEnd.getTime() > cIni
        })

        if (!choca) {
          slots.push(slotStart.toISOString())
        }
      }
    }
    return slots
  },
  async createCitaPublica({ barberia_id, cliente, cliente_telefono, empleado_id, servicio_id, fecha_hora, notas }) {
    return check(
      await supabase.rpc('crear_cita_publica', {
        p_barberia_id: barberia_id,
        p_empleado_id: empleado_id,
        p_servicio_id: servicio_id,
        p_cliente: cliente,
        p_cliente_telefono: cliente_telefono || null,
        p_fecha_hora: new Date(fecha_hora).toISOString(),
        p_notas: notas || null,
      })
    )
  },
}
