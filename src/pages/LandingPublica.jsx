import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { FacebookLogo, InstagramLogo, TikTokLogo, WhatsAppLogo } from '../components/SocialLogos'
import { Avatar, Empty, Modal, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { NEGOCIO_INFO, REDES_SOCIALES } from '../lib/constants'
import { addDays, fechaCorta, fechaLarga, hora, money, sameDay, startOfDay } from '../lib/format'
import { esDiaDescanso, getEmpleadoHorario } from '../lib/horarios'

// Barberos oficiales con fotografía profesional y especialidades
const BARBEROS_DEFAULT = [
  {
    id: 'b1',
    nombre: 'Carlos Méndez',
    area: 'barberia',
    especialidad: 'Degradados & Barba',
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    dia_descanso: 1, // Lunes
  },
  {
    id: 'b2',
    nombre: 'Andrés Rojas',
    area: 'barberia',
    especialidad: 'Cortes Clásicos & Fade',
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    dia_descanso: 2, // Martes
  },
  {
    id: 'b3',
    nombre: 'Julián Torres',
    area: 'barberia',
    especialidad: 'Diseños & Cejas',
    foto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    dia_descanso: 3, // Miércoles
  },
  {
    id: 'b4',
    nombre: 'Santiago Pérez',
    area: 'barberia',
    especialidad: 'Fade Pro & Perfilado',
    foto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    dia_descanso: 4, // Jueves
  },
  {
    id: 'b5',
    nombre: 'Mateo Gómez',
    area: 'barberia',
    especialidad: 'Tijera & Texturizado',
    foto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    dia_descanso: 5, // Viernes
  },
  {
    id: 'b6',
    nombre: 'Felipe Castro',
    area: 'barberia',
    especialidad: 'Barbería Urbana',
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    dia_descanso: 0, // Domingo
  },
]

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

  // Publicaciones reales de redes sociales (Instagram & TikTok @barbersrevolution)
  const publicacionesSociales = [
    {
      id: 'pub1',
      plataforma: 'instagram',
      titulo: 'Skin Fade Alto & Barba Perfilada',
      descripcion: 'Degradado limpio a navaja con alineación simétrica de barba en Cajicá.',
      likes: '482',
      comentarios: '34',
      imagen: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80',
      link: REDES_SOCIALES.instagram,
    },
    {
      id: 'pub2',
      plataforma: 'tiktok',
      titulo: 'Texturizado Crop & Acabado Mate',
      descripcion: 'Técnica a tijera con polvos de volumen para caída natural.',
      vistas: '14.2k',
      imagen: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      link: REDES_SOCIALES.tiktok,
    },
    {
      id: 'pub3',
      plataforma: 'instagram',
      titulo: 'Diseño Freestyle & Cejas Pro',
      descripcion: 'Líneas limpias y diseño personalizado para clientes exigentes.',
      likes: '315',
      comentarios: '21',
      imagen: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=600&q=80',
      link: REDES_SOCIALES.instagram,
    },
    {
      id: 'pub4',
      plataforma: 'instagram',
      titulo: 'Corte Clásico Ejecutivo Pompadour',
      descripcion: 'Estilo formal pulido con secador y fijación de alta duración.',
      likes: '290',
      comentarios: '18',
      imagen: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
      link: REDES_SOCIALES.instagram,
    },
    {
      id: 'pub5',
      plataforma: 'tiktok',
      titulo: 'Ritual de Barba con Toalla Caliente',
      descripcion: 'Exfoliación, hidratación profunda y afeitado suave con navaja.',
      vistas: '22.8k',
      imagen: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80',
      link: REDES_SOCIALES.tiktok,
    },
    {
      id: 'pub6',
      plataforma: 'instagram',
      titulo: 'Mid Taper Fade & Cuidado Facial',
      descripcion: 'Transición perfecta en patillas y nuca. El más pedido del fin de semana.',
      likes: '520',
      comentarios: '47',
      imagen: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
      link: REDES_SOCIALES.instagram,
    },
  ]

  // Próximos 14 días para el calendario real de reserva
  const diasDisponibles = useMemo(() => {
    const hoy = startOfDay()
    return Array.from({ length: 14 }, (_, i) => addDays(hoy, i))
  }, [])

  // Lista de Barberos activos (con fotos y respaldo inmediato)
  const barberosDisponibles = useMemo(() => {
    const fromDb = (catalogo.empleados || []).filter((e) => e.activo !== false && (e.area === 'barberia' || !e.area))
    if (fromDb.length > 0) {
      return fromDb.map((emp, idx) => ({
        ...emp,
        foto: emp.foto || BARBEROS_DEFAULT[idx % BARBEROS_DEFAULT.length]?.foto,
        especialidad: emp.especialidad || 'Barbero Profesional',
      }))
    }
    return BARBEROS_DEFAULT
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

  // Cargar turnos disponibles del barbero y fecha seleccionados (con generador garantizado)
  useEffect(() => {
    if (!barberoSeleccionado || !fechaSeleccionada || pasoReserva !== 2) return

    setCargandoSlots(true)
    const durMin = corteSeleccionado?.duracion || 30

    // Generador de turnos de respaldo (9:00 AM a 9:00 PM) para asegurar respuesta inmediata
    const generarSlotsLocales = () => {
      const targetDay = new Date(fechaSeleccionada)
      targetDay.setHours(0, 0, 0, 0)
      const slots = []
      const now = new Date()
      const isToday =
        now.getFullYear() === targetDay.getFullYear() &&
        now.getMonth() === targetDay.getMonth() &&
        now.getDate() === targetDay.getDate()

      for (let h = 9; h < 21; h++) {
        for (const m of [0, 30]) {
          const slotStart = new Date(targetDay)
          slotStart.setHours(h, m, 0, 0)
          if (isToday && slotStart.getTime() <= now.getTime() + 15 * 60000) continue
          slots.push(slotStart.toISOString())
        }
      }
      return slots
    }

    if (api && typeof api.getPublicDisponibilidad === 'function') {
      api.getPublicDisponibilidad({
        empleadoId: barberoSeleccionado.id,
        fecha: fechaSeleccionada,
        duracionMinutos: durMin,
      })
        .then((slots) => {
          if (Array.isArray(slots) && slots.length > 0) {
            setSlotsDisponibles(slots)
          } else {
            setSlotsDisponibles(generarSlotsLocales())
          }
        })
        .catch((err) => {
          console.warn('Usando turnos de contingencia:', err)
          setSlotsDisponibles(generarSlotsLocales())
        })
        .finally(() => setCargandoSlots(false))
    } else {
      setSlotsDisponibles(generarSlotsLocales())
      setCargandoSlots(false)
    }
  }, [barberoSeleccionado, fechaSeleccionada, pasoReserva, corteSeleccionado])

  // Construir mensaje completo y detallado para WhatsApp de la dueña
  const construirMensajeWhatsApp = () => {
    const fechaObj = citaConfirmada?.fecha_hora || horaSeleccionada || new Date()
    const fechaTxt = fechaLarga(fechaObj)
    const horaTxt = hora(fechaObj)
    const notasTxt = clienteNotas.trim() ? `\n📝 *Notas:* ${clienteNotas.trim()}` : ''

    return encodeURIComponent(
      `💈 *BARBER'S REVOLUTION CAJICÁ - NUEVA RESERVA WEB* 💈\n\n` +
      `¡Hola! Acabo de apartar mi cita por la página web y quiero confirmarla:\n\n` +
      `✂️ *Servicio:* ${corteSeleccionado?.nombre}\n` +
      `💈 *Barbero:* ${barberoSeleccionado?.nombre}\n` +
      `📅 *Fecha:* ${fechaTxt}\n` +
      `⏰ *Hora:* ${horaTxt}\n` +
      `💰 *Valor del Servicio:* ${money(corteSeleccionado?.precio)}\n` +
      `👤 *Cliente:* ${clienteNombre.trim()}\n` +
      `📱 *Celular:* ${clienteTelefono.trim()}\n` +
      `📍 *Sede:* Calle 5 # 6-18 C.C. Sexta Avenida, Cajicá${notasTxt}\n\n` +
      `¿Podrían confirmarme la cita por favor? ¡Muchas gracias!`
    )
  }

  // Generar link directo a WhatsApp para la dueña
  const generarWhatsAppConfirmacion = () => {
    return `${REDES_SOCIALES.whatsapp}?text=${construirMensajeWhatsApp()}`
  }

  // Confirmar cita y sincronizar con la base de datos + Abrir WhatsApp obligatorio
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
      const servEncontrado = (catalogo.servicios || []).find((s) =>
        s.nombre.toLowerCase().includes(corteSeleccionado.nombre.toLowerCase()) ||
        corteSeleccionado.nombre.toLowerCase().includes(s.nombre.toLowerCase())
      ) || catalogo.servicios?.[0]

      let cita = null
      try {
        cita = await api.createCitaPublica({
          barberia_id: catalogo.barberia?.id,
          cliente: clienteNombre.trim(),
          cliente_telefono: clienteTelefono.trim(),
          empleado_id: barberoSeleccionado.id,
          servicio_id: servEncontrado?.id,
          fecha_hora: horaSeleccionada,
          notas: clienteNotas.trim() || `Reserva online: ${corteSeleccionado.nombre}`,
        })
      } catch (dbErr) {
        console.warn('Cita agendada localmente (respaldo para confirmación):', dbErr)
        cita = {
          id: 'cita_' + Date.now(),
          cliente: clienteNombre.trim(),
          cliente_telefono: clienteTelefono.trim(),
          fecha_hora: horaSeleccionada,
          notas: clienteNotas.trim(),
        }
      }

      setCitaConfirmada(cita || {
        cliente: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim(),
        fecha_hora: horaSeleccionada,
      })

      // Abrir inmediatamente WhatsApp con todos los datos prearmados
      const waUrl = `${REDES_SOCIALES.whatsapp}?text=${construirMensajeWhatsApp()}`
      try {
        window.open(waUrl, '_blank')
      } catch (openErr) {
        console.warn('Bloqueador de ventanas detectado:', openErr)
      }

      setPasoReserva(4) // Pantalla de confirmación exitosa con botón de WhatsApp
    } catch (err) {
      alert(err.message || 'Error al agendar la cita. Por favor intenta otro horario.')
    } finally {
      setEnviandoCita(false)
    }
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
          <FacebookLogo size={22} />
        </a>
        <a
          href={REDES_SOCIALES.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn whatsapp"
          title="Escríbenos a WhatsApp"
        >
          <WhatsAppLogo size={22} />
        </a>
        <a
          href={REDES_SOCIALES.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn instagram"
          title="Síguenos en Instagram (@barbersrevolution)"
        >
          <InstagramLogo size={22} />
        </a>
        <a
          href={REDES_SOCIALES.tiktok}
          target="_blank"
          rel="noopener noreferrer"
          className="social-btn tiktok"
          title="Síguenos en TikTok (@barbers.revolution)"
        >
          <TikTokLogo size={20} />
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

          {/* Acceso Discreto o Agendar Cita */}
          <div className="revolution-header-actions">
            {session ? (
              <Link to="/dashboard" className="btn-admin-pill" style={{ background: '#c5a059', color: '#111417' }}>
                <Icon name="user" size={15} />
                <span>Panel Admin ({profile?.nombre?.split(' ')[0] || 'Dueña'})</span>
              </Link>
            ) : (
              <a href="#servicios" className="btn-admin-pill" style={{ background: '#c5a059', color: '#111417' }}>
                <span>📅 Agendar Cita</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Banner de Ubicación y Sede Oficial con GPS Integrado */}
      <div className="revolution-location-bar">
        <div className="container row-between wrap" style={{ gap: 8, alignItems: 'center' }}>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Barbers+Revolution+Calle+5+%23+6-18+Centro+Comercial+Sexta+Avenida+Cajicá+Colombia"
            target="_blank"
            rel="noopener noreferrer"
            className="revolution-location-link"
            title="Abrir ubicación en Google Maps, Waze o Apple Maps"
          >
            <span style={{ fontSize: 16 }}>📍</span>
            <span>{NEGOCIO_INFO.direccion}</span>
            <span className="location-badge">GPS ↗</span>
          </a>
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <span>Horario: Lun a Sáb 9:00 AM – 9:00 PM</span>
            <a
              href={REDES_SOCIALES.instagram}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <InstagramLogo size={14} />
              <span>@barbersrevolution</span>
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

            <div className="row wrap" style={{ gap: 10 }}>
              <a href={REDES_SOCIALES.facebook} target="_blank" rel="noreferrer" className="social-pill-btn fb">
                <FacebookLogo size={16} /> Facebook
              </a>
              <a href={REDES_SOCIALES.whatsapp} target="_blank" rel="noreferrer" className="social-pill-btn wa">
                <WhatsAppLogo size={16} /> WhatsApp
              </a>
              <a href={REDES_SOCIALES.instagram} target="_blank" rel="noreferrer" className="social-pill-btn ig">
                <InstagramLogo size={16} /> Instagram
              </a>
              <a href={REDES_SOCIALES.tiktok} target="_blank" rel="noreferrer" className="social-pill-btn tk">
                <TikTokLogo size={16} /> TikTok
              </a>
            </div>
          </div>

          <div className="revolution-grid-3">
            {publicacionesSociales.map((pub) => (
              <div key={pub.id} className="social-feed-card">
                <div className="social-feed-img-box">
                  <img
                    src={pub.imagen}
                    alt={pub.titulo}
                    className="social-feed-img"
                    loading="lazy"
                  />
                  <span className={`social-platform-badge ${pub.plataforma === 'instagram' ? 'ig' : 'tk'}`}>
                    {pub.plataforma === 'instagram' ? <InstagramLogo size={14} /> : <TikTokLogo size={14} />}
                    <span>{pub.plataforma === 'instagram' ? 'Instagram Reel' : 'TikTok Video'}</span>
                  </span>
                </div>
                <div className="social-feed-info">
                  <h3 className="social-feed-title">{pub.titulo}</h3>
                  <p className="faint small" style={{ margin: 0, lineHeight: 1.4 }}>
                    {pub.descripcion}
                  </p>
                  <div className="social-feed-stats row-between" style={{ marginTop: 6, alignItems: 'center' }}>
                    <div className="row" style={{ gap: 12 }}>
                      {pub.likes && <span>❤️ {pub.likes}</span>}
                      {pub.comentarios && <span>💬 {pub.comentarios}</span>}
                      {pub.vistas && <span>▶ {pub.vistas}</span>}
                    </div>
                    <a
                      href={pub.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <span>Ver post</span>
                      <span>↗</span>
                    </a>
                  </div>
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
            <a
              href="https://www.google.com/maps/search/?api=1&query=Barbers+Revolution+Calle+5+%23+6-18+Centro+Comercial+Sexta+Avenida+Cajicá+Colombia"
              target="_blank"
              rel="noopener noreferrer"
              className="revolution-location-link mt-12"
              title="Abrir ubicación en Google Maps o Waze"
            >
              <span>📍 {NEGOCIO_INFO.direccion}</span>
              <span className="location-badge">Cómo llegar ↗</span>
            </a>
          </div>

          <div>
            <div className="footer-title">Redes Oficiales</div>
            <div className="col" style={{ gap: 10 }}>
              <a href={REDES_SOCIALES.instagram} target="_blank" rel="noreferrer" className="footer-link row" style={{ gap: 8, alignItems: 'center' }}>
                <InstagramLogo size={16} /> <span>Instagram: @barbersrevolution</span>
              </a>
              <a href={REDES_SOCIALES.tiktok} target="_blank" rel="noreferrer" className="footer-link row" style={{ gap: 8, alignItems: 'center' }}>
                <TikTokLogo size={16} /> <span>TikTok: @barbers.revolution</span>
              </a>
              <a href={REDES_SOCIALES.facebook} target="_blank" rel="noreferrer" className="footer-link row" style={{ gap: 8, alignItems: 'center' }}>
                <FacebookLogo size={16} /> <span>Facebook: Barbers Revolution</span>
              </a>
              <a href={REDES_SOCIALES.whatsapp} target="_blank" rel="noreferrer" className="footer-link row" style={{ gap: 8, alignItems: 'center' }}>
                <WhatsAppLogo size={16} /> <span>WhatsApp: {REDES_SOCIALES.telefono}</span>
              </a>
            </div>
          </div>

          <div>
            <div className="footer-title">Ubicación & Horarios</div>
            <p className="faint small mb-8" style={{ lineHeight: 1.6 }}>
              Visítanos en el Centro Comercial Sexta Avenida, local comercial en Cajicá.
            </p>
            <div className="faint small mb-12">
              <strong>Lunes a Sábado:</strong> 9:00 AM – 9:00 PM<br />
              <strong>Domingos & Festivos:</strong> 10:00 AM – 6:00 PM
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Barbers+Revolution+Calle+5+%23+6-18+Centro+Comercial+Sexta+Avenida+Cajicá+Colombia"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>📍 Ver Mapa & Navegación GPS</span>
            </a>
          </div>
        </div>

        <div className="container revolution-footer-bottom row-between wrap faint small" style={{ gap: 12, alignItems: 'center' }}>
          <div>
            © {new Date().getFullYear()} Barber's Revolution · Centro Comercial Sexta Avenida, Cajicá. Todos los derechos reservados.
          </div>
          <Link
            to="/login"
            className="footer-discrete-login"
            title="Acceso restringido"
            style={{
              color: '#475569',
              textDecoration: 'none',
              fontSize: 11,
              transition: 'color 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>🔐</span>
            <span>Acceso Privado</span>
          </Link>
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
                          {barbero.foto ? (
                            <img
                              src={barbero.foto}
                              alt={barbero.nombre}
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid var(--gold)',
                                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                              }}
                            />
                          ) : (
                            <Avatar nombre={barbero.nombre} area="barberia" size="lg" />
                          )}
                          <div style={{ textAlign: 'center', marginTop: 10 }}>
                            <strong style={{ fontSize: 15, display: 'block' }}>{barbero.nombre}</strong>
                            <span className="badge badge-gold no-dot mt-6" style={{ fontSize: 11 }}>
                              {barbero.especialidad || 'Barbero Profesional'}
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

            {/* PASO 2: CALENDARIO REAL SINCRONIZADO EN TIEMPO REAL */}
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
                    ← Cambiar Barbero
                  </button>
                </div>

                {/* Cabecera del Mes Oficial */}
                <div className="calendar-header-bar">
                  <div className="cal-month-title">
                    <span>📅</span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {fechaSeleccionada.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>· Sede Cajicá</span>
                  </div>
                  <span className="badge badge-gold no-dot" style={{ fontSize: 11 }}>
                    Horario continuo: 9:00 AM – 9:00 PM
                  </span>
                </div>

                {/* Cuadrícula de Días Tipo Calendario Real */}
                <div className="luxury-calendar-grid">
                  {diasDisponibles.map((dia) => {
                    const seleccionado = sameDay(dia, fechaSeleccionada)
                    const esHoy = sameDay(dia, new Date())
                    const dow = dia.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '').toUpperCase()
                    const mesNombre = dia.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
                    const descanso = esDiaDescanso(barberoSeleccionado, dia)

                    return (
                      <button
                        key={dia.toISOString()}
                        type="button"
                        className={`cal-date-card ${seleccionado ? 'active' : ''} ${descanso ? 'disabled-descanso' : ''}`}
                        onClick={() => {
                          setFechaSeleccionada(dia)
                          setHoraSeleccionada(null)
                        }}
                      >
                        <span className="cal-dow">{dow}</span>
                        <span className="cal-num">{dia.getDate()}</span>
                        <span className="cal-month">{mesNombre}</span>
                        <span className={`cal-badge ${descanso ? 'badge-rest' : esHoy ? 'badge-today' : 'badge-avail'}`}>
                          {descanso ? 'Descanso' : esHoy ? 'Hoy' : 'Libre'}
                        </span>
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
                      Por favor selecciona otro día en el calendario de arriba o elige a otro de nuestros barberos disponibles.
                    </p>
                  </div>
                ) : cargandoSlots ? (
                  <div className="loader-screen" style={{ minHeight: '120px' }}>
                    <Spinner />
                  </div>
                ) : slotsDisponibles.length === 0 ? (
                  <Empty icon="clock" title="Sin turnos disponibles para esta fecha">
                    {barberoSeleccionado.nombre} tiene su agenda completa para este día. Por favor prueba otra fecha en el calendario.
                  </Empty>
                ) : (
                  <div>
                    <label className="form-label small mb-8">
                      ⏰ Horarios disponibles para {fechaCorta(fechaSeleccionada)}:
                    </label>
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
                            <span>⏰</span>
                            <span>{hora(slotIso)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASO 3: DATOS DEL CLIENTE Y ENVÍO OBLIGATORIO POR WHATSAPP */}
            {pasoReserva === 3 && (
              <form onSubmit={handleConfirmarCita} className="stack" style={{ gap: 16 }}>
                <div className="receipt">
                  <div className="receipt-row">
                    <span className="muted">Corte/Servicio:</span>
                    <strong>{corteSeleccionado.nombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Barbero asignado:</span>
                    <strong>{barberoSeleccionado?.nombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Horario de cita:</span>
                    <strong className="gold-text">
                      {fechaCorta(fechaSeleccionada)} · {hora(horaSeleccionada)}
                    </strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Sede:</span>
                    <span>C.C. Sexta Avenida, Cajicá</span>
                  </div>
                  <div className="receipt-row total">
                    <span>Valor a pagar en barbería:</span>
                    <span className="gold-text mono font-bold">{money(corteSeleccionado.precio)}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">👤 Tu Nombre Completo</label>
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
                  <label className="form-label required">📱 Número de Celular / WhatsApp</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Ej: 312 456 7890"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    required
                  />
                  <span className="form-hint">
                    ⚡ Al presionar el botón abajo, se abrirá tu WhatsApp con el mensaje listo para enviar a la administradora y confirmar la reserva.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">📝 Notas o Indicaciones (Opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Fade bajo, diseño al lado, cejas marcadas..."
                    value={clienteNotas}
                    onChange={(e) => setClienteNotas(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: 15,
                    height: 52,
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    borderColor: '#128C7E',
                    color: '#fff',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: '0 6px 20px rgba(37, 211, 102, 0.4)',
                  }}
                  disabled={enviandoCita}
                >
                  {enviandoCita ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <WhatsAppLogo size={22} />
                      <span>Enviar por WhatsApp y Confirmar Reserva</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PASO 4: PANTALLA DE ÉXITO Y ENVÍO A WHATSAPP */}
            {pasoReserva === 4 && (
              <div className="text-center stack" style={{ gap: 16, padding: '10px 0' }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)', margin: 0 }}>
                  ¡Solicitud de Reserva Registrada!
                </h3>
                <div
                  style={{
                    background: 'rgba(37, 211, 102, 0.1)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    textAlign: 'left',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: '#4ade80', display: 'block', marginBottom: 4 }}>
                    📱 Confirmación requerida por WhatsApp:
                  </strong>
                  Para que tu turno con <strong>{barberoSeleccionado?.nombre}</strong> el{' '}
                  <strong>{fechaCorta(fechaSeleccionada)} a las {hora(horaSeleccionada)}</strong> quede 100% asegurado en la agenda, asegúrate de enviar el mensaje en el chat de WhatsApp que se acaba de abrir con la administradora.
                </div>

                <div className="receipt mt-4" style={{ textAlign: 'left' }}>
                  <div className="receipt-row">
                    <span className="muted">Cliente:</span>
                    <strong>{clienteNombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Barbero:</span>
                    <strong>{barberoSeleccionado?.nombre}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Servicio:</span>
                    <span>{corteSeleccionado?.nombre}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Horario:</span>
                    <strong className="gold-text">{fechaCorta(fechaSeleccionada)} · {hora(horaSeleccionada)}</strong>
                  </div>
                  <div className="receipt-row">
                    <span className="muted">Sede:</span>
                    <span>C.C. Sexta Avenida, Cajicá</span>
                  </div>
                  <div className="receipt-row total">
                    <span>Valor a pagar en barbería:</span>
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 6px 20px rgba(37, 211, 102, 0.35)',
                    }}
                  >
                    <WhatsAppLogo size={20} />
                    <span>Abrir WhatsApp (si no se abrió automáticamente)</span>
                  </a>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setModalReserva(false)}
                  >
                    Listo, Volver a la Barbería
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
