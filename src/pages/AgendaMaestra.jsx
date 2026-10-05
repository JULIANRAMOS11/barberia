import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import CitaModal from '../components/CitaModal'
import { Avatar, Empty, EstadoBadge, Modal, Skeleton, Spinner, Switch } from '../components/ui'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { AREAS, HORARIO, MIN_TIEMPO_MUERTO, SLOT_MIN } from '../lib/constants'
import { addDays, duracion, fechaLarga, hora, horaCorta, money, sameDay, startOfDay } from '../lib/format'
import { esDiaDescanso, getEmpleadoHorario } from '../lib/horarios'

const SLOT_H = 22 // px por cada 15 min (sincronizado con --slot-h)
const PX_MIN = SLOT_H / SLOT_MIN
const TOTAL_MIN = (HORARIO.fin - HORARIO.inicio) * 60

/** Minutos desde la apertura (HORARIO.inicio) del día dado */
function minFromOpen(date, day) {
  const open = new Date(day)
  open.setHours(HORARIO.inicio, 0, 0, 0)
  return (new Date(date) - open) / 60000
}

/** Calcula huecos libres (tiempos muertos) de un empleado dentro del horario */
function calcularHuecos(citas, day) {
  const ocupados = citas
    .filter((c) => c.estado !== 'cancelada')
    .map((c) => [Math.max(0, minFromOpen(c.fecha_hora, day)), Math.min(TOTAL_MIN, minFromOpen(c.fecha_fin, day))])
    .sort((a, b) => a[0] - b[0])
  const huecos = []
  let cursor = 0
  for (const [ini, fin] of ocupados) {
    if (ini > cursor) huecos.push([cursor, ini])
    cursor = Math.max(cursor, fin)
  }
  if (cursor < TOTAL_MIN) huecos.push([cursor, TOTAL_MIN])
  const libre = huecos.reduce((s, [a, b]) => s + (b - a), 0)
  return { huecos: huecos.filter(([a, b]) => b - a >= MIN_TIEMPO_MUERTO), libre }
}

