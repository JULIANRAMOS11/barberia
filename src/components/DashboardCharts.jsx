import { Link } from 'react-router-dom'
import Icon from './Icon'
import { Empty } from './ui'
import { HORARIO } from '../lib/constants'
import { hora, horaCorta, money } from '../lib/format'

export function RevenueChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.total))
  const points = days.map((d, i) => `${12 + i * 42},${112 - (d.total / max) * 92}`).join(' ')
  return <div className="revenue-chart">
    <svg viewBox="0 0 276 130" role="img" aria-label={`Ingresos de los últimos siete días: ${days.map((d) => `${d.label} ${money(d.total)}`).join(', ')}`}>
      <defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4b66e" stopOpacity=".28" /><stop offset="100%" stopColor="#d4b66e" stopOpacity="0" /></linearGradient></defs>
      {[20, 50, 80, 112].map((y) => <line key={y} x1="12" x2="264" y1={y} y2={y} stroke="currentColor" opacity=".1" />)}
      <polygon points={`12,112 ${points} 264,112`} fill="url(#revenue-fill)" />
      <polyline points={points} fill="none" stroke="#d4b66e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {days.map((d, i) => <circle key={d.key} cx={12 + i * 42} cy={112 - d.total / max * 92} r="3" fill="#d4b66e"><title>{d.label}: {money(d.total)}</title></circle>)}
    </svg>
    <div className="chart-day-labels">{days.map((d) => <span key={d.key}>{d.label}</span>)}</div>
  </div>
}

export function PaymentDonut({ efectivo, nequi }) {
  const total = efectivo + nequi
  const cashPercent = total ? Math.round(efectivo / total * 100) : 0
  return <div className="payment-chart">
    <div className="payment-donut" role="img" aria-label={total ? `Efectivo ${cashPercent}%, Nequi ${100 - cashPercent}%` : 'Sin cobros hoy'}
      style={{ background: total ? `conic-gradient(var(--gold) 0 ${cashPercent}%, var(--teal) ${cashPercent}% 100%)` : 'var(--border-strong)' }}>
      <div><Icon name="wallet" size={20} /><span>{total ? 'Hoy' : 'Sin cobros'}</span></div>
    </div>
    <div className="payment-legend">
      {[{ label: 'Efectivo', total: efectivo, percent: cashPercent, color: 'var(--gold)' }, { label: 'Nequi', total: nequi, percent: total ? 100 - cashPercent : 0, color: 'var(--teal)' }].map((m) => <div key={m.label}><span><i style={{ background: m.color }} />{m.label}<b>{m.percent}%</b></span><strong className="mono">{money(m.total)}</strong></div>)}
    </div>
  </div>
}

export function SchedulePreview({ citas, empleados, now }) {
  const start = Math.max(HORARIO.inicio, Math.min(HORARIO.fin - 4, now.getHours()))
  const startTime = new Date(now)
  startTime.setHours(start, 0, 0, 0)
  const minutes = (value) => (new Date(value) - startTime) / 60000
  const columns = empleados.slice(0, 3)
  return columns.length ? <>
    <div className="mini-schedule" style={{ '--preview-cols': columns.length }}>
      <div className="mini-schedule-header"><span />{columns.map((e, index) => <span key={e.id}><i className={`staff-dot staff-${index}`} />{e.nombre.split(' ')[0]}</span>)}</div>
      <div className="mini-schedule-body">
        <div className="mini-times">{Array.from({ length: 4 }, (_, i) => <span key={i}>{horaCorta(start + i)}</span>)}</div>
        {columns.map((e, index) => <div className="mini-column" key={e.id}>
          {citas.filter((c) => c.empleado_id === e.id && c.estado !== 'cancelada' && minutes(c.fecha_fin) > 0 && minutes(c.fecha_hora) < 240).map((c) => {
            const top = Math.max(0, minutes(c.fecha_hora))
            const bottom = Math.min(240, minutes(c.fecha_fin))
            return <div key={c.id} className={`mini-booking staff-${index}`} style={{ top: `${top / 240 * 100}%`, height: `${(bottom - top) / 240 * 100}%` }} title={`${hora(c.fecha_hora)} · ${c.cliente} · ${c.servicio?.nombre}`}>{bottom - top >= 20 && <span>{hora(c.fecha_hora)} {c.cliente}</span>}</div>
          })}
        </div>)}
      </div>
    </div>
    <p className="faint small preview-caption">Vista de {columns.length} profesionales · <Link to="/agenda">Ver todo el equipo <Icon name="chevronRight" size={12} /></Link></p>
  </> : <Empty icon="calendar" title="No hay profesionales activos en esta área" />
}
