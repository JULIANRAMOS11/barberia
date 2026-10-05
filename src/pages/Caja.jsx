import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Empty, Modal, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { METODOS_PAGO } from '../lib/constants'
import { duracion, fechaHora, money } from '../lib/format'

export default function Caja() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const preselectCitaId = searchParams.get('cita')

  const [citasCompletadas, setCitasCompletadas] = useState([])
  const [inventario, setInventario] = useState([])
  const [selectedCita, setSelectedCita] = useState(null)
  const [productosVenta, setProductosVenta] = useState({}) // { [productoId]: cantidad }
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [ticketExitoso, setTicketExitoso] = useState(null)
  const [busquedaProducto, setBusquedaProducto] = useState('')

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [citas, prods] = await Promise.all([
        api.listCitas({ estados: ['completada'] }),
        api.listInventario(),
      ])
      setCitasCompletadas(citas)
      setInventario(prods.filter((p) => p.tipo === 'venta'))

      setSelectedCita((current) => citas.find((c) => c.id === current?.id)
        || citas.find((c) => c.id === preselectCitaId) || citas[0] || null)
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
  }, [preselectCitaId, toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Reset selected products when switching appointment
  useEffect(() => {
    setProductosVenta({})
  }, [selectedCita?.id])

  const productosFiltrados = useMemo(() => {
    return inventario.filter((p) =>
      p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
    )
  }, [inventario, busquedaProducto])

  const modificarCantidad = (producto, delta) => {
    const actual = productosVenta[producto.id] || 0
    const nuevo = actual + delta
    if (nuevo < 0) return
    if (nuevo > producto.stock_actual) {
      toast.error(`Solo hay ${producto.stock_actual} unidades disponibles en stock de "${producto.nombre}".`)
      return
    }
    setProductosVenta((prev) => {
      const copia = { ...prev }
      if (nuevo === 0) {
        delete copia[producto.id]
      } else {
        copia[producto.id] = nuevo
      }
      return copia
    })
  }

  // Cálculos en tiempo real
  const calculos = useMemo(() => {
    if (!selectedCita) return { subtotalServicio: 0, subtotalProductos: 0, total: 0, comision: 0, porcentaje: 0 }

    const subtotalServicio = Number(selectedCita.precio || 0)
    let subtotalProductos = 0

    Object.entries(productosVenta).forEach(([prodId, cant]) => {
      const item = inventario.find((p) => p.id === prodId)
      if (item) {
        subtotalProductos += Number(item.precio_venta) * cant
      }
    })

    const total = subtotalServicio + subtotalProductos
    const porcentaje = Number(selectedCita.empleado?.porcentaje_comision ?? 40)
    // Regla recomendada: comisión calculada sobre el servicio (o según configuración de barbería)
    const comision = Math.round((subtotalServicio * porcentaje) / 100)

    return {
      subtotalServicio,
      subtotalProductos,
      total,
      comision,
      porcentaje,
    }
  }, [selectedCita, productosVenta, inventario])

  const handleProcesarPago = async () => {
    if (!selectedCita) {
      toast.error('Selecciona una cita completada para liquidar.')
      return
    }

    setProcessing(true)
    try {
      const productosPayload = Object.entries(productosVenta).map(([producto_id, cantidad]) => ({
        producto_id,
        cantidad,
      }))

      const resultado = await api.procesarPago({
        citaId: selectedCita.id,
        metodo: metodoPago,
        productos: productosPayload,
      })

      toast.success('¡Pago registrado con éxito en Caja!')
      setTicketExitoso({
        cita: selectedCita,
        metodo: metodoPago,
        resultado,
        productosComprados: Object.entries(productosVenta).map(([id, cant]) => ({
          producto: inventario.find((p) => p.id === id),
          cantidad: cant,
        })),
        fecha: new Date(),
      })

      // Actualizar listado local
      setCitasCompletadas((prev) => prev.filter((c) => c.id !== selectedCita.id))
      setSelectedCita(null)
      setProductosVenta({})

      // Actualizar inventario local restando las cantidades
      setInventario((prev) =>
        prev.map((item) => {
          const vendidas = productosVenta[item.id] || 0
          return vendidas > 0 ? { ...item, stock_actual: Math.max(0, item.stock_actual - vendidas) } : item
        })
      )
    } catch (err) {
      toast.error(err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Punto de Pago (Caja)</h1>
          <p className="page-sub">
            Liquida citas completadas, asocia productos del inventario y calcula comisiones automáticamente.
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={cargarDatos}
          disabled={loading || processing}
          id="caja-btn-refrescar"
        >
          <Icon name="refresh" /> Refrescar
        </button>
      </header>

      {loading ? (
        <div className="loader-screen" style={{ minHeight: '40vh' }}>
          <Spinner />
        </div>
      ) : (
        <div className="caja-grid">
          {/* Columna Izquierda: Citas pendientes por cobrar */}
          <section className="card caja-pending">
            <div className="card-header">
              <div>
                <h2 className="card-title">Citas por Cobrar</h2>
                <p className="faint small">
                  {citasCompletadas.length} cita{citasCompletadas.length === 1 ? '' : 's'} en estado Completada
                </p>
              </div>
              <span className="badge badge-completada">{citasCompletadas.length}</span>
            </div>

            {citasCompletadas.length === 0 ? (
              <Empty
                icon="cash"
                title="No hay citas listas para cobro"
              >
                Las citas marcadas como "Completada" en la agenda aparecerán aquí.
              </Empty>
            ) : (
              <div className="list">
                {citasCompletadas.map((c) => {
                  const activa = selectedCita?.id === c.id
                  return (
                    <button
                      type="button"
                      key={c.id}
                      className={`pending-item ${activa ? 'active' : ''}`}
                      aria-pressed={activa}
                      disabled={processing}
                      onClick={() => setSelectedCita(c)}
                      id={`caja-item-${c.id}`}
                    >
                      <Avatar nombre={c.empleado?.nombre} area={c.empleado?.area} />
                      <div className="grow">
                        <div style={{ fontWeight: 600 }}>{c.cliente}</div>
                        <div className="faint small">
                          {c.servicio?.nombre} · {c.empleado?.nombre}
                        </div>
                        <div className="small muted mono">{fechaHora(c.fecha_hora)}</div>
                      </div>
                      <div className="right">
                        <div className="mono" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                          {money(c.precio)}
                        </div>
                        <div className="faint small">{duracion(c.duracion_minutos)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Columna Derecha: Detalle de cobro y liquidación */}
          <section className="card">
            {!selectedCita ? (
              <Empty icon="receipt" title="Selecciona una cita">
                Elige una de las citas de la lista para liquidar su valor y comisiones.
              </Empty>
            ) : (
              <div className="col" style={{ gap: 20 }}>
                {/* Cabecera del ticket actual */}
                <div className="row-between wrap" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <div className="row">
                    <Avatar nombre={selectedCita.empleado?.nombre} area={selectedCita.empleado?.area} size="lg" />
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selectedCita.cliente}</h2>
                      <p className="faint small">
                        Atendido por <strong>{selectedCita.empleado?.nombre}</strong> ({selectedCita.empleado?.porcentaje_comision || 40}% comisión)
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-completada no-dot">Completada</span>
                </div>

                {/* Sección de agregar productos al cobro */}
                <div>
                  <div className="row-between wrap mb-8 product-search-header">
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 600 }}>Añadir Productos de Venta</h3>
                      <p className="faint small">Resta automáticamente del inventario al procesar el pago.</p>
                    </div>
                    <div className="input-icon" style={{ width: 200 }}>
                      <Icon name="search" />
                      <input
                        type="text"
                        className="input input-sm"
                        placeholder="Buscar producto…"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        id="caja-buscar-producto"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.2)',
                    }}
                  >
                    {productosFiltrados.length === 0 ? (
                      <div className="empty" style={{ padding: '16px 0' }}>
                        <span className="faint small">No se encontraron productos disponibles para la venta.</span>
                      </div>
                    ) : (
                      productosFiltrados.map((prod) => {
                        const cant = productosVenta[prod.id] || 0
                        const sinStock = prod.stock_actual <= 0
                        return (
                          <div
                            key={prod.id}
                            className="row-between"
                            style={{
                              padding: '8px 0',
                              borderBottom: '1px solid var(--border)',
                              opacity: sinStock ? 0.5 : 1,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{prod.nombre}</div>
                              <div className="faint small mono">
                                {money(prod.precio_venta)} · Stock: {prod.stock_actual}
                              </div>
                            </div>
                            <div className="qty">
                              <button
                                type="button"
                                onClick={() => modificarCantidad(prod, -1)}
                                disabled={processing || cant <= 0}
                                aria-label={`Quitar una unidad de ${prod.nombre}`}
                                id={`caja-prod-minus-${prod.id}`}
                              >
                                -
                              </button>
                              <span>{cant}</span>
                              <button
                                type="button"
                                onClick={() => modificarCantidad(prod, 1)}
                                disabled={processing || sinStock || cant >= prod.stock_actual}
                                aria-label={`Añadir una unidad de ${prod.nombre}`}
                                id={`caja-prod-plus-${prod.id}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Método de Pago */}
                <div>
                  <label className="label" style={{ marginBottom: 8, display: 'block' }}>
                    Método de Pago
                  </label>
                  <div className="row payment-methods" style={{ gap: 12 }}>
                    <button
                      type="button"
                      className={`pay-method ${metodoPago === 'efectivo' ? 'active' : ''}`}
                      aria-pressed={metodoPago === 'efectivo'}
                      disabled={processing}
                      onClick={() => setMetodoPago('efectivo')}
                      id="caja-metodo-efectivo"
                    >
                      <div className="pm-icon" style={{ color: 'var(--green)' }}>
                        <Icon name="bill" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Efectivo</div>
                        <div className="faint small">Billetes y monedas</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`pay-method ${metodoPago === 'transferencia' ? 'active' : ''}`}
                      aria-pressed={metodoPago === 'transferencia'}
                      disabled={processing}
                      onClick={() => setMetodoPago('transferencia')}
                      id="caja-metodo-transferencia"
                    >
                      <div className="pm-icon" style={{ color: 'hsl(300, 75%, 75%)' }}>
                        <Icon name="smartphone" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Transferencia</div>
                        <div className="faint small">Nequi · Bre-B · Daviplata</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`pay-method ${metodoPago === 'tarjeta' ? 'active' : ''}`}
                      aria-pressed={metodoPago === 'tarjeta'}
                      disabled={processing}
                      onClick={() => setMetodoPago('tarjeta')}
                      id="caja-metodo-tarjeta"
                    >
                      <div className="pm-icon" style={{ color: 'hsl(210, 100%, 72%)' }}>
                        <Icon name="creditCard" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Tarjeta / Datáfono</div>
                        <div className="faint small">Débito y Crédito</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Resumen del Ticket y Comisiones Calculadas */}
                <div className="receipt">
                  <div className="receipt-row">
                    <span className="muted">Servicio: {selectedCita.servicio?.nombre}</span>
                    <strong className="mono">{money(calculos.subtotalServicio)}</strong>
                  </div>

                  {Object.entries(productosVenta).map(([id, cant]) => {
                    const prod = inventario.find((p) => p.id === id)
                    if (!prod) return null
                    return (
                      <div className="receipt-row" key={id}>
                        <span className="faint small">
                          + {prod.nombre} (x{cant})
                        </span>
                        <span className="mono small">{money(prod.precio_venta * cant)}</span>
                      </div>
                    )
                  })}

                  <div className="receipt-row total">
                    <span>Total a Cobrar</span>
                    <span className="gold-text">{money(calculos.total)}</span>
                  </div>

                  <div className="commission-box">
                    <div className="row" style={{ gap: 10 }}>
                      <Icon name="percent" size={20} style={{ color: 'var(--green)' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--green)' }}>
                          Comisión Calculada: {money(calculos.comision)}
                        </div>
                        <div className="faint small">
                          Corresponde al {calculos.porcentaje}% para {selectedCita.empleado?.nombre}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de Liquidación */}
                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-block checkout-submit"
                  onClick={handleProcesarPago}
                  disabled={processing}
                  id="caja-btn-liquidar"
                >
                  {processing ? (
                    <Spinner />
                  ) : (
                    <>
                      <Icon name="checkCircle" /> Liquidar y Guardar Pago ({money(calculos.total)})
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal de Comprobante / Recibo Tras Pago Exitoso */}
      <Modal
        open={Boolean(ticketExitoso)}
        onClose={() => setTicketExitoso(null)}
        title="¡Pago Registrado en Caja!"
        subtitle="La cita ha sido marcada como Pagada y se actualizó el stock."
        footer={
          <button
            className="btn btn-primary"
            onClick={() => setTicketExitoso(null)}
            id="ticket-cerrar"
          >
            Aceptar
          </button>
        }
      >
        {ticketExitoso && (
          <div className="col" style={{ gap: 14 }}>
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                background: 'var(--green-soft)',
                borderRadius: 'var(--radius)',
                border: '1px solid hsla(152, 58%, 52%, 0.3)',
              }}
            >
              <Icon name="checkCircle" size={32} style={{ color: 'var(--green)', margin: '0 auto 8px' }} />
              <h3 style={{ fontSize: 24, fontWeight: 700 }} className="mono">
                {money(ticketExitoso.resultado?.total_pago || 0)}
              </h3>
              <p className="small faint">
                Método: <strong>{METODOS_PAGO[ticketExitoso.metodo]}</strong> · {fechaHora(ticketExitoso.fecha)}
              </p>
            </div>

            <div className="receipt">
              <div className="receipt-row">
                <span className="muted">Cliente:</span>
                <strong>{ticketExitoso.cita?.cliente}</strong>
              </div>
              <div className="receipt-row">
                <span className="muted">Servicio:</span>
                <span>{ticketExitoso.cita?.servicio?.nombre}</span>
              </div>
              {ticketExitoso.productosComprados?.map(({ producto, cantidad }) => (
                <div className="receipt-row" key={producto?.id}>
                  <span className="faint small">
                    Prod: {producto?.nombre} (x{cantidad})
                  </span>
                  <span className="mono small">{money((producto?.precio_venta || 0) * cantidad)}</span>
                </div>
              ))}
              <div className="receipt-row total">
                <span>Comisión acreditada al barbero/a:</span>
                <span style={{ color: 'var(--green)' }}>
                  {money(ticketExitoso.resultado?.comision_empleado || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
