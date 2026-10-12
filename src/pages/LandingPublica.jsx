import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Empty, Modal, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { NEGOCIO_INFO, REDES_SOCIALES } from '../lib/constants'
import { addDays, fechaCorta, fechaLarga, hora, money, sameDay, startOfDay } from '../lib/format'
import { esDiaDescanso, getEmpleadoHorario } from '../lib/horarios'

export default function LandingPublica() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [catalogo, setCatalogo] = useState({ barberia: null, servicios: [], empleados: [] })
  const [loading, setLoading] = useState(true)

  // Estado del Modal de Reserva Rápida Sincronizada
  const [modalReserva, setModalReserva] = useState(false)
  const [corteSeleccionado, setCorteSeleccionado] = useState(null)
  const [pasoReserva, setPasoReserva] = useState(1) // 1: Barbero, 2: Calendario y Hora, 3: Datos Cliente, 4: Éxito
  const [barberoSeleccionado, setBarberoSeleccionado] = useState(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => startOfDay())
  const [horaSeleccionada, setHoraSeleccionada] = useState(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteNotas, setClienteNotas] = useState('')
  const [slotsDisponibles, setSlotsDisponibles] = useState([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [enviandoCita, setEnviandoCita] = useState(false)
  const [citaConfirmada, setCitaConfirmada] = useState(null)

  // Cargar catálogo público
  useEffect(() => {
    api.getPublicCatalog()
      .then((data) => setCatalogo(data))
      .catch((err) => console.error('Error cargando catálogo público:', err))
      .finally(() => setLoading(false))
  }, [])

  // Lista de Cortes de la Cuadrícula Principal (Estilo idéntico a la imagen de Barber Revolution)
  const cortesPrincipales = [
    {
      id: 'c1',
      nombre: 'Corte Degradado / Fade',
      precio: 25000,
      duracion: 35,
      imagen: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c2',
      nombre: 'Arreglo de Barba',
      precio: 15000,
      duracion: 25,
      imagen: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c3',
      nombre: 'Corte Clásico',
      precio: 25000,
      duracion: 30,
      imagen: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c4',
      nombre: 'Diseño de Cejas',
      precio: 10000,
      duracion: 15,
      imagen: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c5',
      nombre: 'Corte + Cejas',
      precio: 30000,
      duracion: 40,
      imagen: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c6',
      nombre: 'Corte de Cejas',
      precio: 10000,
      duracion: 15,
      imagen: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c7',
      nombre: 'Diseño de Cejas',
      precio: 10000,
      duracion: 15,
      imagen: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c8',
      nombre: 'Corte de Barba',
      precio: 15000,
      duracion: 25,
      imagen: 'https://images.unsplash.com/photo-1517832606589-7629c3395909?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c9',
      nombre: 'Corte Clásico',
      precio: 25000,
      duracion: 30,
      imagen: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c10',
      nombre: 'Diseño de Cejas',
      precio: 10000,
      duracion: 15,
      imagen: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c11',
      nombre: 'Corte Clásico',
      precio: 25000,
      duracion: 30,
      imagen: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'c12',
      nombre: 'Diseño de Cejas',
      precio: 10000,
      duracion: 15,
      imagen: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=600&q=80',
    },
  ]

  // Cortes inferiores de cejas ("Síguenos en nuestras redes")
  const cortesCejasInferiores = [
    {
      id: 'cj1',
      nombre: 'Diseño de Cejas',
      precio: 15000,
      imagen: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'cj2',
      nombre: 'Diseño de Cejas',
      precio: 15000,
      imagen: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'cj3',
      nombre: 'Diseño de Cejas',
      precio: 10000,
      imagen: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    },
  ]

  // Próximos 7 días hábiles para el calendario de reserva
  const diasDisponibles = useMemo(() => {
    const hoy = startOfDay()
    return Array.from({ length: 7 }, (_, i) => addDays(hoy, i))
  }, [])

  // Lista de Barberos activos del catálogo
  const barberosDisponibles = useMemo(() => {
    return catalogo.empleados.filter((e) => e.activo !== false && e.area === 'barberia')
  }, [catalogo.empleados])

  // Abrir modal de reserva al hacer clic en "Reservar" en cualquier corte
  const iniciarReservaCorte = (corte) => {
    setCorteSeleccionado(corte)
    setPasoReserva(1)
    setBarberoSeleccionado(null)
    setHoraSeleccionada(null)
    setCitaConfirmada(null)
    setModalReserva(true)
  }

  // Cargar turnos disponibles del barbero y fecha seleccionados
  useEffect(() => {
    if (!barberoSeleccionado || !fechaSeleccionada || pasoReserva !== 2) return

    setCargandoSlots(true)
    const durMin = corteSeleccionado?.duracion || 30

    api.getPublicAvailableSlots({
      empleadoId: barberoSeleccionado.id,
      fecha: fechaSeleccionada,
      duracionMinutos: durMin,
    })
      .then((slots) => setSlotsDisponibles(slots))
      .catch((err) => {
        console.error('Error calculando disponibilidad:', err)
        setSlotsDisponibles([])
      })
      .finally(() => setCargandoSlots(false))
  }, [barberoSeleccionado, fechaSeleccionada, pasoReserva, corteSeleccionado])

  // Confirmar cita y sincronizar con la base de datos
  const handleConfirmarCita = async (e) => {
    e.preventDefault()
    if (!clienteNombre.trim() || !clienteTelefono.trim()) {
      alert('Por favor ingresa tu nombre y número de celular.')
      return
    }
    if (!horaSeleccionada) {
      alert('Por favor selecciona una hora de atención disponible.')
      return
    }

    setEnviandoCita(true)
    try {
      const servEncontrado = catalogo.servicios.find((s) =>
        s.nombre.toLowerCase().includes(corteSeleccionado.nombre.toLowerCase()) ||
        corteSeleccionado.nombre.toLowerCase().includes(s.nombre.toLowerCase())
      ) || catalogo.servicios[0]

      const cita = await api.createCitaPublica({
        barberia_id: catalogo.barberia?.id,
        cliente: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
        empleado_id: barberoSeleccionado.id,
        servicio_id: servEncontrado?.id,
        fecha_hora: horaSeleccionada,
        notas: clienteNotas.trim() || `Reserva online: ${corteSeleccionado.nombre}`,
      })

      setCitaConfirmada(cita)
      setPasoReserva(4) // Pantalla de confirmación exitosa
    } catch (err) {
      alert(err.message || 'Error al agendar la cita. Por favor intenta otro horario.')
    } finally {
      setEnviandoCita(false)
    }
  }

  // Generar link directo a WhatsApp para la dueña
  const generarWhatsAppConfirmacion = () => {
    if (!citaConfirmada) return '#'
    const fechaTxt = fechaLarga(citaConfirmada.fecha_hora)
    const horaTxt = hora(citaConfirmada.fecha_hora)
    const msg = encodeURIComponent(
      `¡Hola Barber's Revolution! 👋 Acabo de agendar una cita por su página web:\n\n` +
      `👤 Cliente: ${clienteNombre}\n` +
      `📱 Teléfono: ${clienteTelefono}\n` +
      `✂️ Corte: ${corteSeleccionado?.nombre}\n` +
      `💈 Barbero: ${barberoSeleccionado?.nombre}\n` +
      `📅 Fecha: ${fechaTxt}\n` +
      `⏰ Hora: ${horaTxt}\n` +
      `💰 Precio: ${money(corteSeleccionado?.precio)}\n\n` +
      `¿Podrían confirmarme la cita por favor? ¡Muchas gracias!`
    )
    return `${REDES_SOCIALES.whatsapp}?text=${msg}`
  }

  return (
    <div className="landing-revolution-root">
      {/* ========================================================= */}
      {/* BARRA FLOTANTE DE REDES SOCIALES (Costado Izquierdo Fijo)  */}
      {/* ========================================================= */}
      <aside className="revolution-social-floating" aria-label="Redes Sociales">
        <a
          href={REDES_SOCIALES.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn facebook"
          title="Síguenos en Facebook"
        >
          <Icon name="facebook" size={22} />
        </a>
        <a
          href={REDES_SOCIALES.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn whatsapp"
          title="Escríbenos a WhatsApp"
        >
          <Icon name="smartphone" size={22} />
        </a>
        <a
          href={REDES_SOCIALES.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn instagram"
          title="Síguenos en Instagram (@barbersrevolution)"
        >
          <Icon name="instagram" size={22} />
        </a>
        <a
          href={REDES_SOCIALES.tiktok}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn tiktok"
          title="Síguenos en TikTok (@barbers.revolution)"
        >
          <Icon name="video" size={20} />
        </a>
      </aside>

      {/* ========================================================= */}
      {/* HEADER / BARRA DE NAVEGACIÓN SUPERIOR                     */}
      {/* ========================================================= */}
      <header className="revolution-header">
        <div className="revolution-header-inner">
          {/* Logo Barber Revolution */}
          <Link to="/" className="revolution-brand">
            <div className="brand-scissors-icon">✂️</div>
            <div className="brand-text">
              <span className="brand-script">Barber</span>
              <span className="brand-revolution">Revolution</span>
            </div>
          </Link>

          {/* Menú Central */}
          <nav className="revolution-nav">
            <a href="#inicio" className="nav-link active">Inicio</a>
            <a href="#servicios" className="nav-link">Servicios</a>
            <a href="#galeria" className="nav-link">Galería</a>
            <a href="#contacto" className="nav-link">Contacto</a>
          </nav>

          {/* Acceso Administradora */}
          <div className="revolution-header-actions">
            <Link to="/login" className="login-link">
              Login
            </Link>
            <Link to={session ? "/dashboard" : "/login"} className="btn-admin-pill">
              <Icon name="user" size={15} />
              <span>{session ? `Admin (${profile?.nombre?.split(' ')[0] || 'Dueña'})` : 'Área de Administradora'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Banner de Ubicación y Sede Oficial */}
      <div className="revolution-location-bar">
        <div className="container row-between wrap" style={{ gap: 8, alignItems: 'center' }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <span>{NEGOCIO_INFO.direccion}</span>
          </div>
          <div className="row" style={{ gap: 16 }}>
            <span>Horario: Lun a Sáb 9:00 AM – 9:00 PM</span>
            <a href={REDES_SOCIALES.instagram} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
              @barbersrevolution
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CUADRÍCULA PRINCIPAL DE CORTES (IDÉNTICO A LA FOTO)       */}
      {/* ========================================================= */}
      <main className="revolution-main-content container" id="servicios">
        <div className="revolution-grid-4">
          {cortesPrincipales.map((corte) => (
            <div key={corte.id} className="revolution-cut-card">
              <div className="cut-image-wrapper">
                <img
                  src={corte.imagen}
                  alt={corte.nombre}
                  className="cut-image"
                  loading="lazy"
                />
              </div>

              <div className="cut-info">
                <h3 className="cut-title">{corte.nombre}</h3>
                <div className="cut-price">{money(corte.precio)}</div>
                <button
                  type="button"
                  className="cut-btn-reservar"
                  onClick={() => iniciarReservaCorte(corte)}
                >
                  Reservar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ========================================================= */}
        {/* SECCIÓN INFERIOR: SÍGUENOS EN NUESTRAS REDES              */}
        {/* ========================================================= */}
        <section className="revolution-bottom-section" id="galeria">
          <div className="row-between wrap mb-20" style={{ alignItems: 'flex-end', gap: 16 }}>
            <div>
              <p className="eyebrow" style={{ color: 'var(--gold)', letterSpacing: 2 }}>DISEÑOS & TENDENCIAS</p>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Síguenos en nuestras redes</h2>
              <p className="faint small" style={{ margin: '4px 0 0' }}>
                Conoce más trabajos en vivo en nuestro Instagram y TikTok oficial.
              </p>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <a href={REDES_SOCIALES.facebook} target="_blank" rel="noreferrer" className="social-pill-btn fb">
                <Icon name="facebook" size={16} /> Facebook
              </a>
              <a href={REDES_SOCIALES.whatsapp} target="_blank" rel="noreferrer" className="social-pill-btn wa">
                <Icon name="smartphone" size={16} /> WhatsApp
              </a>
              <a href={REDES_SOCIALES.instagram} target="_blank" rel="noreferrer" className="social-pill-btn ig">
                <Icon name="instagram" size={16} /> Instagram
              </a>
              <a href={REDES_SOCIALES.tiktok} target="_blank" rel="noreferrer" className="social-pill-btn tk">
                <Icon name="video" size={16} /> TikTok
              </a>
            </div>
          </div>

          <div className="revolution-grid-3">
            {cortesCejasInferiores.map((corte) => (
              <div key={corte.id} className="revolution-cut-card">
                <div className="cut-image-wrapper">
                  <img
                    src={corte.imagen}
                    alt={corte.nombre}
                    className="cut-image"
                    loading="lazy"
                  />
                </div>
                <div className="cut-info">
                  <h3 className="cut-title">{corte.nombre}</h3>
                  <div className="cut-price">{money(corte.precio)}</div>
                  <button
                    type="button"
                    className="cut-btn-reservar"
                    onClick={() => iniciarReservaCorte(corte)}
                  >
                    Reservar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* FOOTER OFICIAL CON DATOS DE CAJICÁ                        */}
      {/* ========================================================= */}
      <footer className="revolution-footer" id="contacto">
        <div className="container revolution-footer-grid">
          <div>
            <div className="brand-text mb-8">
              <span className="brand-script">Barber</span>
              <span className="brand-revolution">Revolution</span>
            </div>
            <p className="faint small" style={{ maxWidth: 320, lineHeight: 1.6 }}>
              {NEGOCIO_INFO.slogan}. La mejor atención para caballeros y damas en Cajicá.
            </p>
            <div className="mt-12 faint small">
              📍 {NEGOCIO_INFO.direccion}
            </div>
          </div>

          <div>
            <div className="footer-title">Redes Oficiales</div>
            <div className="col" style={{ gap: 8 }}>
              <a href={REDES_SOCIALES.instagram} target="_blank" rel="noreferrer" className="footer-link">
                Instagram: @barbersrevolution
              </a>
              <a href={REDES_SOCIALES.tiktok} target="_blank" rel="noreferrer" className="footer-link">
                TikTok: @barbers.revolution
              </a>
              <a href={REDES_SOCIALES.facebook} target="_blank" rel="noreferrer" className="footer-link">
                Facebook: Barbers Revolution
              </a>
              <a href={REDES_SOCIALES.whatsapp} target="_blank" rel="noreferrer" className="footer-link">
                WhatsApp: {REDES_SOCIALES.telefono}
              </a>
            </div>
          </div>

          <div>
            <div className="footer-title">Acceso al Software</div>
            <p className="faint small mb-12">
              Panel exclusivo de la administradora para control de caja, arqueo en tiempo real y corte de los sábados.
            </p>
            <Link to="/login" className="btn btn-outline btn-sm" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}>
              🔐 Acceso Administradora
            </Link>
          </div>
        </div>

        <div className="container revolution-footer-bottom text-center faint small">
          © {new Date().getFullYear()} Barber's Revolution · Centro Comercial Sexta Avenida, Cajicá. Todos los derechos reservados.
        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL DE RESERVA EN TIEMPO REAL CON CALENDARIO            */}
      {/* ========================================================= */}
      <Modal
        open={modalReserva}
        onClose={() => setModalReserva(false)}
        title={corteSeleccionado ? `Agendar: ${corteSeleccionado.nombre}` : 'Reserva de Cita'}
        subtitle={corteSeleccionado ? `Precio: ${money(corteSeleccionado.precio)} · Duración estimada: ${corteSeleccionado.duracion || 30} min` : ''}
        size="lg"
      >
        {corteSeleccionado && (
          <div className="stack" style={{ gap: 20 }}>
            {/* Encabezado del corte seleccionado */}
            <div
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <img
                src={corteSeleccionado.imagen}
                alt={corteSeleccionado.nombre}
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
              />
              <div className="grow">
                <strong style={{ fontSize: 16 }}>{corteSeleccionado.nombre}</strong>
                <div className="gold-text mono font-bold" style={{ fontSize: 18 }}>
                  {money(corteSeleccionado.precio)}
                </div>
              </div>
              {pasoReserva > 1 && pasoReserva < 4 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPasoReserva(pasoReserva - 1)}
                >
                  ← Paso anterior
                </button>
              )}
            </div>

            {/* PASO 1: ELEGIR AL BARBERO CON SUS FOTOS */}
            {pasoReserva === 1 && (
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
                  1. Elige con qué barbero deseas atenderte:
                </label>

                {barberosDisponibles.length === 0 ? (
                  <div className="loader-screen" style={{ minHeight: '150px' }}>
                    <Spinner />
                  </div>
                ) : (
                  <div className="reserva-modal-staff-grid">
                    {barberosDisponibles.map((barbero) => {
                      const h = getEmpleadoHorario(barbero)
                      return (
                        <div
                          key={barbero.id}
                          className="reserva-modal-staff-card"
                          onClick={() => {
                            setBarberoSeleccionado(barbero)
                            setPasoReserva(2)
                          }}
                        >
                          <Avatar nombre={barbero.nombre} area="barberia" size="lg" />
                          <div style={{ textAlign: 'center', marginTop: 10 }}>
                            <strong style={{ fontSize: 15, display: 'block' }}>{barbero.nombre}</strong>
                            <span className="badge badge-gold no-dot mt-6" style={{ fontSize: 11 }}>
                              Barbero Profesional
                            </span>
                            <div className="faint small mt-4" style={{ fontSize: 11 }}>
                              🏖️ Descansa: {h.diaNombre}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm w-full mt-12"
                            style={{ justifyContent: 'center' }}
                          >
                            Elegir a {barbero.nombre.split(' ')[0]}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: CALENDARIO SINCRONIZADO EN TIEMPO REAL */}
            {pasoReserva === 2 && barberoSeleccionado && (
              <div>
                <div className="row-between wrap mb-12" style={{ alignItems: 'center' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
                    2. Selecciona Fecha y Hora con {barberoSeleccionado.nombre}:
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPasoReserva(1)}
                  >
                    Cambiar Barbero
                  </button>
                </div>

                {/* Tira de Días del Calendario */}
                <div className="reserva-days-strip mb-16">
                  {diasDisponibles.map((dia) => {
                    const seleccionado = sameDay(dia, fechaSeleccionada)
                    const esHoy = sameDay(dia, new Date())
                    const dow = dia.toLocaleDateString('es-CO', { weekday: 'short' })
                    const descanso = esDiaDescanso(barberoSeleccionado, dia)

                    return (
                      <button
                        key={dia.toISOString()}
                        type="button"
                        className={`day-btn ${seleccionado ? 'selected' : ''} ${descanso ? 'day-descanso' : ''}`}
                        onClick={() => {
                          setFechaSeleccionada(dia)
                          setHoraSeleccionada(null)
                        }}
                      >
                        <span className="day-name">{esHoy ? 'Hoy' : dow}</span>
                        <span className="day-number">{dia.getDate()}</span>
                        {descanso && <span className="day-tag-descanso">Descanso</span>}
                      </button>
                    )
                  })}
                </div>

                {/* Horas Disponibles en Tiempo Real */}
                {esDiaDescanso(barberoSeleccionado, fechaSeleccionada) ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      background: 'rgba(234, 179, 8, 0.08)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🏖️</div>
                    <strong style={{ color: 'var(--amber)', fontSize: 16 }}>
                      {barberoSeleccionado.nombre} descansa los {getEmpleadoHorario(barberoSeleccionado).diaNombre}
                    </strong>
                    <p className="faint small mt-6">
                      Por favor selecciona otro día en la barra superior o elige a otro de nuestros barberos disponibles.
                    </p>
                  </div>
                ) : cargandoSlots ? (
                  <div className="loader-screen" style={{ minHeight: '120px' }}>
                    <Spinner />
                  </div>
                ) : slotsDisponibles.length === 0 ? (
                  <Empty icon="clock" title="Sin turnos disponibles para esta fecha">
                    {barberoSeleccionado.nombre} tiene su agenda completa para este día. Por favor prueba otra fecha.
                  </Empty>
                ) : (
                  <div>
                    <label className="form-label small mb-8">Horas libres disponibles:</label>
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
                              setPasoReserva(3) // Avanzar al paso de datos
                            }}
                          >
                            <Icon name="clock" size={14} />
                            <span>{hora(slotIso)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASO 3: DATOS DEL CLIENTE (NOMBRE Y CELULAR) */}
            {pasoReserva === 3 && (
              <form onSubmit={handleConfirmarCita} className="stack" style={{ gap: 16 }}>
                <div className="receipt">
                  <div className="receipt-row">
                    <span className="muted">Corte:</span>
                    <strong>{corteSeleccionado.nombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Barbero:</span>
                    <strong>{barberoSeleccionado?.nombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Horario:</span>
                    <strong className="gold-text">
                      {fechaCorta(fechaSeleccionada)} · {hora(horaSeleccionada)}
                    </strong>
                  </div>
                  <div className="receipt-row total">
                    <span>Precio:</span>
                    <span className="gold-text mono font-bold">{money(corteSeleccionado.precio)}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Tu Nombre Completo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Juan David Pérez"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">📱 Celular / WhatsApp</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Ej: 312 456 7890"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    required
                  />
                  <span className="form-hint">
                    Te enviaremos la confirmación directa a tu WhatsApp.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas o Indicaciones (Opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Fade bajo, diseño de línea al lado..."
                    value={clienteNotas}
                    onChange={(e) => setClienteNotas(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 16, height: 48 }}
                  disabled={enviandoCita}
                >
                  {enviandoCita ? <Spinner size="sm" /> : <Icon name="check" size={18} />}{' '}
                  Confirmar Mi Cita en Barber's Revolution
                </button>
              </form>
            )}

            {/* PASO 4: PANTALLA DE ÉXITO Y ENVÍO A WHATSAPP */}
            {pasoReserva === 4 && (
              <div className="text-center stack" style={{ gap: 16, padding: '10px 0' }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)', margin: 0 }}>
                  ¡Tu Cita fue Apartada Exitosamente!
                </h3>
                <p className="faint small" style={{ maxWidth: 440, margin: '0 auto' }}>
                  Tu turno con <strong>{barberoSeleccionado?.nombre}</strong> para el{' '}
                  <strong>{fechaCorta(fechaSeleccionada)} a las {hora(horaSeleccionada)}</strong> quedó agendado.
                </p>

                <div className="receipt mt-8" style={{ textAlign: 'left' }}>
                  <div className="receipt-row">
                    <span className="muted">Cliente:</span>
                    <strong>{clienteNombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Servicio:</span>
                    <span>{corteSeleccionado?.nombre}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Valor a pagar en barbería:</span>
                    <strong className="gold-text mono">{money(corteSeleccionado?.precio)}</strong>
                  </div>
                </div>

                <div className="stack" style={{ gap: 10, marginTop: 12 }}>
                  <a
                    href={generarWhatsAppConfirmacion()}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-lg"
                    style={{
                      background: 'linear-gradient(135deg, #25D366, #128C7E)',
                      borderColor: '#128C7E',
                      color: '#fff',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="smartphone" size={20} /> Enviar Confirmación por WhatsApp
                  </a>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setModalReserva(false)}
                  >
                    Listo, Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
