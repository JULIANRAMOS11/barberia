import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Empty, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { AREAS } from '../lib/constants'
import { addDays, duracion, fechaCorta, fechaLarga, hora, money, sameDay, startOfDay } from '../lib/format'

export default function ReservaPublica() {
  const [searchParams] = useSearchParams()
  const preselectedBarbero = searchParams.get('barbero')
  const preselectedArea = searchParams.get('area')

  const [loading, setLoading] = useState(true)
  const [catalogo, setCatalogo] = useState({ barberia: null, servicios: [], empleados: [] })
  const [paso, setPaso] = useState(1) // 1: Servicio, 2: Profesional, 3: Fecha & Hora, 4: Datos, 5: Éxito

  // Selecciones del cliente
  const [areaFiltro, setAreaFiltro] = useState(preselectedArea || 'todas')
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null)
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => startOfDay())
  const [horaSeleccionada, setHoraSeleccionada] = useState(null)

  // Datos del cliente
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteNotas, setClienteNotas] = useState('')

  // Disponibilidad de horas
  const [slotsDisponibles, setSlotsDisponibles] = useState([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [citaCreada, setCitaCreada] = useState(null)
  const [errorReserva, setErrorReserva] = useState('')

  // Cargar catálogo público
  useEffect(() => {
    api.getPublicCatalog()
      .then((data) => {
        setCatalogo(data)
        if (preselectedBarbero) {
          const emp = data.empleados.find((e) => e.id === preselectedBarbero)
          if (emp) {
            setEmpleadoSeleccionado(emp)
            setAreaFiltro(emp.area)
          }
        }
      })
      .catch((err) => console.error('Error al cargar catálogo público:', err))
      .finally(() => setLoading(false))
  }, [preselectedBarbero])

  // Próximos 7 días hábiles
  const diasDisponibles = useMemo(() => {
    const hoy = startOfDay()
    return Array.from({ length: 7 }, (_, i) => addDays(hoy, i))
  }, [])

  // Filtrar servicios por área
  const serviciosFiltrados = useMemo(() => {
    if (areaFiltro === 'todas') return catalogo.servicios
    return catalogo.servicios.filter((s) => !s.area || s.area === areaFiltro)
  }, [catalogo.servicios, areaFiltro])

  // Filtrar empleados según el servicio seleccionado
  const empleadosFiltrados = useMemo(() => {
    if (!servicioSeleccionado) return catalogo.empleados
    return catalogo.empleados.filter((e) => !servicioSeleccionado.area || e.area === servicioSeleccionado.area)
  }, [catalogo.empleados, servicioSeleccionado])

  // Cargar horas disponibles en tiempo real (evita que se colapsen las citas)
  useEffect(() => {
    if (!empleadoSeleccionado || !fechaSeleccionada || !servicioSeleccionado) return

    setCargandoSlots(true)
    setHoraSeleccionada(null)
    api.getPublicDisponibilidad({
      empleadoId: empleadoSeleccionado.id,
      fecha: fechaSeleccionada,
      duracionMinutos: servicioSeleccionado.duracion_minutos,
    })
      .then((slots) => setSlotsDisponibles(slots))
      .catch((err) => console.error('Error calculando disponibilidad:', err))
      .finally(() => setCargandoSlots(false))
  }, [empleadoSeleccionado, fechaSeleccionada, servicioSeleccionado])

  // Confirmar reserva
  const handleConfirmarReserva = async (e) => {
    e.preventDefault()
    if (!horaSeleccionada) {
      setErrorReserva('Por favor selecciona una hora de atención disponible.')
      return
    }
    setErrorReserva('')
    setEnviando(true)

    try {
      const res = await api.createCitaPublica({
        barberia_id: catalogo.barberia?.id,
        cliente: clienteNombre,
        cliente_telefono: clienteTelefono,
        empleado_id: empleadoSeleccionado.id,
        servicio_id: servicioSeleccionado.id,
        fecha_hora: horaSeleccionada,
        notas: clienteNotas,
      })
      setCitaCreada(res)
      setPaso(5) // Pantalla de éxito
    } catch (err) {
      setErrorReserva(err.message || 'El horario seleccionado ya no está disponible. Por favor elige otro.')
    } finally {
      setEnviando(false)
    }
  }

  // Generar link de WhatsApp para confirmación directa
  const generarWhatsAppUrl = () => {
    if (!citaCreada) return '#'
    const fechaTexto = fechaLarga(citaCreada.fecha_hora)
    const horaTexto = hora(citaCreada.fecha_hora)
    const mensaje = encodeURIComponent(
      `¡Hola! 👋 Acabo de agendar una cita en ${catalogo.barberia?.nombre || 'la barbería'}:\n\n` +
      `👤 Cliente: ${citaCreada.cliente}\n` +
      `✂️ Servicio: ${servicioSeleccionado?.nombre}\n` +
      `💈 Atendido por: ${empleadoSeleccionado?.nombre}\n` +
      `📅 Fecha: ${fechaTexto}\n` +
      `⏰ Hora: ${horaTexto}\n` +
      `💰 Valor: ${money(servicioSeleccionado?.precio)}\n\n` +
      `¿Podrían confirmarme la reserva? ¡Muchas gracias!`
    )
    return `https://wa.me/?text=${mensaje}`
  }

  return (
    <div className="reserva-publica-page">
      {/* Barra superior con marca */}
      <header className="reserva-header">
        <div className="reserva-header-inner">
          <div className="row">
            <div className="brand-logo" style={{ width: 38, height: 38 }}>
              <Icon name="scissors" size={20} />
            </div>
            <div>
              <strong style={{ fontSize: 18, color: '#fff' }}>{catalogo.barberia?.nombre || 'BarberOS'}</strong>
              <div className="faint small">Agenda tu cita online en 1 minuto</div>
            </div>
          </div>
          <span className="badge badge-gold no-dot hidden-mobile">Atención 8:00 AM – 8:00 PM</span>
        </div>
      </header>

      <main className="reserva-container">
        {loading ? (
          <div className="loader-screen" style={{ minHeight: '50vh' }}>
            <Spinner />
          </div>
        ) : paso === 5 && citaCreada ? (
          /* PANTALLA 5: ÉXITO Y ENLACE DE WHATSAPP */
          <div className="card reserva-success-card animate-in">
            <div className="success-icon-wrap">
              <Icon name="checkCircle" size={48} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, textAlign: 'center' }}>
              ¡Tu Cita ha sido Agendada!
            </h1>
            <p className="muted" style={{ textAlign: 'center', marginTop: 8 }}>
              Tu turno quedó bloqueado y registrado en la agenda del local.
            </p>

            <div className="receipt mt-24">
              <div className="receipt-row">
                <span className="muted">Cliente:</span>
                <strong>{citaCreada.cliente}</strong>
              </div>
              <div className="receipt-row">
                <span className="muted">Servicio:</span>
                <span>{servicioSeleccionado?.nombre} ({duracion(servicioSeleccionado?.duracion_minutos)})</span>
              </div>
              <div className="receipt-row">
                <span className="muted">Profesional:</span>
                <strong>{empleadoSeleccionado?.nombre}</strong>
              </div>
              <div className="receipt-row">
                <span className="muted">Fecha:</span>
                <span style={{ textTransform: 'capitalize' }}>{fechaLarga(citaCreada.fecha_hora)}</span>
              </div>
              <div className="receipt-row">
                <span className="muted">Hora de Atención:</span>
                <strong style={{ color: 'var(--gold)' }}>{hora(citaCreada.fecha_hora)}</strong>
              </div>
              <div className="receipt-row total">
                <span>Total a Pagar en Local:</span>
                <span className="gold-text">{money(servicioSeleccionado?.precio)}</span>
              </div>
            </div>

            {/* Botón WhatsApp */}
            <div className="col mt-24" style={{ gap: 12 }}>
              <a
                href={generarWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success btn-lg btn-block"
                style={{ fontSize: 16 }}
              >
                <Icon name="smartphone" /> Confirmar por WhatsApp con el Local
              </a>

              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => {
                  setPaso(1)
                  setCitaCreada(null)
                  setServicioSeleccionado(null)
                  setEmpleadoSeleccionado(null)
                  setHoraSeleccionada(null)
                }}
              >
                Agendar otra cita
              </button>
            </div>
          </div>
        ) : (
          /* PASOS 1 A 4 */
          <div className="col" style={{ gap: 24 }}>
            {/* Barra de Progreso */}
            <div className="reserva-steps-bar">
              <div className={`reserva-step-item ${paso >= 1 ? 'active' : ''}`} onClick={() => setPaso(1)}>
                <span className="step-num">1</span>
                <span className="step-label">Servicio</span>
              </div>
              <div className={`reserva-step-item ${paso >= 2 ? 'active' : ''}`} onClick={() => servicioSeleccionado && setPaso(2)}>
                <span className="step-num">2</span>
                <span className="step-label">Profesional</span>
              </div>
              <div className={`reserva-step-item ${paso >= 3 ? 'active' : ''}`} onClick={() => servicioSeleccionado && empleadoSeleccionado && setPaso(3)}>
                <span className="step-num">3</span>
                <span className="step-label">Fecha y Hora</span>
              </div>
              <div className={`reserva-step-item ${paso >= 4 ? 'active' : ''}`}>
                <span className="step-num">4</span>
                <span className="step-label">Confirmar</span>
              </div>
            </div>

            {/* PASO 1: ELEGIR SERVICIO */}
            {paso === 1 && (
              <section className="card animate-in">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">1. Selecciona tu Servicio</h2>
                    <p className="faint small">Elige el servicio que deseas realizarte.</p>
                  </div>
                </div>

                {/* Filtro por Área */}
                <div className="segmented mb-16">
                  <button
                    className={areaFiltro === 'todas' ? 'active' : ''}
                    onClick={() => setAreaFiltro('todas')}
                  >
                    Todos
                  </button>
                  <button
                    className={areaFiltro === 'barberia' ? 'active' : ''}
                    onClick={() => setAreaFiltro('barberia')}
                  >
                    <Icon name="scissors" /> Barbería (Caballeros)
                  </button>
                  <button
                    className={areaFiltro === 'women' ? 'active' : ''}
                    onClick={() => setAreaFiltro('women')}
                  >
                    <Icon name="sparkles" /> Zona Women (Damas)
                  </button>
                </div>

                <div className="reserva-services-grid">
                  {serviciosFiltrados.map((s) => {
                    const seleccionado = servicioSeleccionado?.id === s.id
                    return (
                      <div
                        key={s.id}
                        className={`reserva-service-card ${seleccionado ? 'selected' : ''}`}
                        onClick={() => {
                          setServicioSeleccionado(s)
                          // Si el empleado actual no hace este tipo de servicio, lo reseteamos
                          if (empleadoSeleccionado && s.area && empleadoSeleccionado.area !== s.area) {
                            setEmpleadoSeleccionado(null)
                          }
                          setPaso(2)
                        }}
                      >
                        <div className="row-between">
                          <strong style={{ fontSize: 16 }}>{s.nombre}</strong>
                          <span className="mono gold-text" style={{ fontSize: 17, fontWeight: 700 }}>
                            {money(s.precio)}
                          </span>
                        </div>
                        <div className="row mt-8" style={{ gap: 12 }}>
                          <span className="faint small row" style={{ gap: 4 }}>
                            <Icon name="clock" size={14} /> {duracion(s.duracion_minutos)}
                          </span>
                          <span className={`badge ${s.area === 'women' ? 'badge-rose' : 'badge-gold'} no-dot`}>
                            {AREAS[s.area]?.label || 'Todos'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* PASO 2: ELEGIR PROFESIONAL */}
            {paso === 2 && (
              <section className="card animate-in">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">2. Elige a tu Profesional</h2>
                    <p className="faint small">
                      Servicio: <strong>{servicioSeleccionado?.nombre}</strong> ({money(servicioSeleccionado?.precio)})
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPaso(1)}>
                    Cambiar servicio
                  </button>
                </div>

                <div className="reserva-staff-grid">
                  {empleadosFiltrados.map((emp) => {
                    const seleccionado = empleadoSeleccionado?.id === emp.id
                    return (
                      <div
                        key={emp.id}
                        className={`reserva-staff-card ${seleccionado ? 'selected' : ''}`}
                        onClick={() => {
                          setEmpleadoSeleccionado(emp)
                          setPaso(3)
                        }}
                      >
                        <Avatar nombre={emp.nombre} area={emp.area} size="lg" />
                        <div style={{ textAlign: 'center', marginTop: 10 }}>
                          <strong style={{ display: 'block', fontSize: 15 }}>{emp.nombre}</strong>
                          <span className={`badge ${emp.area === 'women' ? 'badge-rose' : 'badge-gold'} no-dot mt-8`}>
                            {AREAS[emp.area]?.label || emp.area}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={`btn btn-sm btn-block mt-16 ${seleccionado ? 'btn-primary' : ''}`}
                        >
                          {seleccionado ? 'Seleccionado' : 'Elegir'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* PASO 3: FECHA Y HORA DISPONIBLE (PREVIENE COLAPSOS Y CRUCES) */}
            {paso === 3 && (
              <section className="card animate-in">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">3. Selecciona Fecha y Hora</h2>
                    <p className="faint small">
                      Con <strong>{empleadoSeleccionado?.nombre}</strong> · Solo se muestran horarios disponibles en tiempo real.
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPaso(2)}>
                    Cambiar profesional
                  </button>
                </div>

                {/* Tira de Días */}
                <label className="label mb-8">Elige el Día:</label>
                <div className="reserva-days-strip">
                  {diasDisponibles.map((dia, idx) => {
                    const seleccionado = sameDay(dia, fechaSeleccionada)
                    const esHoy = sameDay(dia, new Date())
                    const dow = dia.toLocaleDateString('es-CO', { weekday: 'short' })
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`day-pill ${seleccionado ? 'active' : ''} ${esHoy ? 'today' : ''}`}
                        onClick={() => setFechaSeleccionada(dia)}
                      >
                        <span className="dow">{dow}</span>
                        <span className="dnum">{dia.getDate()}</span>
                        <span className="small faint">{dia.toLocaleDateString('es-CO', { month: 'short' })}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Grilla de Horas Disponibles */}
                <div className="mt-24">
                  <div className="row-between mb-12">
                    <label className="label">
                      Horas Disponibles para el <span style={{ textTransform: 'capitalize' }}>{fechaLarga(fechaSeleccionada)}</span>:
                    </label>
                    {cargandoSlots && <Spinner />}
                  </div>

                  {cargandoSlots ? (
                    <div style={{ padding: '24px 0', textAlign: 'center' }}>
                      <span className="faint small">Calculando disponibilidad en tiempo real…</span>
                    </div>
                  ) : slotsDisponibles.length === 0 ? (
                    <Empty icon="clock" title="No hay turnos disponibles para esta fecha">
                      {empleadoSeleccionado?.nombre} tiene su agenda llena o no tiene turnos libres en este día.
                      Por favor selecciona otro día u otro profesional.
                    </Empty>
                  ) : (
                    <div className="reserva-slots-grid">
                      {slotsDisponibles.map((slotIso) => {
                        const seleccionado = horaSeleccionada === slotIso
                        return (
                          <button
                            key={slotIso}
                            type="button"
                            className={`slot-btn ${seleccionado ? 'selected' : ''}`}
                            onClick={() => {
                              setHoraSeleccionada(slotIso)
                              setPaso(4)
                            }}
                          >
                            <Icon name="clock" size={14} />
                            <span>{hora(slotIso)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* PASO 4: DATOS DEL CLIENTE Y CONFIRMACIÓN */}
            {paso === 4 && (
              <section className="card animate-in" style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
                <div className="card-header">
                  <div>
                    <h2 className="card-title">4. Tus Datos de Contacto</h2>
                    <p className="faint small">Completa tu información para apartar tu turno.</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPaso(3)}>
                    Cambiar hora
                  </button>
                </div>

                {/* Resumen de la Selección */}
                <div className="receipt mb-24">
                  <div className="receipt-row">
                    <span className="muted">Servicio:</span>
                    <strong>{servicioSeleccionado?.nombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Profesional:</span>
                    <strong>{empleadoSeleccionado?.nombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Horario:</span>
                    <strong style={{ color: 'var(--gold)' }}>
                      {fechaCorta(fechaSeleccionada)} · {hora(horaSeleccionada)}
                    </strong>
                  </div>
                  <div className="receipt-row total">
                    <span>Precio:</span>
                    <span className="gold-text">{money(servicioSeleccionado?.precio)}</span>
                  </div>
                </div>

                {errorReserva && <div className="form-error mb-16">{errorReserva}</div>}

                <form onSubmit={handleConfirmarReserva} className="col" style={{ gap: 16 }}>
                  <div className="field">
                    <label className="label" htmlFor="res-cliente">Tu Nombre Completo *</label>
                    <div className="input-icon">
                      <Icon name="user" />
                      <input
                        id="res-cliente"
                        className="input"
                        required
                        placeholder="Ej. Juan Pérez"
                        value={clienteNombre}
                        onChange={(e) => setClienteNombre(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="res-telefono">Número de Celular / WhatsApp *</label>
                    <div className="input-icon">
                      <Icon name="phone" />
                      <input
                        id="res-telefono"
                        type="tel"
                        className="input"
                        required
                        placeholder="Ej. 300 123 4567"
                        value={clienteTelefono}
                        onChange={(e) => setClienteTelefono(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="res-notas">Indicaciones o Notas (Opcional)</label>
                    <textarea
                      id="res-notas"
                      className="textarea"
                      rows={2}
                      placeholder="Ej. Fade bajo con navaja, diseño en cejas..."
                      value={clienteNotas}
                      onChange={(e) => setClienteNotas(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg btn-block mt-8"
                    disabled={enviando}
                  >
                    {enviando ? <Spinner /> : <><Icon name="check" /> Confirmar Mi Cita</>}
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