export default function AgendaMaestra() {
  const toast = useToast()
  const navigate = useNavigate()
  const [area, setArea] = useState('barberia')
  const [day, setDay] = useState(() => startOfDay())
  const [empleados, setEmpleados] = useState([])
  const [servicios, setServicios] = useState([])
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [verHuecos, setVerHuecos] = useState(true)
  const [verCanceladas, setVerCanceladas] = useState(false)
  const [modal, setModal] = useState(null) // { initial }
  const [detalle, setDetalle] = useState(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const isMobile = useMediaQuery('(max-width: 820px)')
  const [vistaElegida, setVistaElegida] = useState(null)
  const [empleadoFiltro, setEmpleadoFiltro] = useState('')
  const [modalWalkIn, setModalWalkIn] = useState(false)
  const [walkInForm, setWalkInForm] = useState({
    cliente: 'Cliente de Paso',
    cliente_telefono: '',
    servicio_id: '',
    empleado_id: '',
    notas: 'Atención inmediata sin cita previa',
  })
  const vista = vistaElegida || (isMobile ? 'lista' : 'calendario')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    Promise.all([api.listEquipo({ soloActivos: true }), api.listServicios({ soloActivos: true })])
      .then(([e, s]) => { setEmpleados(e); setServicios(s) })
      .catch(toast.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Solo se cargan las columnas del área seleccionada (evita saturación visual con 14 columnas)
  const empleadosArea = useMemo(() => empleados.filter((e) => e.area === area), [empleados, area])
  const serviciosArea = useMemo(() => servicios.filter((s) => !s.area || s.area === area), [servicios, area])
  const empleadosVisibles = empleadosArea.filter((e) => !empleadoFiltro || e.id === empleadoFiltro)
  const citasVisibles = citas
    .filter((c) => (!empleadoFiltro || c.empleado_id === empleadoFiltro) && (verCanceladas || c.estado !== 'cancelada'))
    .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
  const conteo = useMemo(
    () => ({ barberia: empleados.filter((e) => e.area === 'barberia').length, women: empleados.filter((e) => e.area === 'women').length }),
    [empleados],
  )

  const cargarCitas = useCallback(async () => {
    if (!empleadosArea.length) { setCitas([]); setLoading(false); return }
    setLoading(true)
    try {
      const rows = await api.listCitas({ desde: day, hasta: addDays(day, 1), empleadoIds: empleadosArea.map((e) => e.id) })
      setCitas(rows)
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, empleadosArea])

  useEffect(() => { cargarCitas() }, [cargarCitas])

  const porEmpleado = useMemo(() => {
    const map = Object.fromEntries(empleadosArea.map((e) => [e.id, []]))
    citas.forEach((c) => map[c.empleado_id]?.push(c))
    return map
  }, [citas, empleadosArea])

  const resumen = useMemo(() => {
    const activas = citas.filter((c) => c.estado !== 'cancelada')
    return {
      total: activas.length,
      canceladas: citas.length - activas.length,
      porCobrar: citas.filter((c) => c.estado === 'completada').length,
      proyectado: activas.reduce((s, c) => s + Number(c.precio), 0),
    }
  }, [citas])

  const esHoy = sameDay(day, now)
  const pasado = day < startOfDay(now)
  const nowTop = minFromOpen(now, day) * PX_MIN
  const slots = Array.from({ length: TOTAL_MIN / SLOT_MIN }, (_, i) => i)
  const horas = Array.from({ length: HORARIO.fin - HORARIO.inicio }, (_, i) => HORARIO.inicio + i)

  const abrirNueva = (empleadoId, slotIndex) => {
    const fh = new Date(day)
    fh.setHours(HORARIO.inicio, slotIndex * SLOT_MIN, 0, 0)
    setModal({ initial: { empleado_id: empleadoId, fecha_hora: fh } })
  }

  const cambiarEstado = async (cita, estado) => {
    setBusy(true)
    try {
      const upd = await api.updateCita(cita.id, { estado })
      setCitas((cs) => cs.map((c) => (c.id === upd.id ? upd : c)))
      setDetalle(upd)
      toast.success(`Cita marcada como ${estado.replace('_', ' ')}`)
    } catch (err) {
      toast.error(err)
    } finally {
      setBusy(false)
    }
  }

  const onSaved = (saved) => {
    // si la cita guardada cae en otro día / área, recargar
    cargarCitas()
    setDetalle(null)
    if (!sameDay(saved.fecha_hora, day)) setDay(startOfDay(saved.fecha_hora))
    if (saved.empleado?.area && saved.empleado.area !== area) setArea(saved.empleado.area)
  }

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <p className="eyebrow">CADA CITA, EN SU LUGAR</p>
          <h1 className="page-title">Agenda Maestra</h1>
          <p className="page-sub">
            {resumen.total} citas · {money(resumen.proyectado)} proyectado
            {resumen.porCobrar > 0 && <> · <span style={{ color: 'var(--green)' }}>{resumen.porCobrar} por cobrar</span></>}
          </p>
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <button
            className="btn btn-outline"
            style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
            disabled={!empleadosArea.length}
            onClick={() => {
              const defaultEmp = empleadoFiltro || empleadosArea[0]?.id || ''
              const defaultServ = serviciosArea[0]?.id || ''
              setWalkInForm({
                cliente: 'Cliente de Paso',
                cliente_telefono: '',
                servicio_id: defaultServ,
                empleado_id: defaultEmp,
                notas: 'Atención inmediata sin cita previa',
              })
              setModalWalkIn(true)
            }}
            id="agenda-walk-in"
          >
            <Icon name="play" /> + Cliente sin Cita (Paso)
          </button>
          <button
            className="btn btn-primary"
            disabled={!empleadosArea.length}
            onClick={() => setModal({ initial: { empleado_id: empleadoFiltro || empleadosArea[0]?.id, fecha_hora: esHoy ? new Date() : (() => { const d = new Date(day); d.setHours(HORARIO.inicio + 1); return d })() } })}
            id="agenda-nueva-cita"
          >
            <Icon name="plus" /> Nueva cita
          </button>
        </div>
      </header>

      <div className="agenda-toolbar">
        <div className="tabs" role="tablist" aria-label="Área">
          {Object.values(AREAS).map((a) => (
            <button key={a.key} role="tab" aria-selected={area === a.key} id={`tab-${a.key}`}
              className={`tab ${area === a.key ? 'active' : ''} ${a.key === 'women' ? 'women' : ''}`}
              onClick={() => { setArea(a.key); setEmpleadoFiltro('') }}>
              <Icon name={a.key === 'women' ? 'sparkles' : 'scissors'} />
              {a.label}
              <span className="count">{conteo[a.key]}</span>
            </button>
          ))}
        </div>

        <div className="date-nav">
          <button className="btn btn-icon" onClick={() => setDay(addDays(day, -1))} aria-label="Día anterior" id="agenda-prev"><Icon name="chevronLeft" /></button>
          <div className="date-label">{fechaLarga(day)}</div>
          <button className="btn btn-icon" onClick={() => setDay(addDays(day, 1))} aria-label="Día siguiente" id="agenda-next"><Icon name="chevronRight" /></button>
          <button className="btn btn-sm" onClick={() => setDay(startOfDay())} disabled={esHoy} id="agenda-hoy">Hoy</button>
          <input type="date" className="input input-sm" aria-label="Fecha de la agenda" style={{ width: 150 }} id="agenda-fecha"
            value={`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`}
            onChange={(e) => e.target.value && setDay(startOfDay(new Date(e.target.value + 'T00:00')))} />
        </div>
      </div>

      <div className="agenda-viewbar">
        <div className="field agenda-person-filter">
          <label htmlFor="agenda-empleado" className="label">Profesional</label>
          <select id="agenda-empleado" className="select" value={empleadoFiltro} onChange={(e) => setEmpleadoFiltro(e.target.value)}>
            <option value="">Todo el equipo · {AREAS[area].label}</option>
            {empleadosArea.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div className="segmented" role="group" aria-label="Vista de agenda">
          <button className={vista === 'lista' ? 'active' : ''} aria-pressed={vista === 'lista'} onClick={() => setVistaElegida('lista')}><Icon name="list" /> Lista</button>
          <button className={vista === 'calendario' ? 'active' : ''} aria-pressed={vista === 'calendario'} onClick={() => setVistaElegida('calendario')}><Icon name="calendar" /> Calendario</button>
        </div>
      </div>

      <div className="row-between wrap agenda-options" style={{ marginBottom: 12 }}>
        {vista === 'calendario' && <div className="legend">
          <span><i style={{ background: 'var(--blue)' }} /> Pendiente</span>
          <span><i style={{ background: 'var(--amber)' }} /> En proceso</span>
          <span><i style={{ background: 'var(--green)' }} /> Completada</span>
          <span><i style={{ background: 'var(--violet)' }} /> Pagada</span>
          <span><i style={{ border: '1px dashed var(--amber)', background: 'transparent' }} /> Tiempo muerto ≥ {MIN_TIEMPO_MUERTO} min</span>
        </div>}
        <div className="row" style={{ gap: 18 }}>
          {vista === 'calendario' && <label className="row small muted" style={{ gap: 8 }}>
            <Switch id="toggle-huecos" checked={verHuecos} onChange={setVerHuecos} /> Tiempos muertos
          </label>}
          <label className="row small muted" style={{ gap: 8 }}>
            <Switch id="toggle-canceladas" checked={verCanceladas} onChange={setVerCanceladas} /> Canceladas ({resumen.canceladas})
          </label>
        </div>
      </div>

      {vista === 'lista' ? (
        <section className="agenda-list" aria-label="Citas del día" aria-busy={loading}>
          {loading ? <Skeleton h={220} /> : citasVisibles.length === 0 ? (
            <div className="card"><Empty icon="calendar" title="El día tiene espacio para más">
              No hay citas con estos filtros. Usa «Nueva cita» para agendar una atención.
            </Empty></div>
          ) : citasVisibles.map((c) => (
            <button key={c.id} className={`agenda-list-card ${c.estado}`} onClick={() => setDetalle(c)}>
              <div className="agenda-list-time"><strong>{hora(c.fecha_hora)}</strong><span>{duracion(c.duracion_minutos)}</span></div>
              <div className="agenda-list-info">
                <div className="agenda-list-heading"><strong>{c.cliente}</strong><EstadoBadge estado={c.estado} /></div>
                <p className="muted">{c.servicio?.nombre}</p>
                <div className="agenda-list-professional"><Avatar nombre={c.empleado?.nombre} area={c.empleado?.area} /><span>{c.empleado?.nombre}</span><strong className="mono">{money(c.precio)}</strong></div>
              </div>
              <Icon name="chevronRight" className="faint" size={16} />
            </button>
          ))}
        </section>
      ) : <>
      {isMobile && <p className="small faint mb-8">Desliza el calendario para ver las columnas del equipo.</p>}
      <div className={`agenda ${area === 'women' ? 'women' : ''}`} style={{ '--cols': empleadosVisibles.length || 1, '--slot-h': `${SLOT_H}px` }}>
        <div className="agenda-head">
          <div className="corner">{loading && <div style={{ padding: 16 }}><Spinner /></div>}</div>
          {empleadosVisibles.map((e) => {
            const { libre } = calcularHuecos(porEmpleado[e.id] ?? [], day)
            const n = (porEmpleado[e.id] ?? []).filter((c) => c.estado !== 'cancelada').length
            const descansando = esDiaDescanso(e, day)
            return (
              <div className="emp-head" key={e.id} style={descansando ? { background: 'rgba(234, 179, 8, 0.05)' } : {}}>
                <Avatar nombre={e.nombre} area={e.area} />
                <div style={{ minWidth: 0 }}>
                  <div className="name row" style={{ gap: 4, alignItems: 'center' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nombre}</span>
                    {descansando && (
                      <span className="badge badge-en_proceso no-dot" style={{ fontSize: 9, padding: '1px 4px' }}>
                        🏖️ Descanso
                      </span>
                    )}
                  </div>
                  <div className="meta">
                    {descansando ? (
                      <span className="faint small" style={{ color: 'var(--amber)' }}>Descanso semanal</span>
                    ) : (
                      <>{n} citas · <span className="idle">libre {duracion(libre)}</span></>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="agenda-body">
          <div className="time-col">
            {horas.map((h) => <div className="time-label" key={h}>{horaCorta(h)}</div>)}
          </div>

          {empleadosVisibles.map((e) => {
            const lista = porEmpleado[e.id] ?? []
            const { huecos } = calcularHuecos(lista, day)
            return (
              <div className="emp-col" key={e.id}>
                {slots.map((i) => {
                  const slotTime = new Date(day)
                  slotTime.setHours(HORARIO.inicio, i * SLOT_MIN + SLOT_MIN, 0, 0)
                  const isPast = pasado || (esHoy && slotTime <= now)
                  return (
                    <div key={i} className={`slot ${isPast ? 'past' : ''}`}
                      onClick={() => !isPast && abrirNueva(e.id, i)}
                      title={isPast ? '' : 'Agendar aquí'} />
                  )
                })}

                {verHuecos && huecos.map(([a, b]) => (
                  <div key={a} className="gap-block" style={{ top: a * PX_MIN + 2, height: (b - a) * PX_MIN - 4 }}>
                    {(b - a) >= 45 && `Libre ${duracion(b - a)}`}
                  </div>
                ))}

                {lista
                  .filter((c) => verCanceladas || c.estado !== 'cancelada')
                  .map((c) => {
                    const top = minFromOpen(c.fecha_hora, day) * PX_MIN
                    const height = c.duracion_minutos * PX_MIN - 3
                    return (
                      <button type="button" key={c.id} className={`appt ${c.estado} ${c.duracion_minutos <= 20 ? 'compact' : ''}`}
                        style={{ top: top + 1, height }}
                        onClick={(ev) => { ev.stopPropagation(); setDetalle(c) }}
                        title={`${c.cliente} · ${c.servicio?.nombre}`}>
                        <div className="t">{hora(c.fecha_hora)}</div>
                        <div className="c">{c.cliente}</div>
                        {c.duracion_minutos >= 45 && <div className="s">{c.servicio?.nombre}</div>}
                      </button>
                    )
                  })}

                {esHoy && nowTop >= 0 && nowTop <= TOTAL_MIN * PX_MIN && <div className="now-line" style={{ top: nowTop }} />}
              </div>
            )
          })}
        </div>
      </div>
      </>}

      {/* Detalle de cita */}
      <Modal
        open={Boolean(detalle)}
        onClose={() => setDetalle(null)}
        title={detalle?.cliente}
        subtitle={detalle && `${detalle.servicio?.nombre} · ${hora(detalle.fecha_hora)} – ${hora(detalle.fecha_fin)}`}
      >
        {detalle && (
          <div className="col" style={{ gap: 16 }}>
            <div className="row-between">
              <div className="row">
                <Avatar nombre={detalle.empleado?.nombre} area={detalle.empleado?.area} />
                <div>
                  <div style={{ fontWeight: 600 }}>{detalle.empleado?.nombre}</div>
                  <div className="faint small">{AREAS[detalle.empleado?.area]?.label}</div>
                </div>
              </div>
              <EstadoBadge estado={detalle.estado} />
            </div>
            <div className="receipt">
              <div className="receipt-row"><span className="muted">Duración</span><span>{duracion(detalle.duracion_minutos)}</span></div>
              <div className="receipt-row"><span className="muted">Precio</span><strong>{money(detalle.precio)}</strong></div>
              {detalle.cliente_telefono && <div className="receipt-row"><span className="muted">Teléfono</span><span>{detalle.cliente_telefono}</span></div>}
              {detalle.notas && <div className="receipt-row"><span className="muted">Notas</span><span>{detalle.notas}</span></div>}
            </div>

            <div className="row wrap" style={{ gap: 8 }}>
              {detalle.estado === 'pendiente' && (
                <button className="btn btn-amber" disabled={busy} onClick={() => cambiarEstado(detalle, 'en_proceso')} id="det-iniciar"><Icon name="play" /> Iniciar</button>
              )}
              {['pendiente', 'en_proceso'].includes(detalle.estado) && (
                <button className="btn btn-success" disabled={busy} onClick={() => cambiarEstado(detalle, 'completada')} id="det-completar"><Icon name="check" /> Completar</button>
              )}
              {detalle.estado === 'completada' && (
                <button className="btn btn-primary" onClick={() => navigate(`/caja?cita=${detalle.id}`)} id="det-cobrar"><Icon name="cash" /> Cobrar en caja</button>
              )}
              {['pendiente', 'en_proceso', 'cancelada'].includes(detalle.estado) && (
                <button className="btn" onClick={() => { setModal({ initial: detalle }); setDetalle(null) }} id="det-editar"><Icon name="edit" /> Editar</button>
              )}
              {detalle.estado === 'cancelada' && (
                <button className="btn" disabled={busy} onClick={() => cambiarEstado(detalle, 'pendiente')} id="det-reactivar"><Icon name="refresh" /> Reactivar</button>
              )}
              {['pendiente', 'en_proceso'].includes(detalle.estado) && (
                <button className="btn btn-danger" style={{ marginLeft: 'auto' }} disabled={busy}
                  onClick={() => confirm('¿Cancelar esta cita? El espacio quedará libre.') && cambiarEstado(detalle, 'cancelada')} id="det-cancelar">
                  <Icon name="ban" /> Cancelar cita
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <CitaModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        onSaved={onSaved}
        empleados={modal?.initial?.id ? empleados : empleadosArea.length ? empleadosArea : empleados}
        servicios={servicios}
        initial={modal?.initial}
      />

      {/* Modal Cliente sin Cita / De Paso (Walk-in) */}
      <Modal
        open={modalWalkIn}
        onClose={() => setModalWalkIn(false)}
        title="Atender Cliente sin Cita (Walk-in)"
        subtitle="Registra inmediatamente una atención presencial para un cliente que acaba de entrar."
      >
        <div className="col" style={{ gap: 16 }}>
          <div className="field">
            <label className="label">1. ¿Quién lo atiende?</label>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {empleadosArea.map((emp) => {
                const citaActual = citas.find(
                  (c) =>
                    c.empleado_id === emp.id &&
                    c.estado !== 'cancelada' &&
                    new Date(c.fecha_hora) <= now &&
                    new Date(c.fecha_fin) > now
                )
                const ocupado = Boolean(citaActual)
                const selected = walkInForm.empleado_id === emp.id
                return (
                  <div
                    key={emp.id}
                    className={`walkin-staff-card ${selected ? 'selected' : ''}`}
                    onClick={() => setWalkInForm({ ...walkInForm, empleado_id: emp.id })}
                  >
                    <div className="row" style={{ gap: 8 }}>
                      <Avatar nombre={emp.nombre} area={emp.area} size={32} />
                      <div>
                        <strong style={{ fontSize: 13 }}>{emp.nombre}</strong>
                        <div className="faint small" style={{ color: ocupado ? 'var(--amber)' : 'var(--green)' }}>
                          {ocupado ? `Ocupado hasta ${hora(citaActual.fecha_fin)}` : '● Disponible ahora'}
                        </div>
                      </div>
                    </div>
                    {selected && <Icon name="check" size={16} style={{ color: 'var(--gold)' }} />}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="field">
            <label className="label">2. Servicio a realizar</label>
            <select
              className="select"
              value={walkInForm.servicio_id}
              onChange={(e) => setWalkInForm({ ...walkInForm, servicio_id: e.target.value })}
            >
              {serviciosArea.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {duracion(s.duracion_minutos)} · {money(s.precio)}
                </option>
              ))}
            </select>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="field grow">
              <label className="label">Nombre del Cliente</label>
              <input
                className="input"
                value={walkInForm.cliente}
                placeholder="Ej. Cliente de paso #1"
                onChange={(e) => setWalkInForm({ ...walkInForm, cliente: e.target.value })}
              />
            </div>
            <div className="field grow">
              <label className="label">Teléfono (Opcional)</label>
              <input
                className="input"
                type="tel"
                value={walkInForm.cliente_telefono}
                placeholder="Ej. 300 123 4567"
                onChange={(e) => setWalkInForm({ ...walkInForm, cliente_telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="row wrap mt-12" style={{ gap: 10 }}>
            <button
              type="button"
              className="btn btn-amber grow"
              disabled={busy || !walkInForm.empleado_id || !walkInForm.servicio_id}
              onClick={async () => {
                setBusy(true)
                try {
                  const serv = servicios.find((s) => s.id === walkInForm.servicio_id)
                  const ini = new Date()
                  await api.createCita({
                    cliente: walkInForm.cliente.trim() || 'Cliente de Paso',
                    cliente_telefono: walkInForm.cliente_telefono || null,
                    empleado_id: walkInForm.empleado_id,
                    servicio_id: walkInForm.servicio_id,
                    fecha_hora: ini.toISOString(),
                    duracion_minutos: serv?.duracion_minutos || 30,
                    precio: serv?.precio || 0,
                    estado: 'en_proceso',
                    notas: walkInForm.notas || 'Cliente de paso',
                  })
                  toast.success('Atención iniciada. Aparece en atención en la agenda.')
                  setModalWalkIn(false)
                  cargarAgenda()
                } catch (err) {
                  toast.error(err)
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Icon name="play" /> Atender Ahora (En Proceso)
            </button>

            <button
              type="button"
              className="btn btn-primary grow"
              disabled={busy || !walkInForm.empleado_id || !walkInForm.servicio_id}
              onClick={async () => {
                setBusy(true)
                try {
                  const serv = servicios.find((s) => s.id === walkInForm.servicio_id)
                  const ini = new Date()
                  const nueva = await api.createCita({
                    cliente: walkInForm.cliente.trim() || 'Cliente de Paso',
                    cliente_telefono: walkInForm.cliente_telefono || null,
                    empleado_id: walkInForm.empleado_id,
                    servicio_id: walkInForm.servicio_id,
                    fecha_hora: ini.toISOString(),
                    duracion_minutos: serv?.duracion_minutos || 30,
                    precio: serv?.precio || 0,
                    estado: 'completada',
                    notas: walkInForm.notas || 'Cliente de paso',
                  })
                  toast.success('Cita creada y lista para cobro en caja.')
                  setModalWalkIn(false)
                  navigate(`/caja?cita=${nueva.id}`)
                } catch (err) {
                  toast.error(err)
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Icon name="cash" /> Ya terminó (Pasar a Caja)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
