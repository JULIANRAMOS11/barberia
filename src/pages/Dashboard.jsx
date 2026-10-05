import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { PaymentDonut, RevenueChart, SchedulePreview } from '../components/DashboardCharts'
import { Avatar, Empty, EstadoBadge, Skeleton, StatCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { addDays, fechaLarga, hora, money, startOfDay, toDateInput } from '../lib/format'

export default function Dashboard() {
  const { profile } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [area, setArea] = useState('barberia')
  const [openedAt] = useState(() => new Date())
  const cargar = useCallback(async () => {
    const now = new Date()
    const hoy = startOfDay(now)
    const manana = addDays(hoy, 1)
    try {
      const [cajaHoy, citasHoy, caja7, inventario, equipo] = await Promise.all([
        api.listCaja({ desde: hoy, hasta: manana }), api.listCitas({ desde: hoy, hasta: manana }),
        api.listCaja({ desde: addDays(hoy, -6), hasta: manana }), api.listInventario(), api.listEquipo({ soloActivos: true }),
      ])
      setData({ cajaHoy, citasHoy, caja7, inventario, equipo, now })
      setError(false)
    } catch (err) { setError(true); toast.error(err) }
  }, [toast])
  useEffect(() => { cargar() }, [cargar])

  const m = useMemo(() => {
    if (!data) return null
    const { cajaHoy, citasHoy, caja7, inventario, now } = data
    const ingresos = cajaHoy.reduce((s, r) => s + Number(r.total_pago), 0)
    const comisiones = cajaHoy.reduce((s, r) => s + Number(r.comision_empleado), 0)
    const productos = cajaHoy.reduce((s, r) => s + Number(r.total_productos), 0)
    const completadas = citasHoy.filter((c) => ['completada', 'pagada'].includes(c.estado)).length
    const activas = citasHoy.filter((c) => c.estado !== 'cancelada').length
    const porCobrar = citasHoy.filter((c) => c.estado === 'completada').length
    const efectivo = cajaHoy.filter((r) => r.metodo_pago === 'efectivo').reduce((s, r) => s + Number(r.total_pago), 0)
    const nequi = cajaHoy.filter((r) => r.metodo_pago === 'nequi').reduce((s, r) => s + Number(r.total_pago), 0)
    const top = {}
    for (const r of caja7) {
      const nombre = r.cita?.servicio?.nombre ?? 'Servicio'
      top[nombre] ??= { nombre, cantidad: 0, total: 0 }
      top[nombre].cantidad++
      top[nombre].total += Number(r.total_servicio)
    }
    const topServicios = Object.values(top).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)
    const bajos = inventario.filter((p) => p.stock_actual < (p.stock_minimo ?? 5)).sort((a, b) => a.stock_actual - b.stock_actual)
    const proximas = citasHoy.filter((c) => ['pendiente', 'en_proceso'].includes(c.estado) && new Date(c.fecha_fin) >= now).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)).slice(0, 4)
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startOfDay(now), i - 6)
      const key = toDateInput(day)
      return { key, label: day.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''), total: caja7.filter((r) => toDateInput(r.created_at) === key).reduce((s, r) => s + Number(r.total_pago), 0) }
    })
    const porEmpleado = {}
    for (const r of cajaHoy) {
      porEmpleado[r.empleado_id] ??= { id: r.empleado_id, nombre: r.empleado?.nombre ?? 'Profesional', area: r.empleado?.area, comision: 0, cantidad: 0 }
      porEmpleado[r.empleado_id].comision += Number(r.comision_empleado)
      porEmpleado[r.empleado_id].cantidad++
    }
    const equipoComisiones = Object.values(porEmpleado).sort((a, b) => b.comision - a.comision)
    const valorInventario = inventario.reduce((sum, p) => sum + Number(p.precio_compra || 0) * Number(p.stock_actual), 0)
    return { ingresos, comisiones, productos, completadas, activas, porCobrar, efectivo, nequi, topServicios, bajos, proximas, days, equipoComisiones, valorInventario }
  }, [data])

  return <div className="animate-in dashboard-page">
    <header className="page-header">
      <div><p className="eyebrow">VISTA GENERAL</p><h1 className="page-title">Tu negocio, de un vistazo</h1><p className="page-sub">Hola, {profile?.nombre?.split(' ')[0]} · <span className="capitalize">{fechaLarga(data?.now || openedAt)}</span></p></div>
      <div className="row page-actions"><Link to="/agenda" className="btn" id="dash-go-agenda"><Icon name="calendar" /> Agenda</Link><Link to="/caja" className="btn btn-primary" id="dash-go-caja"><Icon name="cash" /> Ir a caja</Link></div>
    </header>
    {error ? <div className="card"><Empty icon="alert" title="No pudimos cargar el resumen"><button className="btn mt-16" onClick={cargar}>Volver a intentar</button></Empty></div> : !m ? <div className="grid grid-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} h={120} />)}</div> : <>
      <div className="grid grid-4 dashboard-stats stagger">
        <StatCard icon="trending" label="Ingresos del día" value={money(m.ingresos)} hint={`Productos: ${money(m.productos)}`} />
        <StatCard icon="checkCircle" accent="green" label="Citas completadas" value={`${m.completadas} / ${m.activas}`} hint={m.porCobrar ? `${m.porCobrar} por cobrar` : 'Sin cobros pendientes'} />
        <StatCard icon="percent" accent="violet" label="Comisiones del día" value={money(m.comisiones)} hint="Sobre pagos registrados" />
        <StatCard icon="box" accent={m.bajos.length ? 'red' : 'green'} label="Productos por reponer" value={m.bajos.length} hint="Por debajo del stock mínimo" />
      </div>
      <div className="dashboard-primary">
        <section className="card schedule-summary">
          <div className="card-header"><div><h2 className="card-title">Citas de hoy</h2><p className="faint small">Las próximas horas de tu equipo</p></div><Link to="/agenda" className="btn btn-ghost btn-icon btn-sm" aria-label="Abrir agenda completa"><Icon name="chevronRight" /></Link></div>
          <div className="segmented preview-area" role="group" aria-label="Área del resumen"><button aria-pressed={area === 'barberia'} className={area === 'barberia' ? 'active' : ''} onClick={() => setArea('barberia')}><Icon name="scissors" /> Barbería</button><button aria-pressed={area === 'women'} className={area === 'women' ? 'active' : ''} onClick={() => setArea('women')}><Icon name="sparkles" /> Zona Women</button></div>
          <SchedulePreview citas={data.citasHoy} empleados={data.equipo.filter((e) => e.area === area)} now={data.now} />
          <div className="schedule-progress"><span style={{ width: `${m.activas ? m.completadas / m.activas * 100 : 0}%` }} /></div><div className="row-between small schedule-counts"><span><strong>{m.activas}</strong> citas del día</span><span><i /> <strong>{m.completadas}</strong> completadas</span></div>
        </section>
        <section className="card finance-summary">
          <div className="card-header"><div><h2 className="card-title">Resumen financiero</h2><p className="faint small">Pagos registrados en caja</p></div><Link to="/reportes" className="btn btn-ghost btn-icon btn-sm" aria-label="Abrir reportes"><Icon name="chevronRight" /></Link></div>
          <div className="finance-charts"><div><p className="small muted">Ingresos de hoy</p><strong className="finance-amount mono">{money(m.ingresos)} <small>COP</small></strong><RevenueChart days={m.days} /><p className="chart-caption faint">Evolución · últimos 7 días</p></div><div><p className="small muted">Ventas por método · hoy</p><PaymentDonut efectivo={m.efectivo} nequi={m.nequi} /></div></div>
          <div className="finance-footer"><span>Después de comisiones <small>Antes de costos y gastos</small></span><strong className="mono">{money(m.ingresos - m.comisiones)}</strong></div>
        </section>
      </div>
      <div className="dashboard-secondary">
        <section className="card inventory-summary">
          <div className="card-header"><h2 className="card-title">Estado de inventario</h2><Link to="/inventario" className="btn btn-ghost btn-icon btn-sm" aria-label="Gestionar inventario"><Icon name="chevronRight" /></Link></div><p className="faint small mb-8">Alertas de stock bajo</p>
          {m.bajos.length === 0 ? <Empty icon="box" title="Todo abastecido" /> : m.bajos.slice(0, 4).map((p) => <Link to="/inventario" className="inventory-alert-row" key={p.id}><span>{p.nombre}</span><strong>{p.stock_actual} uds.</strong><Icon name="alert" size={14} /></Link>)}
          <div className="inventory-value"><span className="small muted">Valor del inventario al costo</span><strong className="mono">{money(m.valorInventario)}</strong></div>
        </section>
        <section className="card commission-summary">
          <div className="card-header"><h2 className="card-title">Comisiones del equipo</h2><Link to="/reportes" className="btn btn-ghost btn-icon btn-sm" aria-label="Ver liquidación del equipo"><Icon name="chevronRight" /></Link></div><p className="faint small mb-8">Acumuladas en los cobros de hoy</p>
          {m.equipoComisiones.length === 0 ? <Empty icon="percent" title="Aún no hay comisiones hoy">Aparecen al registrar un pago.</Empty> : <div className="list">{m.equipoComisiones.slice(0, 4).map((e) => <div className="list-item" key={e.id}><Avatar nombre={e.nombre} area={e.area} /><div className="grow"><strong>{e.nombre}</strong><p className="faint small">{e.cantidad} servicios cobrados</p></div><strong className="mono commission-value">{money(e.comision)}</strong></div>)}</div>}
        </section>
        <section className="card upcoming-summary">
          <div className="card-header"><h2 className="card-title">Próximas citas</h2><Link to="/agenda" className="btn btn-ghost btn-icon btn-sm" aria-label="Ver próximas citas en agenda"><Icon name="chevronRight" /></Link></div><p className="faint small mb-8">Pendientes y en atención · hoy</p>
          {m.proximas.length === 0 ? <Empty icon="calendar" title="Sin más citas para hoy" /> : <div className="list">{m.proximas.map((c) => <div className="upcoming-row" key={c.id}><span className="upcoming-time mono">{hora(c.fecha_hora)}</span><div className="grow"><strong>{c.cliente}</strong><p className="faint small">{c.servicio?.nombre} · {c.empleado?.nombre}</p></div><EstadoBadge estado={c.estado} /></div>)}</div>}
        </section>
      </div>
      <section className="card top-services-summary"><div className="card-header"><h2 className="card-title">Servicios más vendidos</h2><span className="faint small">Últimos 7 días</span></div>
        {!m.topServicios.length ? <Empty icon="scissors" title="Aún no hay ventas registradas" /> : <div className="top-services-grid">{m.topServicios.map((s, i) => <div key={s.nombre} className="top-service-item"><span className="service-rank">0{i + 1}</span><div className="grow"><strong>{s.nombre}</strong><p className="faint small">{s.cantidad} servicios · {money(s.total)}</p><div className="bar-track mt-8"><div className="bar-fill" style={{ width: `${s.cantidad / m.topServicios[0].cantidad * 100}%` }} /></div></div></div>)}</div>}
      </section>
    </>}
  </div>
}
