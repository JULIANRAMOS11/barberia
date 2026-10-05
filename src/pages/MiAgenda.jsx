import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { Empty, EstadoBadge, Skeleton, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { addDays, duracion, fechaLarga, hora, money, sameDay, startOfDay, startOfWeek } from '../lib/format'

export default function MiAgenda() {
  const { profile } = useAuth()
  const toast = useToast()
  const [selectedDate, setSelectedDate] = useState(() => startOfDay())
  const [citasSemana, setCitasSemana] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const semanaInicio = useMemo(() => startOfWeek(selectedDate), [selectedDate])
  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i))
  }, [semanaInicio])

  const cargarCitas = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      // Cargar todas las citas de la semana del empleado
      const desde = semanaInicio
      const hasta = addDays(semanaInicio, 7)
      const data = await api.listCitas({
        desde,
        hasta,
        empleadoId: profile.id,
      })
      setCitasSemana(data)
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, semanaInicio, toast])

  useEffect(() => {
    cargarCitas()
  }, [cargarCitas])

  // Citas del día seleccionado
  const citasDelDia = useMemo(() => {
    return citasSemana
      .filter((c) => sameDay(c.fecha_hora, selectedDate))
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
  }, [citasSemana, selectedDate])

  const resumenDia = useMemo(() => {
    const activas = citasDelDia.filter((c) => c.estado !== 'cancelada')
    const completadas = activas.filter((c) => ['completada', 'pagada'].includes(c.estado)).length
    const pendientes = activas.filter((c) => c.estado === 'pendiente').length
    const enProceso = activas.filter((c) => c.estado === 'en_proceso').length
    return { total: activas.length, completadas, pendientes, enProceso }
  }, [citasDelDia])

  // Cambio de estado permitido para el empleado (en_proceso / completada)
  const handleCambiarEstado = async (citaId, nuevoEstado) => {
    setUpdatingId(citaId)
    try {
      await api.cambiarEstadoMiCita(citaId, nuevoEstado)
      toast.success(
        nuevoEstado === 'en_proceso'
          ? 'Servicio iniciado. ¡A cortar!'
          : '¡Servicio terminado! Pasó a cola de cobro en Caja.'
      )
      // Actualizar localmente
      setCitasSemana((prev) =>
        prev.map((c) => (c.id === citaId ? { ...c, estado: nuevoEstado } : c))
      )
    } catch (err) {
      toast.error(err)
    } finally {
      setUpdatingId(null)
    }
  }

  const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Mi Agenda</h1>
          <p className="page-sub">
            Hola, <strong>{profile?.nombre}</strong>. Aquí tienes tus citas programadas y tus tiempos de atención.
          </p>
        </div>
        <div className="row">
          <button
            className="btn btn-ghost"
            onClick={cargarCitas}
            disabled={loading}
            id="mi-agenda-btn-refrescar"
          >
            <Icon name="refresh" /> Refrescar
          </button>
        </div>
      </header>

      {/* Selector de días de la semana */}
      <div className="week-strip">
        {diasSemana.map((d, idx) => {
          const esHoy = sameDay(d, new Date())
          const esSeleccionado = sameDay(d, selectedDate)
          const tieneCitas = citasSemana.some(
            (c) => sameDay(c.fecha_hora, d) && c.estado !== 'cancelada'
          )
          return (
            <button
              key={idx}
              type="button"
              className={`day-pill ${esSeleccionado ? 'active' : ''} ${esHoy ? 'today' : ''} ${tieneCitas ? 'has' : ''}`}
              aria-pressed={esSeleccionado}
              aria-label={fechaLarga(d)}
              onClick={() => setSelectedDate(d)}
              id={`mi-agenda-dia-${idx}`}
            >
              <span className="dow">{dows[idx]}</span>
              <span className="dnum">{d.getDate()}</span>
              <span className="dot" />
            </button>
          )
        })}
      </div>

      {/* Resumen del día seleccionado */}
      <div className="card mb-24">
        <div className="row-between wrap">
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, textTransform: 'capitalize' }}>
              {fechaLarga(selectedDate)}
            </h2>
            <p className="faint small">
              {resumenDia.total} cita{resumenDia.total === 1 ? '' : 's'} agendada{resumenDia.total === 1 ? '' : 's'} para este día
            </p>
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <span className="badge badge-pendiente no-dot">{resumenDia.pendientes} Pendientes</span>
            <span className="badge badge-en_proceso no-dot">{resumenDia.enProceso} En proceso</span>
            <span className="badge badge-completada no-dot">{resumenDia.completadas} Terminadas</span>
          </div>
        </div>
      </div>

      {/* Timeline de Citas */}
      {loading ? (
        <Skeleton h={280} />
      ) : citasDelDia.length === 0 ? (
        <Empty icon="calendar" title="No tienes citas agendadas para este día">
          Disfruta tu tiempo libre o consulta con el administrador para agendar nuevos clientes.
        </Empty>
      ) : (
        <div className="timeline">
          {citasDelDia.map((cita) => {
            const actualizando = updatingId === cita.id
            return (
              <div key={cita.id} className={`tl-item ${cita.estado}`}>
                <div className="tl-time">{hora(cita.fecha_hora)}</div>
                <div className="tl-dot" />

                <div className="tl-card">
                  <div className="grow">
                    <div className="mobile-appointment-time"><Icon name="clock" size={14} /> {hora(cita.fecha_hora)} – {hora(cita.fecha_fin)}</div>
                    <div className="row-between wrap">
                      <div>
                        <strong style={{ fontSize: 16 }}>{cita.cliente}</strong>
                        {cita.cliente_telefono && (
                          <span className="faint small" style={{ marginLeft: 8 }}>
                            ({cita.cliente_telefono})
                          </span>
                        )}
                      </div>
                      <EstadoBadge estado={cita.estado} />
                    </div>

                    <div className="row wrap mt-8" style={{ gap: 14 }}>
                      <span className="faint small row" style={{ gap: 4 }}>
                        <Icon name="scissors" size={14} /> {cita.servicio?.nombre}
                      </span>
                      <span className="faint small row" style={{ gap: 4 }}>
                        <Icon name="clock" size={14} /> {duracion(cita.duracion_minutos)}
                      </span>
                      <span className="mono small" style={{ color: 'var(--gold)' }}>
                        {money(cita.precio)}
                      </span>
                    </div>

                    {cita.notas && (
                      <p className="faint small mt-8" style={{ fontStyle: 'italic' }}>
                        "{cita.notas}"
                      </p>
                    )}
                  </div>

                  {/* Acciones de estado para el empleado */}
                  <div className="row" style={{ gap: 8 }}>
                    {cita.estado === 'pendiente' && (
                      <button
                        className="btn btn-amber btn-sm"
                        onClick={() => handleCambiarEstado(cita.id, 'en_proceso')}
                        disabled={actualizando}
                        id={`btn-iniciar-${cita.id}`}
                      >
                        {actualizando ? <Spinner /> : <><Icon name="play" /> Iniciar Servicio</>}
                      </button>
                    )}

                    {cita.estado === 'en_proceso' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleCambiarEstado(cita.id, 'completada')}
                        disabled={actualizando}
                        id={`btn-terminar-${cita.id}`}
                      >
                        {actualizando ? <Spinner /> : <><Icon name="checkCircle" /> Marcar como Terminada</>}
                      </button>
                    )}

                    {cita.estado === 'completada' && (
                      <span className="badge badge-completada no-dot">
                        Listo para pagar en Caja
                      </span>
                    )}

                    {cita.estado === 'pagada' && (
                      <span className="badge badge-pagada no-dot">
                        Pagada · Comisión Registrada
                      </span>
                    )}

                    {cita.estado === 'cancelada' && (
                      <span className="badge badge-cancelada no-dot">Cancelada</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
