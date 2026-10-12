import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { AREAS, REDES_SOCIALES } from '../lib/constants'
import { duracion, money } from '../lib/format'

export default function LandingPublica() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [catalogo, setCatalogo] = useState({ barberia: null, servicios: [], empleados: [] })
  const [loading, setLoading] = useState(true)
  const [tabArea, setTabArea] = useState('barberia')

  useEffect(() => {
    api.getPublicCatalog()
      .then((data) => setCatalogo(data))
      .catch((err) => console.error('Error cargando catálogo:', err))
      .finally(() => setLoading(false))
  }, [])

  const serviciosBarberia = [
    {
      id: 's1',
      nombre: 'Corte Simple / Fade',
      precio: 25000,
      duracion: 30,
      destacado: false,
      desc: 'Cualquier estilo: degradado bajo, medio o alto, corte clásico con tijera o máquina. Acabado limpio.',
    },
    {
      id: 's2',
      nombre: 'Corte + Cejas',
      precio: 30000,
      duracion: 35,
      destacado: true,
      tag: 'POPULAR',
      desc: 'Corte de cabello profesional + perfilado, limpieza y diseño de cejas con navaja barbera.',
    },
    {
      id: 's3',
      nombre: 'Corte + Barba + Cejas (Completo)',
      precio: 45000,
      duracion: 50,
      destacado: true,
      tag: 'EL MÁS PEDIDO ⭐',
      desc: 'La experiencia completa: corte degradado, toalla caliente, vapor ozono, barba perfilada y cejas.',
    },
    {
      id: 's4',
      nombre: 'Barba y Perfilado',
      precio: 15000,
      duracion: 20,
      destacado: false,
      desc: 'Afeitado tradicional, hidratación de piel, recorte simétrico y delineado nítido con navaja.',
    },
    {
      id: 's5',
      nombre: 'Perfilado de Cejas Solas',
      precio: 5000,
      duracion: 15,
      destacado: false,
      desc: 'Limpieza, desbaste y diseño simétrico de cejas con navaja descartable nueva.',
    },
  ]

  const serviciosWomen = [
    {
      id: 'w1',
      nombre: 'Manicure Tradicional',
      precio: 25000,
      duracion: 45,
      desc: 'Limpieza profunda de cutículas, limado anatómico, exfoliación e hidratación con esmalte tradicional.',
    },
    {
      id: 'w2',
      nombre: 'Pedicure Spa',
      precio: 35000,
      duracion: 60,
      desc: 'Spa exfoliante, eliminación de asperezas, masaje relajante y esmaltado profesional.',
    },
    {
      id: 'w3',
      nombre: 'Esmaltado Semipermanente',
      precio: 45000,
      duracion: 60,
      destacado: true,
      tag: 'DURACIÓN 21 DÍAS',
      desc: 'Gel de alta fijación con secado en lámpara LED/UV. Brillo espejo y durabilidad extrema.',
    },
    {
      id: 'w4',
      nombre: 'Uñas Acrílicas (Set Completo)',
      precio: 85000,
      duracion: 120,
      destacado: true,
      tag: 'TENDENCIA 💅',
      desc: 'Esculpidas o con tips, estructura almendra, coffin o cuadradas con decoración y encapsulado.',
    },
    {
      id: 'w5',
      nombre: 'Cepillado y Peinado',
      precio: 35000,
      duracion: 45,
      desc: 'Lavado revitalizante, secado profesional con cepillo iónico y ondas o alisado sedoso.',
    },
  ]

  const barberosStaff = [
    {
      nombre: 'Carlos (Barbero 01)',
      area: 'barberia',
      apodo: 'Master Fade & Diseños',
      desc: 'Especialista en degradados milimétricos (skin fade), taper fade y líneas freestyle.',
    },
    {
      nombre: 'Andrés (Barbero 02)',
      area: 'barberia',
      apodo: 'Barba Tradicional',
      desc: 'Maestro del afeitado clásico con toalla caliente, perfilado y pomadas de fijación.',
    },
    {
      nombre: 'Julián (Barbero 03)',
      area: 'barberia',
      apodo: 'Tijera & Estilo Clásico',
      desc: 'Experto en texturizado con tijera, cortes ejecutivos y asesoría de visagismo.',
    },
    {
      nombre: 'Valentina (Estilista 01)',
      area: 'women',
      apodo: 'Nail Artist & Acrílicas',
      desc: 'Técnica certificada en acrílicos, semipermanente, encapsulados y efectos espejo.',
    },
    {
      nombre: 'Camila (Estilista 02)',
      area: 'women',
      apodo: 'Spa & Cepillado',
      desc: 'Especialista en cuidado capilar, peinados para eventos y spa de pies.',
    },
  ]

  const galeriaCortes = [
    { titulo: 'Mid Fade + Textura', desc: 'Acabado mate con cera Reuzel', emoji: '✂️' },
    { titulo: 'Low Taper Fade + Barba', desc: 'Líneas nítidas con navaja dorada', emoji: '👑' },
    { titulo: 'Buzz Cut + Diseño Cejas', desc: 'Corte militar degradado al cero', emoji: '💈' },
    { titulo: 'Uñas Acrílicas Coffin', desc: 'Esmaltado semipermanente Masglo', emoji: '💅' },
    { titulo: 'Perfilado de Barba Estilo Leñador', desc: 'Toalla caliente y aceite hidratante', emoji: '🪒' },
    { titulo: 'Cepillado Iónico con Ondas', desc: 'Brillo y volumen sin frizz', emoji: '✨' },
  ]

  return (
    <div className="landing-wrap animate-in">
      {/* Barra de Sesión Activa (Si la Dueña ya tiene sesión iniciada) */}
      {session && profile?.rol === 'admin' && (
        <div className="landing-admin-banner">
          <div className="landing-container row-between">
            <span className="small">
              👑 Sesión activa como <strong>{profile.nombre} (Dueña / Administradora)</strong>
            </span>
            <Link to="/dashboard" className="btn btn-primary btn-sm">
              <Icon name="dashboard" size={14} /> Ir a mi Panel Administrativo
            </Link>
          </div>
        </div>
      )}

      {/* Cabecera / Navegación Superior */}
      <header className="landing-header">
        <div className="landing-container row-between">
          <div className="landing-brand row">
            <div className="brand-logo" style={{ width: 36, height: 36 }}>
              <Icon name="scissors" size={18} />
            </div>
            <div>
              <strong style={{ fontSize: 17, letterSpacing: '0.04em' }}>
                {catalogo.barberia?.nombre || 'ELITE BARBER STUDIO'}
              </strong>
              <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Barbería & Zona Women
              </div>
            </div>
          </div>

          <nav className="landing-nav row" style={{ gap: 20 }}>
            <a href="#servicios" className="landing-nav-link">Servicios & Precios</a>
            <a href="#equipo" className="landing-nav-link">Nuestros Barberos</a>
            <a href="#galeria" className="landing-nav-link">Galería</a>
            <a href="#contacto" className="landing-nav-link">Ubicación</a>
          </nav>

          <div className="row" style={{ gap: 12 }}>
            <Link to="/reservar" className="btn btn-primary" id="landing-btn-reservar">
              <Icon name="calendar" size={16} /> Agendar Cita
            </Link>

            {/* Acceso discreto para la Dueña (Estilo clásico discreto como pidió) */}
            <Link
              to="/login"
              className="landing-admin-login-link"
              title="Acceso Administrativo Exclusivo de la Dueña"
              id="landing-link-admin-discreto"
            >
              <Icon name="lock" size={13} />
              <span>Acceso Dueña</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-content">
            <div className="landing-badge">
              <span>💈 BARBERÍA PROFESIONAL & ZONA DE BELLEZA</span>
            </div>

            <h1 className="landing-title">
              El Estilo y la Precisión que <span className="gold-text">Definen tu Presencia</span>
            </h1>

            <p className="landing-sub">
              Cortes clásicos, degradados modernos (Fade), diseño de barba con toalla caliente y zona exclusiva de manicure y estética femenina. Agenda tu turno sin filas ni esperas.
            </p>

            <div className="row wrap landing-hero-actions" style={{ gap: 14 }}>
              <Link to="/reservar" className="btn btn-primary btn-lg" style={{ fontSize: 16 }}>
                <Icon name="calendar" /> Agendar Mi Cita en Línea
              </Link>
              <a href="#servicios" className="btn btn-outline btn-lg" style={{ fontSize: 16 }}>
                <Icon name="receipt" /> Ver Precios y Cortes
              </a>
            </div>

            {/* Insignias de Confianza */}
            <div className="landing-trust-grid">
              <div className="trust-item">
                <span className="trust-num gold-text">⭐ 4.9/5</span>
                <span className="trust-label">Valoración en Clientes</span>
              </div>
              <div className="trust-item">
                <span className="trust-num gold-text">+1.000</span>
                <span className="trust-label">Clientes Atendidos</span>
              </div>
              <div className="trust-item">
                <span className="trust-num gold-text">4 Sedes</span>
                <span className="trust-label">Red de Barberías</span>
              </div>
              <div className="trust-item">
                <span className="trust-num gold-text">100%</span>
                <span className="trust-label">Turno Garantizado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: Tarifas y Servicios */}
      <section id="servicios" className="landing-section">
        <div className="landing-container">
          <div className="text-center mb-32">
            <span className="eyebrow">TARIFAS Y SERVICIOS</span>
            <h2 style={{ fontSize: 32, fontWeight: 800 }}>Precios Claros, Sin Letra Chica</h2>
            <p className="faint mt-8" style={{ maxWidth: 540, margin: '8px auto 0' }}>
              Tarifas fijas y transparentes para que elijas exactamente lo que necesitas.
            </p>

            {/* Toggle Área */}
            <div className="segmented mt-24" style={{ display: 'inline-flex' }}>
              <button
                className={tabArea === 'barberia' ? 'active' : ''}
                onClick={() => setTabArea('barberia')}
              >
                <Icon name="scissors" /> Barbería (Caballeros)
              </button>
              <button
                className={tabArea === 'women' ? 'active' : ''}
                onClick={() => setTabArea('women')}
              >
                <Icon name="sparkles" /> Zona Women (Damas)
              </button>
            </div>
          </div>

          <div className="landing-cards-grid">
            {(tabArea === 'barberia' ? serviciosBarberia : serviciosWomen).map((s) => (
              <div key={s.id} className={`landing-service-card ${s.destacado ? 'featured' : ''}`}>
                {s.tag && <div className="card-tag">{s.tag}</div>}
                <div className="row-between">
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{s.nombre}</h3>
                  <div className="mono gold-text" style={{ fontSize: 22, fontWeight: 800 }}>
                    {money(s.precio)}
                  </div>
                </div>
                <p className="faint small mt-8" style={{ minHeight: 44 }}>
                  {s.desc}
                </p>
                <div className="row-between mt-16 pt-12" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="faint small row" style={{ gap: 4 }}>
                    <Icon name="clock" size={14} /> {duracion(s.duracion)}
                  </span>
                  <Link
                    to={`/reservar?servicio=${encodeURIComponent(s.nombre)}`}
                    className="btn btn-primary btn-sm"
                  >
                    Reservar este
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección: Conoce a Nuestro Equipo */}
      <section id="equipo" className="landing-section bg-alt">
        <div className="landing-container">
          <div className="text-center mb-32">
            <span className="eyebrow">PROFESIONALES CERTIFICADOS</span>
            <h2 style={{ fontSize: 32, fontWeight: 800 }}>Conoce a Nuestros Barberos y Estilistas</h2>
            <p className="faint mt-8" style={{ maxWidth: 540, margin: '8px auto 0' }}>
              Elige con quién quieres atenderte. Cada profesional cuenta con amplia experiencia y técnica comprobada.
            </p>
          </div>

          <div className="landing-team-grid">
            {barberosStaff.map((staff) => (
              <div key={staff.nombre} className="landing-team-card">
                <Avatar nombre={staff.nombre} area={staff.area} size="lg" />
                <h3 style={{ fontSize: 17, fontWeight: 700, marginTop: 14 }}>{staff.nombre}</h3>
                <span className={`badge ${staff.area === 'women' ? 'badge-rose' : 'badge-gold'} no-dot mt-6`}>
                  {staff.apodo}
                </span>
                <p className="faint small mt-12 text-center">
                  {staff.desc}
                </p>
                <Link
                  to={`/reservar?area=${staff.area}`}
                  className="btn btn-outline btn-sm btn-block mt-16"
                >
                  Agendar con {staff.nombre.split(' ')[0]}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección: Galería / Lookbook */}
      <section id="galeria" className="landing-section">
        <div className="landing-container">
          <div className="text-center mb-32">
            <span className="eyebrow">FEED DE CORTES & ESTILOS</span>
            <h2 style={{ fontSize: 32, fontWeight: 800 }}>Nuestros Trabajos Más Recientes</h2>
            <p className="faint mt-8" style={{ maxWidth: 540, margin: '8px auto 0' }}>
              Síguenos en Instagram para ver fotos y videos diarios de cortes y transformaciones.
            </p>
          </div>

          <div className="landing-gallery-grid">
            {galeriaCortes.map((g, idx) => (
              <div key={idx} className="gallery-item-card">
                <div className="gallery-visual">
                  <span style={{ fontSize: 40 }}>{g.emoji}</span>
                </div>
                <div className="gallery-meta">
                  <strong style={{ fontSize: 15 }}>{g.titulo}</strong>
                  <div className="faint small">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-32">
            <a
              href={REDES_SOCIALES.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-lg"
              style={{ gap: 8 }}
            >
              <Icon name="instagram" /> Ver Más en Nuestro Instagram Oficial
            </a>
          </div>
        </div>
      </section>

      {/* Sección: CTA Final para Agendar */}
      <section className="landing-cta-banner">
        <div className="landing-container text-center">
          <h2 style={{ fontSize: 34, fontWeight: 800 }}>
            ¿Listo para tu Cambio de Look?
          </h2>
          <p className="muted mt-12" style={{ maxWidth: 540, margin: '12px auto 0', fontSize: 16 }}>
            Elige tu horario y barbero favorito en menos de un minuto. La confirmación le llega directo a la administración para apartar tu turno.
          </p>
          <div className="mt-24 row" style={{ justifyContent: 'center', gap: 14 }}>
            <Link to="/reservar" className="btn btn-primary btn-lg" style={{ fontSize: 17, padding: '14px 28px' }}>
              <Icon name="calendar" size={20} /> Agendar Turno Ahora
            </Link>
            <a
              href={REDES_SOCIALES.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-lg"
              style={{ fontSize: 17, padding: '14px 28px' }}
            >
              <Icon name="whatsapp" size={20} /> Escribir por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer con Redes Sociales y Ubicación */}
      <footer id="contacto" className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div>
              <div className="row mb-12">
                <div className="brand-logo" style={{ width: 32, height: 32 }}>
                  <Icon name="scissors" size={16} />
                </div>
                <strong style={{ fontSize: 18 }}>{catalogo.barberia?.nombre || 'ELITE BARBER STUDIO'}</strong>
              </div>
              <p className="faint small" style={{ maxWidth: 320 }}>
                El mejor servicio de corte, toalla caliente, barba y spa de uñas. Calidad profesional y atención personalizada.
              </p>
            </div>

            <div>
              <h4 className="footer-title">Horarios de Atención</h4>
              <p className="faint small">Lunes a Sábado: 9:00 AM - 9:00 PM</p>
              <p className="faint small mt-4">Domingos y Festivos: 10:00 AM - 6:00 PM</p>
              <p className="faint small mt-8" style={{ color: 'var(--green)' }}>✓ Atención con cita previa o por orden de llegada</p>
            </div>

            <div>
              <h4 className="footer-title">Nuestras Redes Sociales</h4>
              <div className="row wrap" style={{ gap: 10 }}>
                <a href={REDES_SOCIALES.instagram} target="_blank" rel="noopener noreferrer" className="social-pill ig">
                  <Icon name="instagram" size={16} /> @elitebarberstudio
                </a>
                <a href={REDES_SOCIALES.tiktok} target="_blank" rel="noopener noreferrer" className="social-pill tk">
                  <Icon name="tiktok" size={16} /> TikTok
                </a>
                <a href={REDES_SOCIALES.whatsapp} target="_blank" rel="noopener noreferrer" className="social-pill wa">
                  <Icon name="whatsapp" size={16} /> WhatsApp Oficial
                </a>
              </div>
            </div>
          </div>

          <div className="landing-footer-bottom row-between wrap">
            <span className="faint small">
              © {new Date().getFullYear()} {catalogo.barberia?.nombre || 'Elite Barber Studio'}. Todos los derechos reservados.
            </span>

            {/* Enlace discreto a login de administración */}
            <Link to="/login" className="faint small landing-footer-admin-link">
              <Icon name="lock" size={12} /> Panel de Administración (Dueña)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
