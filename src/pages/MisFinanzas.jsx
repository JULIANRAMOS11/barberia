import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { Empty, Skeleton, StatCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { addDays, fechaHora, money, startOfMonth, startOfWeek, toDateInput } from '../lib/format'

export default function MisFinanzas() {
  const { profile } = useAuth()
  const toast = useToast()
  const [periodo, setPeriodo] = useState('hoy') // hoy | semana | mes
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)

  const cargarMisFinanzas = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const hoy = new Date()
      let desde
      if (periodo === 'hoy') {
        desde = new Date(toDateInput(hoy) + 'T00:00:00')
      } else if (periodo === 'semana') {
        desde = startOfWeek(hoy)
      } else {
        desde = startOfMonth(hoy)
      }
      const hasta = addDays(hoy, 1)

      const data = await api.listCaja({
        desde,
        hasta,
        empleadoId: profile.id, // Aislamiento: solo ve sus comisiones personales
      })
      setMovimientos(data)
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, periodo, toast])

  useEffect(() => {
    cargarMisFinanzas()
  }, [cargarMisFinanzas])

  // Cálculos personales
  const resumen = useMemo(() => {
    const totalComisiones = movimientos.reduce((s, m) => s + Number(m.comision_empleado || 0), 0)
    const totalCortes = movimientos.length
    const totalFacturadoServicios = movimientos.reduce((s, m) => s + Number(m.total_servicio || 0), 0)
    const comisionPromedioPorCorte = totalCortes > 0 ? Math.round(totalComisiones / totalCortes) : 0

    return {
      totalComisiones,
      totalCortes,
      totalFacturadoServicios,
      comisionPromedioPorCorte,
    }
  }, [movimientos])

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Mis Finanzas y Ganancias</h1>
          <p className="page-sub">
            Balance personal de comisiones acumuladas. Tu porcentaje acordado es del{' '}
            <strong style={{ color: 'var(--gold)' }}>{profile?.porcentaje_comision}%</strong>.
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={cargarMisFinanzas}
          disabled={loading}
          id="mis-finanzas-btn-refrescar"
        >
          <Icon name="refresh" /> Refrescar
        </button>
      </header>

      {/* Selector de período */}
      <div className="card mb-24">
        <div className="row-between wrap">
          <div className="segmented">
            <button
              className={periodo === 'hoy' ? 'active' : ''}
              onClick={() => setPeriodo('hoy')}
              id="finanzas-tab-hoy"
            >
              Hoy
            </button>
            <button
              className={periodo === 'semana' ? 'active' : ''}
              onClick={() => setPeriodo('semana')}
              id="finanzas-tab-semana"
            >
              Esta Semana
            </button>
            <button
              className={periodo === 'mes' ? 'active' : ''}
              onClick={() => setPeriodo('mes')}
              id="finanzas-tab-mes"
            >
              Este Mes
            </button>
          </div>

          <span className="faint small mono">
            {movimientos.length} corte{movimientos.length === 1 ? '' : 's'} liquidados
          </span>
        </div>
      </div>

      {/* Tarjetas de Métricas Personales */}
      <div className="grid grid-3 stagger mb-24">
        <StatCard
          icon="wallet"
          accent="green"
          label="Tus Comisiones Acumuladas"
          value={money(resumen.totalComisiones)}
          hint={`Ganancia acumulada (${periodo})`}
        />
        <StatCard
          icon="scissors"
          accent="gold"
          label="Cortes / Servicios Cobrados"
          value={resumen.totalCortes}
          hint={`Total facturado: ${money(resumen.totalFacturadoServicios)}`}
        />
        <StatCard
          icon="percent"
          accent="violet"
          label="Promedio por Corte"
          value={money(resumen.comisionPromedioPorCorte)}
          hint={`Comisión al ${profile?.porcentaje_comision}%`}
        />
      </div>

      {/* Historial de Cortes y Pagos del Empleado */}
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Historial de Mis Cortes Cobrados</h2>
            <p className="faint small">
              Registro de citas que han pasado por Caja y generaron tu comisión.
            </p>
          </div>
        </div>

        {loading ? (
          <Skeleton h={220} />
        ) : movimientos.length === 0 ? (
          <Empty icon="receipt" title="Aún no tienes cortes cobrados en este periodo">
            Cuando el administrador liquide tus citas terminadas en Caja, verás reflejadas tus comisiones aquí.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Cliente</th>
                  <th>Servicio Realizado</th>
                  <th className="num">Valor del Servicio</th>
                  <th className="num">% Aplicado</th>
                  <th className="num" style={{ color: 'var(--green)' }}>
                    Tu Comisión
                  </th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="mono faint small">{fechaHora(m.created_at)}</td>
                    <td>
                      <strong>{m.cita?.cliente || 'Cliente'}</strong>
                    </td>
                    <td>{m.cita?.servicio?.nombre || 'Servicio'}</td>
                    <td className="num mono faint">{money(m.total_servicio)}</td>
                    <td className="num mono faint">{m.porcentaje_aplicado}%</td>
                    <td className="num mono">
                      <strong style={{ color: 'var(--green)', fontSize: 16 }}>
                        {money(m.comision_empleado)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3">Total Ganado en el Periodo</td>
                  <td className="num mono faint">{money(resumen.totalFacturadoServicios)}</td>
                  <td></td>
                  <td className="num mono" style={{ color: 'var(--green)', fontSize: 18 }}>
                    {money(resumen.totalComisiones)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
