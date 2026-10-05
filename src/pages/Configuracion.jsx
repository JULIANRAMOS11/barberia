import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Avatar, Empty, Modal, Skeleton, Spinner, Switch } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { AREAS } from '../lib/constants'
import { duracion, money } from '../lib/format'

export default function Configuracion() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('equipo') // equipo | servicios | local
  const [empleados, setEmpleados] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [modalInvitar, setModalInvitar] = useState(false)
  const [modalEditarEmpleado, setModalEditarEmpleado] = useState(null)
  const [modalServicio, setModalServicio] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Forms
  const [formInvitar, setFormInvitar] = useState({
    nombre: '',
    email: '',
    area: 'barberia',
    porcentaje_comision: 45,
  })

  const [formServicio, setFormServicio] = useState({
    id: null,
    nombre: '',
    area: 'barberia',
    precio: 25000,
    duracion_minutos: 30,
    activo: true,
  })

  // Configuración local
  const [nombreLocal, setNombreLocal] = useState(profile?.barberia?.nombre || '')
  const [comisionProductos, setComisionProductos] = useState(
    Boolean(profile?.barberia?.comision_incluye_productos)
  )

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [eq, inv, serv] = await Promise.all([
        api.listEquipo(),
        api.listInvitaciones(),
        api.listServicios(),
      ])
      setEmpleados(eq)
      setInvitaciones(inv)
      setServicios(serv)
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // --- Handlers de Empleados & Invitaciones ---
  const handleCrearInvitacion = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await api.createInvitacion({
        ...formInvitar,
        porcentaje_comision: Number(formInvitar.porcentaje_comision),
      })
      toast.success(`Invitación enviada para ${formInvitar.email}`)
      setModalInvitar(false)
      setFormInvitar({ nombre: '', email: '', area: 'barberia', porcentaje_comision: 45 })
      cargarDatos()
    } catch (err) {
      toast.error(err)
    } finally {
      setGuardando(false)
    }
  }

  const handleGuardarEmpleado = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await api.updateUsuario(modalEditarEmpleado.id, {
        nombre: modalEditarEmpleado.nombre,
        area: modalEditarEmpleado.area,
        porcentaje_comision: Number(modalEditarEmpleado.porcentaje_comision),
        activo: modalEditarEmpleado.activo,
      })
      toast.success('Datos de empleado actualizados')
      setModalEditarEmpleado(null)
      cargarDatos()
    } catch (err) {
      toast.error(err)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarInvitacion = async (id) => {
    if (!confirm('¿Cancelar esta invitación?')) return
    try {
      await api.deleteInvitacion(id)
      toast.success('Invitación cancelada')
      cargarDatos()
    } catch (err) {
      toast.error(err)
    }
  }

  // --- Handlers de Servicios ---
  const abrirModalServicio = (s = null) => {
    if (s) {
      setFormServicio({
        id: s.id,
        nombre: s.nombre,
        area: s.area || 'barberia',
        precio: s.precio,
        duracion_minutos: s.duracion_minutos,
        activo: s.activo !== false,
      })
    } else {
      setFormServicio({
        id: null,
        nombre: '',
        area: 'barberia',
        precio: 25000,
        duracion_minutos: 30,
        activo: true,
      })
    }
    setModalServicio(s || {})
  }

  const handleGuardarServicio = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await api.saveServicio({
        id: formServicio.id || undefined,
        nombre: formServicio.nombre.trim(),
        area: formServicio.area,
        precio: Number(formServicio.precio),
        duracion_minutos: Number(formServicio.duracion_minutos),
        activo: formServicio.activo,
      })
      toast.success(formServicio.id ? 'Servicio actualizado' : 'Servicio añadido')
      setModalServicio(null)
      cargarDatos()
    } catch (err) {
      toast.error(err)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarServicio = async (s) => {
    if (!confirm(`¿Eliminar el servicio "${s.nombre}"?`)) return
    try {
      await api.deleteServicio(s.id)
      toast.success('Servicio eliminado')
      cargarDatos()
    } catch (err) {
      toast.error(err)
    }
  }

  // --- Guardar Configuración de Barbería ---
  const handleGuardarBarberia = async (e) => {
    e.preventDefault()
    if (!profile?.barberia?.id) return
    setGuardando(true)
    try {
      await api.updateBarberia(profile.barberia.id, {
        nombre: nombreLocal.trim(),
        comision_incluye_productos: comisionProductos,
      })
      await refreshProfile()
      toast.success('Configuración del local actualizada')
    } catch (err) {
      toast.error(err)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Configuración del Negocio</h1>
          <p className="page-sub">
            Gestión de empleados (Barberos y Zona Women), catálogo de servicios y reglas de comisiones.
          </p>
        </div>
      </header>

      {/* Tabs principales */}
      <div className="segmented mb-24">
        <button
          className={tab === 'equipo' ? 'active' : ''}
          onClick={() => setTab('equipo')}
          id="cfg-tab-equipo"
        >
          <Icon name="users" /> Equipo ({empleados.length})
        </button>
        <button
          className={tab === 'servicios' ? 'active' : ''}
          onClick={() => setTab('servicios')}
          id="cfg-tab-servicios"
        >
          <Icon name="scissors" /> Servicios ({servicios.length})
        </button>
        <button
          className={tab === 'local' ? 'active' : ''}
          onClick={() => setTab('local')}
          id="cfg-tab-local"
        >
          <Icon name="settings" /> Reglas de Negocio
        </button>
      </div>

      {loading ? (
        <Skeleton h={250} />
      ) : (
        <>
          {/* TAB 1: EQUIPO */}
          {tab === 'equipo' && (
            <div className="col" style={{ gap: 20 }}>
              <div className="row-between wrap">
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Personal de Trabajo</h2>
                  <p className="faint small">
                    Administra los 14 empleados distribuidos entre Barbería y Zona Women.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setModalInvitar(true)}
                  id="cfg-btn-invitar"
                >
                  <Icon name="plus" /> Invitar Empleado
                </button>
              </div>

              {/* Lista de Empleados */}
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Área</th>
                      <th>Correo</th>
                      <th className="num">% Comisión</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empleados.map((emp) => (
                      <tr key={emp.id} style={{ opacity: emp.activo ? 1 : 0.5 }}>
                        <td>
                          <div className="row">
                            <Avatar nombre={emp.nombre} area={emp.area} />
                            <div>
                              <strong>{emp.nombre}</strong>
                              {!emp.activo && <span className="faint small"> (Inactivo)</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${emp.area === 'women' ? 'badge-rose' : 'badge-gold'} no-dot`}>
                            {AREAS[emp.area]?.label || emp.area}
                          </span>
                        </td>
                        <td className="faint small mono">{emp.email}</td>
                        <td className="num mono">
                          <strong style={{ color: 'var(--gold)' }}>{emp.porcentaje_comision}%</strong>
                        </td>
                        <td>
                          <span className={`badge ${emp.activo ? 'badge-completada' : 'badge-cancelada'}`}>
                            {emp.activo ? 'Activo' : 'Desactivado'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => setModalEditarEmpleado({ ...emp })}
                            id={`cfg-edit-emp-${emp.id}`}
                          >
                            <Icon name="edit" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invitaciones Pendientes */}
              {invitaciones.length > 0 && (
                <div className="card mt-16">
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                    Invitaciones Pendientes por Activar
                  </h3>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo</th>
                          <th>Área Asignada</th>
                          <th className="num">% Comisión</th>
                          <th style={{ textAlign: 'right' }}>Cancelar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitaciones.map((inv) => (
                          <tr key={inv.id}>
                            <td>{inv.nombre}</td>
                            <td className="mono faint">{inv.email}</td>
                            <td>{AREAS[inv.area]?.label || inv.area}</td>
                            <td className="num mono">{inv.porcentaje_comision}%</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-danger btn-icon btn-sm"
                                onClick={() => handleEliminarInvitacion(inv.id)}
                              >
                                <Icon name="trash" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SERVICIOS */}
          {tab === 'servicios' && (
            <div className="col" style={{ gap: 20 }}>
              <div className="row-between wrap">
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Catálogo de Servicios</h2>
                  <p className="faint small">
                    Configura la duración exacta de cada servicio para el bloqueo automático de espacios en la agenda.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => abrirModalServicio(null)}
                  id="cfg-btn-nuevo-servicio"
                >
                  <Icon name="plus" /> Nuevo Servicio
                </button>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Área Aplicable</th>
                      <th style={{ textAlign: 'center' }}>Duración Bloqueada</th>
                      <th className="num">Precio Público</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicios.map((s) => (
                      <tr key={s.id} style={{ opacity: s.activo ? 1 : 0.5 }}>
                        <td>
                          <strong>{s.nombre}</strong>
                        </td>
                        <td>
                          <span className={`badge ${s.area === 'women' ? 'badge-rose' : 'badge-gold'} no-dot`}>
                            {AREAS[s.area]?.label || 'Ambas áreas'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="mono">{duracion(s.duracion_minutos)}</span>
                        </td>
                        <td className="num mono">
                          <strong style={{ color: 'var(--gold)' }}>{money(s.precio)}</strong>
                        </td>
                        <td>
                          <span className={`badge ${s.activo ? 'badge-completada' : 'badge-cancelada'}`}>
                            {s.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => abrirModalServicio(s)}
                              id={`cfg-edit-serv-${s.id}`}
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              className="btn btn-danger btn-icon btn-sm"
                              onClick={() => handleEliminarServicio(s)}
                              id={`cfg-del-serv-${s.id}`}
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REGLAS DE NEGOCIO Y LOCAL */}
          {tab === 'local' && (
            <div className="card" style={{ maxWidth: 600 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Ajustes de la Barbería</h2>
              <p className="faint small mb-24">
                Personaliza el nombre de tu local y define cómo se calculan las comisiones de los empleados.
              </p>

              <form onSubmit={handleGuardarBarberia} className="col" style={{ gap: 20 }}>
                <div className="field">
                  <label className="label" htmlFor="cfg-nombre-local">Nombre Comercial</label>
                  <input
                    id="cfg-nombre-local"
                    className="input"
                    value={nombreLocal}
                    onChange={(e) => setNombreLocal(e.target.value)}
                    required
                  />
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="row-between">
                    <div>
                      <strong style={{ display: 'block', fontSize: 14 }}>
                        ¿Comisión incluye venta de productos?
                      </strong>
                      <p className="faint small mt-8" style={{ maxWidth: 440 }}>
                        (Pendiente de acordar con la dueña): Si está activado, la comisión del empleado se calcula sobre el
                        total completo (servicio + productos vendidos). Si está desactivado, se calcula únicamente sobre el
                        valor del corte o servicio.
                      </p>
                    </div>
                    <Switch
                      id="cfg-switch-comision"
                      checked={comisionProductos}
                      onChange={setComisionProductos}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={guardando}
                  id="cfg-guardar-local"
                >
                  {guardando ? <Spinner /> : <><Icon name="check" /> Guardar Preferencias</>}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Modal Invitar Empleado */}
      <Modal
        open={modalInvitar}
        onClose={() => setModalInvitar(false)}
        title="Invitar Nuevo Empleado"
        subtitle="El empleado recibirá acceso para gestionar su propia agenda al registrarse con este correo."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalInvitar(false)} type="button">
              Cancelar
            </button>
            <button className="btn btn-primary" form="form-invitar" type="submit" disabled={guardando}>
              {guardando ? <Spinner /> : <><Icon name="mail" /> Enviar Invitación</>}
            </button>
          </>
        }
      >
        <form id="form-invitar" className="form-grid" onSubmit={handleCrearInvitacion}>
          <div className="field span-2">
            <label className="label" htmlFor="inv-nombre">Nombre Completo</label>
            <input
              id="inv-nombre"
              className="input"
              required
              placeholder="Ej. Mateo Gómez"
              value={formInvitar.nombre}
              onChange={(e) => setFormInvitar({ ...formInvitar, nombre: e.target.value })}
              autoFocus
            />
          </div>

          <div className="field span-2">
            <label className="label" htmlFor="inv-email">Correo Electrónico</label>
            <input
              id="inv-email"
              type="email"
              className="input"
              required
              placeholder="mateo@ejemplo.com"
              value={formInvitar.email}
              onChange={(e) => setFormInvitar({ ...formInvitar, email: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="inv-area">Área Asignada</label>
            <select
              id="inv-area"
              className="select"
              value={formInvitar.area}
              onChange={(e) => setFormInvitar({ ...formInvitar, area: e.target.value })}
            >
              <option value="barberia">Barbería</option>
              <option value="women">Zona Women</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="inv-comision">% Comisión por Servicio</label>
            <input
              id="inv-comision"
              type="number"
              min="0"
              max="100"
              className="input"
              required
              value={formInvitar.porcentaje_comision}
              onChange={(e) => setFormInvitar({ ...formInvitar, porcentaje_comision: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Modal Editar Empleado */}
      <Modal
        open={Boolean(modalEditarEmpleado)}
        onClose={() => setModalEditarEmpleado(null)}
        title="Editar Empleado"
        subtitle={`Modificar condiciones de ${modalEditarEmpleado?.nombre}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalEditarEmpleado(null)} type="button">
              Cancelar
            </button>
            <button className="btn btn-primary" form="form-editar-empleado" type="submit" disabled={guardando}>
              {guardando ? <Spinner /> : <><Icon name="check" /> Guardar Cambios</>}
            </button>
          </>
        }
      >
        {modalEditarEmpleado && (
          <form id="form-editar-empleado" className="form-grid" onSubmit={handleGuardarEmpleado}>
            <div className="field span-2">
              <label className="label" htmlFor="edit-emp-nombre">Nombre</label>
              <input
                id="edit-emp-nombre"
                className="input"
                required
                value={modalEditarEmpleado.nombre}
                onChange={(e) => setModalEditarEmpleado({ ...modalEditarEmpleado, nombre: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="edit-emp-area">Área</label>
              <select
                id="edit-emp-area"
                className="select"
                value={modalEditarEmpleado.area}
                onChange={(e) => setModalEditarEmpleado({ ...modalEditarEmpleado, area: e.target.value })}
              >
                <option value="barberia">Barbería</option>
                <option value="women">Zona Women</option>
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="edit-emp-comision">% Comisión Asignado</label>
              <input
                id="edit-emp-comision"
                type="number"
                min="0"
                max="100"
                className="input"
                required
                value={modalEditarEmpleado.porcentaje_comision}
                onChange={(e) =>
                  setModalEditarEmpleado({ ...modalEditarEmpleado, porcentaje_comision: e.target.value })
                }
              />
            </div>

            <div className="field span-2">
              <label className="row small" style={{ gap: 10, cursor: 'pointer' }}>
                <Switch
                  id="edit-emp-activo"
                  checked={modalEditarEmpleado.activo}
                  onChange={(checked) =>
                    setModalEditarEmpleado({ ...modalEditarEmpleado, activo: checked })
                  }
                />
                <span>Empleado activo en la barbería</span>
              </label>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Crear / Editar Servicio */}
      <Modal
        open={Boolean(modalServicio)}
        onClose={() => setModalServicio(null)}
        title={formServicio.id ? 'Editar Servicio' : 'Nuevo Servicio'}
        subtitle="Define precio y duración en minutos para la agenda."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalServicio(null)} type="button">
              Cancelar
            </button>
            <button className="btn btn-primary" form="form-servicio" type="submit" disabled={guardando}>
              {guardando ? <Spinner /> : <><Icon name="check" /> Guardar</>}
            </button>
          </>
        }
      >
        <form id="form-servicio" className="form-grid" onSubmit={handleGuardarServicio}>
          <div className="field span-2">
            <label className="label" htmlFor="serv-nombre">Nombre del Servicio</label>
            <input
              id="serv-nombre"
              className="input"
              required
              placeholder="Ej. Degradado Fade, Barba Spa, Uñas Acrílicas..."
              value={formServicio.nombre}
              onChange={(e) => setFormServicio({ ...formServicio, nombre: e.target.value })}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="serv-area">Área Aplicable</label>
            <select
              id="serv-area"
              className="select"
              value={formServicio.area}
              onChange={(e) => setFormServicio({ ...formServicio, area: e.target.value })}
            >
              <option value="barberia">Barbería</option>
              <option value="women">Zona Women</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="serv-duracion">Duración en Minutos</label>
            <select
              id="serv-duracion"
              className="select"
              value={formServicio.duracion_minutos}
              onChange={(e) => setFormServicio({ ...formServicio, duracion_minutos: e.target.value })}
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora (60 min)</option>
              <option value="90">1 hora y media (90 min)</option>
              <option value="120">2 horas (120 min)</option>
            </select>
          </div>

          <div className="field span-2">
            <label className="label" htmlFor="serv-precio">Precio al Público ($ COP)</label>
            <input
              id="serv-precio"
              type="number"
              min="0"
              step="1000"
              className="input"
              required
              value={formServicio.precio}
              onChange={(e) => setFormServicio({ ...formServicio, precio: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
