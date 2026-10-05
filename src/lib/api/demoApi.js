// Implementación local (localStorage) con la MISMA lógica de negocio que Supabase:
// aislamiento por barbería, validación de solapamientos, cálculo de comisión y
// descuento de inventario. Permite probar la app sin crear el proyecto en Supabase.
import { buildSeed, uid } from './demoSeed'

const KEY = 'barberos-demo-v1'
const SESSION_KEY = 'barberos-demo-session'
const listeners = new Set()

let db = null

function load() {
  if (db) return db
  try {
    db = JSON.parse(localStorage.getItem(KEY))
  } catch {
    db = null
  }
  if (!db) {
    db = buildSeed()
    save()
  }
  return db
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db))
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const clone = (x) => JSON.parse(JSON.stringify(x))

function currentUser() {
  const id = localStorage.getItem(SESSION_KEY)
  return id ? load().usuarios.find((u) => u.id === id && u.activo) : null
}

function requireUser() {
  const u = currentUser()
  if (!u) throw new Error('Sesión expirada')
  return u
}

function requireAdmin() {
  const u = requireUser()
  if (u.rol !== 'admin') throw new Error('Acción permitida solo para administradores')
  return u
}

// Equivalente al RLS: todo se filtra por la barbería del usuario logueado
const mine = (rows) => {
  const u = requireUser()
  return rows.filter((r) => r.barberia_id === u.barberia_id)
}

const publicUser = ({ password: _pw, ...u }) => u

function hydrateCita(c) {
  const d = load()
  const e = d.usuarios.find((u) => u.id === c.empleado_id)
  const s = d.servicios.find((x) => x.id === c.servicio_id)
  return {
    ...c,
    empleado: e ? { id: e.id, nombre: e.nombre, area: e.area } : null,
    servicio: s ? { id: s.id, nombre: s.nombre, precio: s.precio, duracion_minutos: s.duracion_minutos } : null,
  }
}

function hydrateCaja(row) {
  const d = load()
  const e = d.usuarios.find((u) => u.id === row.empleado_id)
  const c = d.citas.find((x) => x.id === row.cita_id)
  const s = c && d.servicios.find((x) => x.id === c.servicio_id)
  const u = currentUser()
  return {
    ...row,
    empleado: e ? { id: e.id, nombre: e.nombre, area: e.area } : null,
    cita: c ? { cliente: c.cliente, fecha_hora: c.fecha_hora, servicio: s ? { nombre: s.nombre } : null } : null,
    productos:
      u?.rol === 'admin'
        ? d.caja_productos
            .filter((p) => p.caja_id === row.id)
            .map((p) => ({ ...p, producto: { nombre: d.inventario.find((i) => i.id === p.producto_id)?.nombre } }))
        : [],
  }
}

function validarSolapamiento(cita, ignoreId) {
  if (cita.estado === 'cancelada') return
  const ini = new Date(cita.fecha_hora).getTime()
  const fin = new Date(cita.fecha_fin).getTime()
  const choque = load().citas.find(
    (c) =>
      c.id !== ignoreId &&
      c.empleado_id === cita.empleado_id &&
      c.estado !== 'cancelada' &&
      new Date(c.fecha_hora).getTime() < fin &&
      new Date(c.fecha_fin).getTime() > ini,
  )
  if (choque) throw new Error('El empleado ya tiene una cita que se cruza con ese horario')
}

function emit(session) {
  listeners.forEach((cb) => cb(session))
}

