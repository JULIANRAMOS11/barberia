import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Empty, Skeleton, Spinner, StatCard } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { AREAS, METODOS_PAGO } from '../lib/constants'
import { addDays, fechaHora, money, startOfMonth, startOfWeek, toDateInput } from '../lib/format'

export default function Reportes() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [periodo, setPeriodo] = useState(() => (searchParams.get('corte') === 'sabado' ? 'sabado' : 'hoy')) // hoy | sabado | semana | quincena | mes | personalizado
  const [desde, setDesde] = useState(() => toDateInput(new Date()))
  const [hasta, setHasta] = useState(() => toDateInput(new Date()))
  const [empleadoFiltro, setEmpleadoFiltro] = useState('')
  const [metodoFiltro, setMetodoFiltro] = useState('')
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [movimientos, setMovimientos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)

  // Cargar equipo para los filtros
  useEffect(() => {
    api.listEquipo().then(setEmpleados).catch(console.error)
  }, [])

  // Sincronizar fechas según el periodo predefinido
  useEffect(() => {
    const hoy = new Date()
    if (periodo === 'hoy') {
      setDesde(toDateInput(hoy))
      setHasta(toDateInput(hoy))
    } else if (periodo === 'sabado') {
      // Corte semanal de lunes a sábado para pagar al equipo
      const lunes = startOfWeek(hoy)
      const sabado = addDays(lunes, 5)
      setDesde(toDateInput(lunes))
      setHasta(toDateInput(sabado))
    } else if (periodo === 'semana') {
      setDesde(toDateInput(startOfWeek(hoy)))
      setHasta(toDateInput(hoy))
    } else if (periodo === 'quincena') {
      const dia = hoy.getDate()
      const primerDia = startOfMonth(hoy)
      if (dia <= 15) {
        setDesde(toDateInput(primerDia))
        setHasta(toDateInput(new Date(hoy.getFullYear(), hoy.getMonth(), 15)))
      } else {
        setDesde(toDateInput(new Date(hoy.getFullYear(), hoy.getMonth(), 16)))
        setHasta(toDateInput(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)))
      }
    } else if (periodo === 'mes') {
      setDesde(toDateInput(startOfMonth(hoy)))
      setHasta(toDateInput(hoy))
    }
  }, [periodo])

  const cargarCaja = useCallback(async () => {
    setLoading(true)
    try {
      const fechaDesde = new Date(desde + 'T00:00:00')
      const fechaHasta = addDays(new Date(hasta + 'T00:00:00'), 1)
      const data = await api.listCaja({
        desde: fechaDesde,
        hasta: fechaHasta,
        empleadoId: empleadoFiltro || undefined,
      })
      setMovimientos(data)
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
  }, [desde, hasta, empleadoFiltro, toast])

  useEffect(() => {
    cargarCaja()
  }, [cargarCaja])

  // Filtrado por método de pago y por nombre/celular de cliente
  const movimientosFiltrados = useMemo(() => {
    let list = movimientos
    if (metodoFiltro) {
      if (metodoFiltro === 'transferencia') list = list.filter((m) => ['transferencia', 'nequi'].includes(m.metodo_pago))
      else list = list.filter((m) => m.metodo_pago === metodoFiltro)
    }
    if (busquedaCliente.trim()) {
      const q = busquedaCliente.toLowerCase().trim()
      list = list.filter((m) =>
        m.cita?.cliente?.toLowerCase().includes(q) ||
        (m.cita?.cliente_telefono && m.cita.cliente_telefono.includes(q))
      )
    }
    return list
  }, [movimientos, metodoFiltro, busquedaCliente])

  // Métricas financieras
  const metricas = useMemo(() => {
    const totalIngresos = movimientosFiltrados.reduce((s, m) => s + Number(m.total_pago || 0), 0)
    const totalComisiones = movimientosFiltrados.reduce((s, m) => s + Number(m.comision_empleado || 0), 0)
    const totalServicios = movimientosFiltrados.reduce((s, m) => s + Number(m.total_servicio || 0), 0)
    const totalProductos = movimientosFiltrados.reduce((s, m) => s + Number(m.total_productos || 0), 0)
    const gananciaLocal = totalIngresos - totalComisiones
    const totalEfectivo = movimientosFiltrados
      .filter((m) => m.metodo_pago === 'efectivo')
      .reduce((s, m) => s + Number(m.total_pago || 0), 0)
    const totalNequi = movimientosFiltrados
      .filter((m) => ['transferencia', 'nequi'].includes(m.metodo_pago))
      .reduce((s, m) => s + Number(m.total_pago || 0), 0)
    const totalTarjeta = movimientosFiltrados
      .filter((m) => m.metodo_pago === 'tarjeta')
      .reduce((s, m) => s + Number(m.total_pago || 0), 0)

    return {
      totalIngresos,
      totalComisiones,
      totalServicios,
      totalProductos,
      gananciaLocal,
      totalEfectivo,
      totalNequi,
      totalTarjeta,
      totalCortes: movimientosFiltrados.length,
    }
  }, [movimientosFiltrados])

  // Liquidación por Empleado
  const liquidacionPorEmpleado = useMemo(() => {
    const map = {}
    movimientosFiltrados.forEach((m) => {
      const empId = m.empleado_id
      const empNombre = m.empleado?.nombre || 'Desconocido'
      const area = m.empleado?.area || 'barberia'

      if (!map[empId]) {
        map[empId] = {
          id: empId,
          nombre: empNombre,
          area,
          totalServiciosCobrados: 0,
          totalProductosCobrados: 0,
          totalComisionPagar: 0,
          cantidadCortes: 0,
          porcentaje: m.porcentaje_aplicado || 40,
        }
      }

      map[empId].cantidadCortes += 1
      map[empId].totalServiciosCobrados += Number(m.total_servicio || 0)
      map[empId].totalProductosCobrados += Number(m.total_productos || 0)
      map[empId].totalComisionPagar += Number(m.comision_empleado || 0)
    })

    return Object.values(map).sort((a, b) => b.totalComisionPagar - a.totalComisionPagar)
  }, [movimientosFiltrados])

  // Exportar reporte a Excel (SheetJS)
  const exportarExcel = async () => {
    if (exportando) return
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      // Hoja 1: Resumen de Comisiones por Empleado
      const datosComisiones = liquidacionPorEmpleado.map((item, idx) => ({
        '#': idx + 1,
        Empleado: item.nombre,
        Área: AREAS[item.area]?.label || item.area,
        'Citas Atendidas': item.cantidadCortes,
        '% Comisión': `${item.porcentaje}%`,
        'Total Servicios Facturado': item.totalServiciosCobrados,
        'Total Comisiones a Pagar': item.totalComisionPagar,
      }))

      // Hoja 2: Movimientos Detallados de Caja
      const datosMovimientos = movimientosFiltrados.map((m) => ({
        Fecha: new Date(m.created_at).toLocaleDateString('es-CO'),
        Hora: hora(m.created_at),
        Cliente: m.cita?.cliente || 'Cliente',
        'Celular / WhatsApp': m.cita?.cliente_telefono || 'Sin celular',
        '¿Cliente Nuevo?': m.cita?.notas?.includes('[Cliente Nuevo]') ? 'SÍ' : 'NO',
        'Servicio Realizado': m.cita?.servicio?.nombre || 'Servicio',
        'Profesional / Barbero': m.empleado?.nombre || 'Empleado',
        'Método Pago': METODOS_PAGO[m.metodo_pago] || m.metodo_pago,
        'Notas / Ref Transferencia': m.cita?.notas || '',
        'Total Cobrado': Number(m.total_pago || 0),
        'Comisión Empleado': Number(m.comision_empleado || 0),
        'Utilidad Barbería': Number(m.total_pago || 0) - Number(m.comision_empleado || 0),
      }))

      // Crear Libro Excel
      const wb = XLSX.utils.book_new()
      const wsComisiones = XLSX.utils.json_to_sheet(datosComisiones)
      const wsMovimientos = XLSX.utils.json_to_sheet(datosMovimientos)

      XLSX.utils.book_append_sheet(wb, wsComisiones, 'Comisiones_Empleados')
      XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Detalle_Caja')

      const nombreArchivo = `Cierre_Caja_${desde}_al_${hasta}.xlsx`
      XLSX.writeFile(wb, nombreArchivo)
      toast.success(`Archivo "${nombreArchivo}" descargado exitosamente.`)
    } catch (err) {
      toast.error('Error al exportar a Excel: ' + err.message)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Reportes y Cierre de Caja</h1>
          <p className="page-sub">
            Historial de operaciones, balance general y liquidación de comisiones exportable a Excel.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={exportarExcel}
          disabled={loading || exportando || movimientosFiltrados.length === 0}
          id="rep-btn-excel"
        >
          {exportando ? <Spinner /> : <Icon name="download" />} {exportando ? 'Preparando Excel…' : 'Exportar a Excel'}
        </button>
      </header>

      {/* Barra de Filtros de Período y Empleado */}
      <div className="card mb-24">
        <div className="row-between wrap" style={{ gap: 14 }}>
          <div className="segmented">
            <button
              className={periodo === 'hoy' ? 'active' : ''}
              onClick={() => setPeriodo('hoy')}
              id="rep-tab-hoy"
            >
              Hoy
            </button>
            <button
              className={periodo === 'sabado' ? 'active' : ''}
              onClick={() => setPeriodo('sabado')}
              id="rep-tab-sabado"
              style={{ fontWeight: 600, color: periodo === 'sabado' ? 'var(--gold)' : undefined }}
            >
              ⭐ Corte Sábados (Semanal)
            </button>
            <button
              className={periodo === 'semana' ? 'active' : ''}
              onClick={() => setPeriodo('semana')}
              id="rep-tab-semana"
            >
              Esta Semana
            </button>
            <button
              className={periodo === 'quincena' ? 'active' : ''}
              onClick={() => setPeriodo('quincena')}
              id="rep-tab-quincena"
            >
              Quincenal
            </button>
            <button
              className={periodo === 'mes' ? 'active' : ''}
              onClick={() => setPeriodo('mes')}
              id="rep-tab-mes"
            >
              Este Mes
            </button>
            <button
              className={periodo === 'personalizado' ? 'active' : ''}
              onClick={() => setPeriodo('personalizado')}
              id="rep-tab-custom"
            >
              Personalizado
            </button>
          </div>

          <div className="row wrap report-filters" style={{ gap: 10, alignItems: 'center' }}>
            {/* Buscador de cliente o celular */}
            <input
              type="text"
              className="input input-sm"
              style={{ width: 200 }}
              placeholder="🔍 Buscar cliente / celular..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              aria-label="Buscar por cliente o celular"
            />

            {periodo === 'personalizado' && (
              <>
                <input
                  type="date"
                  className="input input-sm"
                  style={{ width: 140 }}
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  id="rep-fecha-desde"
                  aria-label="Fecha desde"
                />
                <span className="faint small">a</span>
                <input
                  type="date"
                  className="input input-sm"
                  style={{ width: 140 }}
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  id="rep-fecha-hasta"
                  aria-label="Fecha hasta"
                />
              </>
            )}

            <select
              className="select input-sm"
              style={{ width: 180 }}
              value={empleadoFiltro}
              onChange={(e) => setEmpleadoFiltro(e.target.value)}
              id="rep-filtro-empleado"
              aria-label="Filtrar por empleado"
            >
              <option value="">Todos los Profesionales</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({AREAS[emp.area]?.label || emp.area})
                </option>
              ))}
            </select>

            <select
              className="select input-sm"
              style={{ width: 140 }}
              value={metodoFiltro}
              onChange={(e) => setMetodoFiltro(e.target.value)}
              id="rep-filtro-metodo"
              aria-label="Filtrar por método de pago"
            >
              <option value="">Todos los Métodos</option>
              <option value="efectivo">Solo Efectivo</option>
              <option value="transferencia">Solo Transferencia</option>
              <option value="tarjeta">Solo Tarjeta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Banner Informativo de Corte de Sábados */}
      {periodo === 'sabado' && (
        <div
          className="card mb-24"
          style={{
            background: 'linear-gradient(135deg, rgba(202, 138, 4, 0.12), rgba(234, 179, 8, 0.04))',
            borderColor: 'var(--gold)',
            padding: '16px 20px',
          }}
        >
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--gold-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold)',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              💈
            </div>
            <div className="grow">
              <strong style={{ fontSize: 16, color: 'var(--gold)' }}>
                Corte Semanal de Sábados para Pago a Barberos y Estilistas
              </strong>
              <p className="faint small" style={{ margin: '4px 0 0' }}>
                Este reporte agrupa toda la semana activa (lunes a sábado). Puedes ver en tiempo real exactamente cuánto pagarle a cada profesional por sus servicios prestados y cuál es la ganancia neta para la barbería.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de Métricas de Cierre */}
      <div className="grid grid-4 stagger mb-24">
        <StatCard
          icon="trending"
          label="Total Ingresos Recaudados"
          value={money(metricas.totalIngresos)}
          hint={`${metricas.totalCortes} transacciones en el periodo`}
        />
        <StatCard
          icon="percent"
          accent="amber"
          label="Comisiones a Pagar (Total)"
          value={money(metricas.totalComisiones)}
          hint="Dinero destinado al equipo"
        />
        <StatCard
          icon="wallet"
          accent="green"
          label="Utilidad Neta del Local"
          value={money(metricas.gananciaLocal)}
          hint="Ingresos menos comisiones"
        />
        <StatCard
          icon="cash"
          accent="violet"
          label="Desglose de Caja"
          value={`${money(metricas.totalEfectivo)}`}
          hint={`Efectivo: ${money(metricas.totalEfectivo)} · Transf.: ${money(metricas.totalNequi)} · Tarjeta: ${money(metricas.totalTarjeta)}`}
        />
      </div>

      {/* Sección 1: Liquidación y Pago a Empleados */}
      <section className="card mb-24">
        <div className="card-header">
          <div>
            <h2 className="card-title">Comisiones a Pagar a Empleados</h2>
            <p className="faint small">
              Monto exacto que se le debe liquidar a cada empleado por los servicios y productos cobrados.
            </p>
          </div>
          <span className="badge badge-gold no-dot">
            {liquidacionPorEmpleado.length} empleado{liquidacionPorEmpleado.length === 1 ? '' : 's'} con ventas
          </span>
        </div>

        {loading ? (
          <Skeleton h={150} />
        ) : liquidacionPorEmpleado.length === 0 ? (
          <Empty icon="users" title="No hay comisiones en este rango">
            No se han registrado pagos para el periodo seleccionado.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Área</th>
                  <th style={{ textAlign: 'center' }}>Citas Realizadas</th>
                  <th className="num">% Comisión</th>
                  <th className="num">Total Facturado</th>
                  <th className="num" style={{ color: 'var(--green)' }}>
                    Comisión a Pagar
                  </th>
                </tr>
              </thead>
              <tbody>
                {liquidacionPorEmpleado.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="row">
                        <Avatar nombre={item.nombre} area={item.area} />
                        <strong style={{ fontSize: 14 }}>{item.nombre}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${item.area === 'women' ? 'badge-rose' : 'badge-gold'} no-dot`}>
                        {AREAS[item.area]?.label || item.area}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} className="mono">
                      {item.cantidadCortes}
                    </td>
                    <td className="num mono faint">{item.porcentaje}%</td>
                    <td className="num mono">{money(item.totalServiciosCobrados)}</td>
                    <td className="num mono">
                      <strong style={{ color: 'var(--green)', fontSize: 16 }}>
                        {money(item.totalComisionPagar)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4">Total a liquidar al equipo</td>
                  <td className="num mono">{money(metricas.totalServicios)}</td>
                  <td className="num mono" style={{ color: 'var(--green)', fontSize: 17 }}>
                    {money(metricas.totalComisiones)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Sección 2: Historial Detallado de Caja Diaria */}
      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Historial de Operaciones de Caja</h2>
            <p className="faint small">Registro inmutable de todas las citas y ventas cobradas.</p>
          </div>
          <span className="badge badge-completada no-dot">{movimientosFiltrados.length} registros</span>
        </div>

        {loading ? (
          <Skeleton h={220} />
        ) : movimientosFiltrados.length === 0 ? (
          <Empty icon="receipt" title="Sin registros de caja en este rango" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Cliente</th>
                  <th>Servicio & Extras</th>
                  <th>Atendido Por</th>
                  <th>Método</th>
                  <th className="num">Comisión</th>
                  <th className="num">Total Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.map((m) => (
                  <tr key={m.id}>
                    <td className="mono faint small">{fechaHora(m.created_at)}</td>
                    <td>
                      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <strong>{m.cita?.cliente || 'Cliente'}</strong>
                        {m.cita?.notas?.includes('[Cliente Nuevo]') && (
                          <span className="badge badge-gold" style={{ fontSize: 10, padding: '1px 5px' }}>
                            ⭐ Nuevo
                          </span>
                        )}
                      </div>
                      {m.cita?.cliente_telefono && (
                        <div className="faint small mono">📱 {m.cita.cliente_telefono}</div>
                      )}
                    </td>
                    <td>
                      <div>{m.cita?.servicio?.nombre || 'Servicio'}</div>
                      {m.productos && m.productos.length > 0 && (
                        <div className="faint small">
                          + {m.productos.map((p) => `${p.producto?.nombre} (x${p.cantidad})`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <Avatar nombre={m.empleado?.nombre} area={m.empleado?.area} size="sm" />
                        <span>{m.empleado?.nombre}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${m.metodo_pago}`}>
                        {METODOS_PAGO[m.metodo_pago] || m.metodo_pago}
                      </span>
                    </td>
                    <td className="num mono" style={{ color: 'var(--green)' }}>
                      {money(m.comision_empleado)}
                    </td>
                    <td className="num mono">
                      <strong style={{ color: 'var(--gold)' }}>{money(m.total_pago)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
