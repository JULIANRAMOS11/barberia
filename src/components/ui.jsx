import { Component, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { ESTADOS } from '../lib/constants'
import { initials } from '../lib/format'

export function Modal({ open, onClose, title, subtitle, children, footer, size }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement
    const appRoot = document.getElementById('root')
    const previousInert = appRoot?.inert
    if (appRoot) appRoot.inert = true
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])
      .filter((el) => el.getClientRects().length > 0)
    if (!dialogRef.current?.contains(document.activeElement)) (focusable()[0] || dialogRef.current)?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.() }
      if (e.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first) { e.preventDefault(); dialogRef.current?.focus(); return }
      if (e.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        e.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (appRoot) appRoot.inert = previousInert
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={dialogRef} tabIndex={-1} className={`modal ${size || ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="muted small mt-8">{subtitle}</p>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Cerrar" id="modal-close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function StatCard({ icon, label, value, hint, accent = 'gold' }) {
  const accents = {
    gold: ['var(--gold-soft)', 'var(--gold)'],
    green: ['var(--green-soft)', 'var(--green)'],
    blue: ['var(--blue-soft)', 'var(--blue)'],
    rose: ['var(--rose-soft)', 'var(--rose)'],
    violet: ['var(--violet-soft)', 'var(--violet)'],
    red: ['var(--red-soft)', 'var(--red)'],
    amber: ['var(--amber-soft)', 'var(--amber)'],
  }
  const [bg, fg] = accents[accent]
  return (
    <div className="stat-card" style={{ '--accent': bg, '--accent-fg': fg }}>
      <div className="stat-icon"><Icon name={icon} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export const EstadoBadge = ({ estado }) => <span className={`badge badge-${estado}`}>{ESTADOS[estado]}</span>

export const Avatar = ({ nombre, area, size }) => (
  <div className={`avatar ${area === 'women' ? 'women' : ''} ${size || ''}`}>{initials(nombre)}</div>
)

export function Empty({ icon = 'info', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>{title}</div>
      {children && <div className="small">{children}</div>}
    </div>
  )
}

export const Spinner = () => <span className="spinner" aria-label="Cargando" />

export function Switch({ checked, onChange, id }) {
  return (
    <label className="switch">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  )
}

export function Skeleton({ h = 80, style }) {
  return <div className="skeleton" style={{ height: h, ...style }} />
}

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', maxWidth: 500, margin: '60px auto' }} className="card">
          <Icon name="alert" size={36} style={{ color: 'var(--amber)', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Ocurrió un problema visual</h2>
          <p className="faint small mb-16">
            {this.state.error?.message || 'No se pudo renderizar este componente.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