export const demoApi = {
  isDemo: true,

  resetDemo() {
    db = buildSeed()
    save()
  },

  // ---------------- Auth ----------------
  async signIn(email, password) {
    await delay(350)
    const u = load().usuarios.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase())
    if (!u || u.password !== password) throw new Error('Correo o contraseña incorrectos')
    if (!u.activo) throw new Error('Tu usuario está desactivado. Habla con la administración.')
    localStorage.setItem(SESSION_KEY, u.id)
    emit({ user: { id: u.id, email: u.email } })
  },
  async signUp(email, password) {
    await delay(350)
    const d = load()
    if (d.usuarios.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      throw new Error('Ya existe una cuenta con ese correo')
    }
    const inv = d.invitaciones.find((i) => !i.usada && i.email.toLowerCase() === email.toLowerCase())
    if (!inv) throw new Error('No hay ninguna invitación para ese correo. Pide a la administración que te invite.')
    d.usuarios.push({
      id: uid(), barberia_id: inv.barberia_id, rol: inv.rol, nombre: inv.nombre, email,
      area: inv.area, porcentaje_comision: inv.porcentaje_comision, activo: true, password,
    })
    inv.usada = true
    save()
    return { needsConfirmation: false }
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY)
    emit(null)
  },
  async getSession() {
    const u = currentUser()
    return u ? { user: { id: u.id, email: u.email } } : null
  },
  onAuthChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  async getProfile(userId) {
    await delay(80)
    const d = load()
    const u = d.usuarios.find((x) => x.id === userId)
    if (!u) return null
    return { ...publicUser(u), barberia: clone(d.barberia) }
  },
  demoAccounts() {
    const d = load()
    const admin = d.usuarios.find((u) => u.rol === 'admin')
    const barbero = d.usuarios.find((u) => u.area === 'barberia')
    const women = d.usuarios.find((u) => u.area === 'women')
    return [admin, barbero, women].filter(Boolean).map(publicUser)
  },

  // ---------------- Barbería ----------------
  async updateBarberia(id, patch) {
    await delay()
    requireAdmin()
    const d = load()
    if (d.barberia.id !== id) throw new Error('Barbería no encontrada')
    Object.assign(d.barberia, patch)
    save()
    return clone(d.barberia)
  },

  // ---------------- Equipo ----------------
  async listEquipo({ area, soloActivos = false } = {}) {
    await delay()
    const me = requireUser()
    let rows = mine(load().usuarios).filter((u) => u.rol === 'empleado')
    if (me.rol !== 'admin') rows = rows.filter((u) => u.id === me.id)
    if (area) rows = rows.filter((u) => u.area === area)
    if (soloActivos) rows = rows.filter((u) => u.activo)
    return clone(rows.map(publicUser)).sort((a, b) => a.nombre.localeCompare(b.nombre))
  },
  async updateUsuario(id, patch) {
    await delay()
    requireAdmin()
    const u = mine(load().usuarios).find((x) => x.id === id)
    if (!u) throw new Error('Usuario no encontrado')
    Object.assign(u, patch)
    save()
    return clone(publicUser(u))
  },
  async listInvitaciones() {
    await delay()
    requireAdmin()
    return clone(mine(load().invitaciones).filter((i) => !i.usada))
  },
  async createInvitacion(inv) {
    await delay()
    const me = requireAdmin()
    const d = load()
    if (d.invitaciones.some((i) => !i.usada && i.email.toLowerCase() === inv.email.toLowerCase())) {
      throw new Error('Ya existe una invitación pendiente para ese correo')
    }
    const row = { id: uid(), barberia_id: me.barberia_id, usada: false, created_at: new Date().toISOString(), ...inv }
    d.invitaciones.push(row)
    save()
    return clone(row)
  },
  async deleteInvitacion(id) {
    await delay()
    requireAdmin()
    const d = load()
    d.invitaciones = d.invitaciones.filter((i) => i.id !== id)
    save()
  },

  // ---------------- Servicios ----------------
  async listServicios({ soloActivos = false } = {}) {
    await delay()
    let rows = mine(load().servicios)
    if (soloActivos) rows = rows.filter((s) => s.activo)
    return clone(rows).sort((a, b) => a.nombre.localeCompare(b.nombre))
  },
  async saveServicio({ id, ...s }) {
    await delay()
    const me = requireAdmin()
    const d = load()
    if (id) {
      const row = mine(d.servicios).find((x) => x.id === id)
      Object.assign(row, s)
      save()
      return clone(row)
    }
    const row = { id: uid(), barberia_id: me.barberia_id, activo: true, ...s }
    d.servicios.push(row)
    save()
    return clone(row)
  },
  async deleteServicio(id) {
    await delay()
    requireAdmin()
    const d = load()
    if (d.citas.some((c) => c.servicio_id === id)) {
      throw new Error('No se puede eliminar: el registro está siendo usado. Desactívalo en su lugar.')
    }
    d.servicios = d.servicios.filter((s) => s.id !== id)
    save()
  },

  // ---------------- Citas ----------------
  async listCitas({ desde, hasta, empleadoId, empleadoIds, estados } = {}) {
    await delay()
    const me = requireUser()
    let rows = mine(load().citas)
    if (me.rol !== 'admin') rows = rows.filter((c) => c.empleado_id === me.id)
    if (desde) rows = rows.filter((c) => new Date(c.fecha_hora) >= new Date(desde))
    if (hasta) rows = rows.filter((c) => new Date(c.fecha_hora) < new Date(hasta))
    if (empleadoId) rows = rows.filter((c) => c.empleado_id === empleadoId)
    if (empleadoIds) rows = rows.filter((c) => empleadoIds.includes(c.empleado_id))
    if (estados) rows = rows.filter((c) => estados.includes(c.estado))
    return clone(rows.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)).map(hydrateCita))
  },
  async createCita(c) {
    await delay()
    const me = requireAdmin()
    const d = load()
    const serv = mine(d.servicios).find((s) => s.id === c.servicio_id)
    if (!serv) throw new Error('Servicio inválido para esta barbería')
    const emp = mine(d.usuarios).find((u) => u.id === c.empleado_id)
    if (!emp) throw new Error('Empleado inválido para esta barbería')
    const ini = new Date(c.fecha_hora)
    const row = {
      id: uid(), barberia_id: me.barberia_id, cliente: c.cliente, cliente_telefono: c.cliente_telefono || null,
      empleado_id: c.empleado_id, servicio_id: c.servicio_id, estado: 'pendiente',
      fecha_hora: ini.toISOString(), duracion_minutos: serv.duracion_minutos,
      fecha_fin: new Date(ini.getTime() + serv.duracion_minutos * 60000).toISOString(),
      precio: serv.precio, notas: c.notas || null, created_at: new Date().toISOString(),
    }
    validarSolapamiento(row)
    d.citas.push(row)
    save()
    return clone(hydrateCita(row))
  },
  async updateCita(id, patch) {
    await delay()
    requireAdmin()
    const d = load()
    const row = mine(d.citas).find((c) => c.id === id)
    if (!row) throw new Error('Cita no encontrada')
    if (row.estado === 'pagada' && patch.estado && patch.estado !== 'pagada') {
      throw new Error('Una cita pagada no puede cambiar de estado')
    }
    const next = { ...row, ...patch }
    if (patch.servicio_id && patch.servicio_id !== row.servicio_id) {
      const serv = mine(d.servicios).find((s) => s.id === patch.servicio_id)
      next.duracion_minutos = serv.duracion_minutos
      next.precio = serv.precio
    }
    next.fecha_hora = new Date(next.fecha_hora).toISOString()
    next.fecha_fin = new Date(new Date(next.fecha_hora).getTime() + next.duracion_minutos * 60000).toISOString()
    validarSolapamiento(next, id)
    Object.assign(row, next)
    save()
    return clone(hydrateCita(row))
  },
  async cambiarEstadoMiCita(id, estado) {
    await delay()
    const me = requireUser()
    if (!['en_proceso', 'completada'].includes(estado)) throw new Error('Estado no permitido')
    const row = mine(load().citas).find((c) => c.id === id && c.empleado_id === me.id)
    if (!row) throw new Error('Cita no encontrada')
    if (['pagada', 'cancelada'].includes(row.estado)) throw new Error(`La cita ya está ${row.estado}`)
    row.estado = estado
    save()
  },

  // ---------------- Inventario ----------------
  async listInventario() {
    await delay()
    requireAdmin()
    return clone(mine(load().inventario)).sort((a, b) => a.nombre.localeCompare(b.nombre))
  },
  async saveProducto({ id, ...p }) {
    await delay()
    const me = requireAdmin()
    const d = load()
    if (id) {
      const row = mine(d.inventario).find((x) => x.id === id)
      Object.assign(row, p)
      save()
      return clone(row)
    }
    const row = { id: uid(), barberia_id: me.barberia_id, stock_minimo: 5, ...p }
    d.inventario.push(row)
    save()
    return clone(row)
  },
  async deleteProducto(id) {
    await delay()
    requireAdmin()
    const d = load()
    if (d.caja_productos.some((p) => p.producto_id === id)) {
      throw new Error('No se puede eliminar: el producto tiene ventas registradas.')
    }
    d.inventario = d.inventario.filter((x) => x.id !== id)
    save()
  },
  async ajustarStock(id, delta) {
    await delay(60)
    requireAdmin()
    const row = mine(load().inventario).find((x) => x.id === id)
    row.stock_actual = Math.max(0, row.stock_actual + delta)
    save()
    return clone(row)
  },

  // ---------------- Caja (réplica de la RPC procesar_pago) ----------------
  async procesarPago({ citaId, metodo, productos = [] }) {
    await delay(400)
    const me = requireAdmin()
    const d = load()
    const cita = mine(d.citas).find((c) => c.id === citaId)
    if (!cita) throw new Error('Cita no encontrada')
    if (cita.estado !== 'completada') {
      throw new Error(`Solo se pueden cobrar citas en estado Completada (estado actual: ${cita.estado})`)
    }
    const emp = d.usuarios.find((u) => u.id === cita.empleado_id)

    // Validar todo antes de mutar (equivale al rollback de la transacción)
    const items = productos
      .filter((p) => p.cantidad > 0)
      .map((p) => {
        const prod = mine(d.inventario).find((i) => i.id === p.producto_id)
        if (!prod) throw new Error('Producto no encontrado')
        if (prod.tipo !== 'venta') throw new Error(`"${prod.nombre}" es de consumo interno y no se puede vender`)
        if (prod.stock_actual < p.cantidad) {
          throw new Error(`Stock insuficiente de "${prod.nombre}" (disponible: ${prod.stock_actual})`)
        }
        return { prod, cantidad: p.cantidad }
      })

    const cajaId = uid()
    let totalProd = 0
    for (const { prod, cantidad } of items) {
      prod.stock_actual -= cantidad
      const subtotal = prod.precio_venta * cantidad
      totalProd += subtotal
      d.caja_productos.push({ id: uid(), barberia_id: me.barberia_id, caja_id: cajaId, producto_id: prod.id, cantidad, precio_unitario: prod.precio_venta, subtotal })
    }
    const base = cita.precio + (d.barberia.comision_incluye_productos ? totalProd : 0)
    const comision = Math.round(base * emp.porcentaje_comision) / 100
    const row = {
      id: cajaId, barberia_id: me.barberia_id, cita_id: cita.id, empleado_id: cita.empleado_id,
      registrado_por: me.id, metodo_pago: metodo, total_servicio: cita.precio, total_productos: totalProd,
      total_pago: cita.precio + totalProd, porcentaje_aplicado: emp.porcentaje_comision,
      comision_empleado: comision, created_at: new Date().toISOString(),
    }
    d.caja.push(row)
    cita.estado = 'pagada'
    save()
    return {
      caja_id: cajaId, total_servicio: cita.precio, total_productos: totalProd,
      total_pago: row.total_pago, porcentaje: emp.porcentaje_comision, comision_empleado: comision,
    }
  },
  async listCaja({ desde, hasta, empleadoId } = {}) {
    await delay()
    const me = requireUser()
    let rows = mine(load().caja)
    if (me.rol !== 'admin') rows = rows.filter((r) => r.empleado_id === me.id)
    if (desde) rows = rows.filter((r) => new Date(r.created_at) >= new Date(desde))
    if (hasta) rows = rows.filter((r) => new Date(r.created_at) < new Date(hasta))
    if (empleadoId) rows = rows.filter((r) => r.empleado_id === empleadoId)
    return clone(rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(hydrateCaja))
  },
}
