import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Empty, EstadoBadge, Skeleton, StatCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { addDays, fechaLarga, hora, money, startOfDay } from '../lib/format'

export default function Dashboard() {
  const { profile } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)

  useEffect(() => {
    const hoy = startOfDay()
    const manana = addDays(hoy, 1)
    Promise.all([
      api.listCaja({ desde: hoy, hasta: manana }),
      api.listCitas({ desde: hoy, hasta: manana }),
      api.listCaja({ desde: addDays(hoy, -6), hasta: manana }),
      api.listInventario(),
    ])
      .then(([cajaHoy, citasHoy, caja7, inventario]) => setData({ cajaHoy, citasHoy, caja7, inventario }))
      .catch(toast.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const m = useMemo(() => {
    if (!data) return null
    const { cajaHoy, citasHoy, caja7, inventario } = data
    const ingresos = cajaHoy.reduce((s, r) => s + Number(r.total_pago), 0)
    const comisiones = cajaHoy.reduce((s, r) => s + Number(r.comision_empleado), 0)
    const productos = cajaHoy.reduce((s, r) => s + Number(r.total_productos), 0)
    const completadas = citasHoy.filter((c) => ['completada', 'pagada'].includes(c.estado)).length
    const activas = citasHoy.filter((c) => c.estado !== 'cancelada').length
    const porCobrar = citasHoy.filter((c) => c.estado === 'completada').length
    const efectivo = cajaHoy.filter((r) => r.metodo_pago === 'efectivo').reduce((s, r) => s + Number(r.total_pago), 0)
    const nequi = ingresos - efectivo

    const top = {}
    for (const r of caja7) {
      const n = r.cita?.servicio?.nombre ?? 'Servicio'
      top[n] ??= { nombre: n, cantidad: 0, total: 0 }
      top[n].cantidad++
      top[n].total += Number(r.total_servicio)
    }
    const topServicios = Object.values(top).sort((a, b) => b.cantidad - a.cantidad).slice(0, 6)

    const bajos = inventario
      .filter((p) => p.stock_actual < (p.stock_minimo ?? 5))
      .sort((a, b) => a.stock_actual - b.stock_actual)

    const now = new Date()
    const proximas = citasHoy
      .filter((c) => ['pendiente', 'en_proceso'].includes(c.estado) && new Date(c.fecha_fin) >= now)
      .slice(0, 6)

    return { ingresos, comisiones, productos, completadas, activas, porCobrar, efectivo, nequi, topServicios, bajos, proximas }
  }, [data])

  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <p className="eyebrow">TU NEGOCIO, AL DÍA</p>
          <h1 className="page-title">{saludo}, {profile?.nombre?.split(' ')[0]}</h1>
          <p className="page-sub" style={{ textTransform: 'capitalize' }}>{fechaLarga(new Date())} · Resumen del día</p>
        </div>
        <div className="row page-actions">
          <Link to="/agenda" className="btn" id="dash-go-agenda"><Icon name="calendar" /> Agenda</Link>
          <Link to="/caja" className="btn btn-primary" id="dash-go-caja"><Icon name="cash" /> Ir a caja</Link>
        </div>
      </header>

      {!m ? (
        <div className="grid grid-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} h={140} />)}</div>
      ) : (
        <>
          <section className="day-overview" aria-label="Estado de la jornada">
            <div className="day-overview-copy">
              <span className="day-overview-icon"><Icon name="calendar" size={24} /></span>
              <div>
                <p className="eyebrow">LA JORNADA DE HOY</p>
                <h2>{m.activas ? `${m.completadas} de ${m.activas} citas completadas` : 'Todo listo para una nueva jornada'}</h2>
                <p className="muted small">{m.porCobrar ? `${m.porCobrar} ${m.porCobrar === 1 ? 'cita lista' : 'citas listas'} para pasar por caja.` : 'Consulta la agenda y organiza las próximas atenciones.'}</p>
              </div>
            </div>
            <Link to={m.porCobrar ? '/caja' : '/agenda'} className="day-overview-link">
              {m.porCobrar ? 'Revisar cobros' : 'Organizar agenda'} <Icon name="chevronRight" size={18} />
            </Link>
            <div className="day-progress" role="progressbar" aria-label="Citas completadas" aria-valuenow={m.completadas} aria-valuemin={0} aria-valuemax={m.activas || 1}>
              <span style={{ width: `${m.activas ? m.completadas / m.activas * 100 : 0}%` }} />
            </div>
          </section>
          <div className="grid grid-4 stagger">
            <StatCard icon="trending" label="Ingresos del día" value={money(m.ingresos)}
              hint={`Servicios ${money(m.ingresos - m.productos)} · Productos ${money(m.productos)}`} />
            <StatCard icon="checkCircle" accent="green" label="Citas completadas" value={`${m.completadas} / ${m.activas}`}
              hint={m.porCobrar ? `${m.porCobrar} pendiente(s) por cobrar` : 'Todo cobrado'} />
            <StatCard icon="percent" accent="violet" label="Comisiones del día" value={money(m.comisiones)}
              hint={`Utilidad local ${money(m.ingresos - m.comisiones)}`} />
            <StatCard icon="alert" accent={m.bajos.length ? 'red' : 'green'} label="Alertas de inventario" value={m.bajos.length}
              hint={m.bajos.length ? 'Productos con stock bajo' : 'Stock en orden'} />
          </div>

          <div className="grid grid-main mt-24">
            <div className="col" style={{ gap: 16 }}>
              <section className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Top servicios vendidos</h2>
                    <p className="faint small">Últimos 7 días</p>
                  </div>
                  <Icon name="scissors" size={18} className="faint" />
                </div>
                {m.topServicios.length === 0 ? (
                  <Empty icon="chart" title="Aún no hay ventas registradas" />
                ) : (
                  m.topServicios.map((s) => (
                    <div className="bar-row" key={s.nombre}>
                      <span style={{ fontWeight: 500 }}>{s.nombre}</span>
                      <span className="muted small mono">{s.cantidad} · {money(s.total)}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(s.cantidad / m.topServicios[0].cantidad) * 100}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section className="card">
                <div className="card-header">
                  <h2 className="card-title">Próximas citas de hoy</h2>
                  <Link to="/agenda" className="btn btn-ghost btn-sm" id="dash-ver-agenda">Ver agenda <Icon name="chevronRight" /></Link>
                </div>
                {m.proximas.length === 0 ? (
                  <Empty icon="calendar" title="No hay más citas para hoy" />
                ) : (
                  <div className="list">
                    {m.proximas.map((c) => (
                      <div className="list-item dashboard-appointment" key={c.id}>
                        <div className="mono" style={{ width: 70, fontWeight: 700 }}>{hora(c.fecha_hora)}</div>
                        <Avatar nombre={c.empleado?.nombre} area={c.empleado?.area} />
                        <div className="grow">
                          <div style={{ fontWeight: 600 }}>{c.cliente}</div>
                          <div className="faint small">{c.servicio?.nombre} · {c.empleado?.nombre}</div>
                        </div>
                        <EstadoBadge estado={c.estado} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="col" style={{ gap: 16 }}>
              <section className="card">
                <div className="card-header">
                  <h2 className="card-title">Inventario bajo</h2>
                  <Link to="/inventario" className="btn btn-ghost btn-sm" id="dash-ver-inventario">Gestionar</Link>
                </div>
                {m.bajos.length === 0 ? (
                  <Empty icon="box" title="Sin alertas">Todos los productos están sobre el mínimo.</Empty>
                ) : (
                  m.bajos.map((p) => (
                    <div className="alert-item" key={p.id}>
                      <div className="alert-icon"><Icon name="alert" /></div>
                      <div className="grow">
                        <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                        <div className="faint small">{p.tipo === 'venta' ? 'Venta' : 'Consumo interno'} · mínimo {p.stock_minimo ?? 5}</div>
                      </div>
                      <strong className="mono" style={{ color: 'var(--red)', fontSize: 18 }}>{p.stock_actual}</strong>
                    </div>
                  ))
                )}
              </section>

              <section className="card">
                <h2 className="card-title">Ingresos por método</h2>
                <div className="col mt-16">
                  {[
                    { k: 'efectivo', label: 'Efectivo', v: m.efectivo, icon: 'bill', color: 'var(--green)' },
                    { k: 'nequi', label: 'Nequi', v: m.nequi, icon: 'smartphone', color: 'hsl(300, 75%, 75%)' },
                  ].map((x) => (
                    <div key={x.k}>
                      <div className="row-between">
                        <span className="row" style={{ gap: 8 }}><Icon name={x.icon} size={16} style={{ color: x.color }} /> {x.label}</span>
                        <strong className="mono">{money(x.v)}</strong>
                      </div>
                      <div className="bar-track mt-8">
                        <div className="bar-fill" style={{ width: `${m.ingresos ? (x.v / m.ingresos) * 100 : 0}%`, background: x.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
