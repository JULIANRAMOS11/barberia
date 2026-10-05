import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { Avatar, Modal } from './ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api, isDemo } from '../lib/api'
import { AREAS } from '../lib/constants'

const ADMIN_NAV = [
  { to: '/dashboard', icon: 'dashboard', label: 'Resumen', short: 'Inicio' },
  { to: '/agenda', icon: 'calendar', label: 'Agenda Maestra', short: 'Agenda' },
  { to: '/caja', icon: 'cash', label: 'Caja' },
  { to: '/inventario', icon: 'box', label: 'Inventario' },
  { to: '/reportes', icon: 'chart', label: 'Reportes y Cierre' },
  { to: '/configuracion', icon: 'settings', label: 'Equipo y Servicios' },
]

const EMPLEADO_NAV = [
  { to: '/mi-agenda', icon: 'calendar', label: 'Mi Agenda' },
  { to: '/mis-finanzas', icon: 'wallet', label: 'Mis Finanzas' },
]

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const nav = isAdmin ? ADMIN_NAV : EMPLEADO_NAV
  const mobileNav = isAdmin ? nav.slice(0, 4) : nav

  const salir = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const reiniciarDemo = () => {
    if (!confirm('¿Reiniciar los datos de demostración? Se perderán los cambios hechos.')) return
    api.resetDemo()
    api.signOut()
    location.href = '/login'
  }

  return (
    <div className="app-shell">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <div className="mobile-top">
        <div className="row">
          <div className="brand-logo" style={{ width: 32, height: 32 }}><Icon name="scissors" size={16} /></div>
          <div>
            <strong className="brand-name" style={{ fontSize: 16 }}>BarberOS</strong>
            <div className="brand-sub">{profile?.barberia?.nombre}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={salir} id="mobile-logout"><Icon name="logout" /> Salir</button>
      </div>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><Icon name="scissors" size={20} /></div>
          <div>
            <div className="brand-name">BarberOS</div>
            <div className="brand-sub">{profile?.barberia?.nombre}</div>
          </div>
        </div>

        <div className="nav-section">{isAdmin ? 'Administración' : 'Mi espacio'}</div>
        <nav className="desktop-nav" aria-label="Navegación principal">{nav.map((n) => (
          <NavLink key={n.to} to={n.to} className="nav-link" id={`nav-${n.to.slice(1)}`}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </NavLink>
        ))}</nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            onClick={() => setShareOpen(true)}
            id="btn-compartir-whatsapp"
            style={{ marginBottom: 4 }}
          >
            <Icon name="smartphone" /> Link para Clientes
          </button>

          {isDemo && (
            <button className="btn btn-ghost btn-sm" onClick={reiniciarDemo} id="reset-demo">
              <Icon name="refresh" /> Reiniciar demo
            </button>
          )}
          <div className="user-chip">
            <Avatar nombre={profile?.nombre} area={profile?.area} />
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.nombre}
              </div>
              <div className="faint small">
                {isAdmin ? 'Administrador' : AREAS[profile?.area]?.label ?? 'Empleado'}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={salir} title="Cerrar sesión" id="logout">
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <main className="main" id="contenido" tabIndex={-1}>
        {isDemo && (
          <div className="demo-banner">
            <Icon name="info" size={16} />
            <span><strong>Espacio de prueba</strong><span className="demo-description"> · Los cambios se guardan en este navegador.</span></span>
            <span className="demo-tag">DEMO</span>
          </div>
        )}
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {mobileNav.map((n) => (
          <NavLink key={n.to} to={n.to} className="mobile-nav-link">
            <Icon name={n.icon} /><span>{n.short || n.label}</span>
          </NavLink>
        ))}
        {isAdmin && (
          <button className={`mobile-nav-link ${nav.slice(4).some((n) => n.to === pathname) ? 'active' : ''}`}
            aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Icon name="more" /><span>Más</span>
          </button>
        )}
      </nav>
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Tu negocio" subtitle={profile?.nombre}>
        <nav className="more-menu" aria-label="Más secciones">
          {nav.slice(4).map((n) => (
            <NavLink key={n.to} to={n.to} className="more-menu-link" onClick={() => setMenuOpen(false)}>
              <Icon name={n.icon} /><span className="grow">{n.label}</span><Icon name="chevronRight" />
            </NavLink>
          ))}
        </nav>
        {isDemo && <button className="btn btn-ghost btn-block mt-16" onClick={reiniciarDemo}><Icon name="refresh" /> Reiniciar demostración</button>}
      </Modal>

      {/* Modal para Compartir Link por WhatsApp */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Link de Reservas para Clientes"
        subtitle="Comparte este enlace por WhatsApp o redes sociales para que tus clientes agenden su cita."
      >
        <div className="col" style={{ gap: 18 }}>
          {/* Enlace general del local */}
          <div className="field">
            <label className="label">Enlace General del Negocio</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input input-sm mono"
                readOnly
                value={`${window.location.origin}/reservar`}
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/reservar`)
                  toast.success('¡Enlace general copiado al portapapeles!')
                }}
              >
                Copiar
              </button>
            </div>
          </div>

          {/* Enlace personal si es empleado */}
          {!isAdmin && profile?.id && (
            <div className="field">
              <label className="label">Tu Enlace Directo Personal</label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input input-sm mono"
                  readOnly
                  value={`${window.location.origin}/reservar?barbero=${profile.id}`}
                  onClick={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/reservar?barbero=${profile.id}`)
                    toast.success('¡Tu enlace personal fue copiado!')
                  }}
                >
                  Copiar
                </button>
              </div>
              <p className="faint small mt-4">
                Tus clientes entrarán con tu perfil ya seleccionado automáticamente.
              </p>
            </div>
          )}

          {/* Acciones directas */}
          <div className="row wrap mt-8" style={{ gap: 10 }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `¡Hola! 👋 Puedes agendar tu cita en ${profile?.barberia?.nombre || 'nuestro local'} directamente aquí: ${
                  window.location.origin
                }/reservar${!isAdmin && profile?.id ? `?barbero=${profile.id}` : ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success grow"
            >
              <Icon name="smartphone" /> Enviar por WhatsApp
            </a>

            <a
              href={`${window.location.origin}/reservar${!isAdmin && profile?.id ? `?barbero=${profile.id}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              Ver página <Icon name="chevronRight" />
            </a>
          </div>
        </div>
      </Modal>
    </div>
  )
}
