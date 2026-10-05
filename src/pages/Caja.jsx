import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Empty, Modal, Spinner } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { AREAS, METODOS_PAGO } from '../lib/constants'
import { duracion, fechaHora, money } from '../lib/format'

export default function Caja() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const preselectCitaId = searchParams.get('cita')

  const [citasCompletadas, setCitasCompletadas] = useState([])
  const [inventario, setInventario] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [servicios, setServicios] = useState([])
  const [selectedCita, setSelectedCita] = useState(null)
  const [productosVenta, setProductosVenta] = useState({}) // { [productoId]: cantidad }
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [ticketExitoso, setTicketExitoso] = useState(null)
  const [busquedaProducto, setBusquedaProducto] = useState('')

  // Modal de cobro directo en mostrador
  const [modalCobroDirecto, setModalCobroDirecto] = useState(false)
  const [areaDirecto, setAreaDirecto] = useState('barberia')
  const [cobroDirectoForm, setCobroDirectoForm] = useState({
    empleado_id: '',
    servicio_id: '',
    servicios_extras: [],
    cliente: 'Cliente Mostrador',
    metodo: 'efectivo',
    productosVenta: {},
    notas: '',
  })

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [citas, prods, emps, servs] = await Promise.all([
        api.listCitas({ estados: ['completada'] }),
        api.listInventario(),
        api.listEquipo({ soloActivos: true }),
        api.listServicios({ soloActivos: true }),
      ])
      setCitasCompletadas(citas)
      setInventario(prods.filter((p) => p.tipo === 'venta'))
      setEmpleados(emps)
      setServicios(servs)

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

  // --- Handlers de Cobro Directo en Mostrador ---
  const abrirModalCobroDirecto = (area = 'barberia') => {
    setAreaDirecto(area)
    const empsArea = empleados.filter((e) => e.area === area)
    const servsArea = servicios.filter((s) => !s.area || s.area === area)
    setCobroDirectoForm({
      cliente: 'Cliente Mostrador',
      empleado_id: empsArea[0]?.id || empleados[0]?.id || '',
      servicio_id: servsArea[0]?.id || servicios[0]?.id || '',
      servicios_extras: [],
      metodo: 'efectivo',
      productosVenta: {},
      notas: '',
    })
    setModalCobroDirecto(true)
  }

  const toggleServicioExtra = (id) => {
    setCobroDirectoForm((prev) => {
      const yaEsta = prev.servicios_extras.includes(id)
      return {
        ...prev,
        servicios_extras: yaEsta
          ? prev.servicios_extras.filter((x) => x !== id)
          : [...prev.servicios_extras, id],
      }
    })
  }

  const modificarCantidadDirecto = (producto, delta) => {
    const actual = cobroDirectoForm.productosVenta[producto.id] || 0
    const nuevo = actual + delta
    if (nuevo < 0) return
    if (nuevo > producto.stock_actual) {
      toast.error(`Solo hay ${producto.stock_actual} unidades disponibles de "${producto.nombre}".`)
      return
    }
    setCobroDirectoForm((prev) => {
      const copia = { ...prev.productosVenta }
      if (nuevo === 0) delete copia[producto.id]
      else copia[producto.id] = nuevo
      return { ...prev, productosVenta: copia }
    })
  }

  const calculosDirecto = useMemo(() => {
    const emp = empleados.find((x) => x.id === cobroDirectoForm.empleado_id)
    const serv = servicios.find((x) => x.id === cobroDirectoForm.servicio_id)
    const extras = servicios.filter((s) => cobroDirectoForm.servicios_extras.includes(s.id))

    const subtotalServicio = Number(serv?.precio || 0) + extras.reduce((sum, x) => sum + Number(x.precio || 0), 0)

    let subtotalProductos = 0
    Object.entries(cobroDirectoForm.productosVenta).forEach(([prodId, cant]) => {
      const item = inventario.find((p) => p.id === prodId)
      if (item) subtotalProductos += Number(item.precio_venta) * cant
    })

    const total = subtotalServicio + subtotalProductos
    const porcentaje = Number(emp?.porcentaje_comision ?? 45)
    const comision = Math.round((subtotalServicio * porcentaje) / 100)
    const gananciaLocal = total - comision

    return {
      emp,
      serv,
      extras,
      subtotalServicio,
      subtotalProductos,
      total,
      porcentaje,
      comision,
      gananciaLocal,
    }
  }, [cobroDirectoForm, empleados, servicios, inventario])

  const handleGuardarCobroDirecto = async (e) => {
    e.preventDefault()
    if (!cobroDirectoForm.empleado_id || !cobroDirectoForm.servicio_id) {
      toast.error('Por favor selecciona el profesional y el servicio.')
      return
    }
    setProcessing(true)
    try {
      const emp = empleados.find((x) => x.id === cobroDirectoForm.empleado_id)
      const serv = servicios.find((x) => x.id === cobroDirectoForm.servicio_id)
      const extras = servicios.filter((s) => cobroDirectoForm.servicios_extras.includes(s.id))
      const nombresServicios = [serv?.nombre, ...extras.map((x) => x.nombre)].filter(Boolean).join(' + ')

      // 1. Crear la cita
      const cita = await api.createCita({
        cliente: cobroDirectoForm.cliente.trim() || 'Cliente Mostrador',
        empleado_id: cobroDirectoForm.empleado_id,
        servicio_id: cobroDirectoForm.servicio_id,
        fecha_hora: new Date(),
        notas: (cobroDirectoForm.notas ? `${cobroDirectoForm.notas} · ` : '') + (extras.length ? `Extras: ${extras.map(e => e.nombre).join(', ')}` : 'Cobro directo en mostrador'),
      })

      // Asegurar estado completada para cobro
      await api.updateCita(cita.id, { estado: 'completada' })

      // 2. Procesar el pago con el método elegido
      const productosPayload = Object.entries(cobroDirectoForm.productosVenta).map(([producto_id, cantidad]) => ({
        producto_id,
        cantidad,
      }))

      const resultado = await api.procesarPago({
        citaId: cita.id,
        metodo: cobroDirectoForm.metodo,
        productos: productosPayload,
      })

      toast.success('¡Cobro registrado y liquidado con éxito!')
      setModalCobroDirecto(false)

      setTicketExitoso({
        cita: {
          ...cita,
          cliente: cobroDirectoForm.cliente || 'Cliente Mostrador',
          empleado: emp,
          servicio: { nombre: nombresServicios },
          precio: calculosDirecto.subtotalServicio,
        },
        metodo: cobroDirectoForm.metodo,
        resultado,
        productosComprados: Object.entries(cobroDirectoForm.productosVenta).map(([id, cant]) => ({
          producto: inventario.find((p) => p.id === id),
          cantidad: cant,
        })),
        fecha: new Date(),
      })

      await cargarDatos()
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
        <div className="row wrap" style={{ gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => abrirModalCobroDirecto('barberia')}
            id="caja-btn-nuevo-cobro"
          >
            <Icon name="plus" /> + Cobro Rápido en Mostrador
          </button>
          <button
            className="btn btn-ghost"
            onClick={cargarDatos}
            disabled={loading || processing}
            id="caja-btn-refrescar"
          >
            <Icon name="refresh" /> Refrescar
          </button>
        </div>
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
                <p className="faint small mb-12">Las citas marcadas como "Completada" en la agenda aparecerán aquí.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => abrirModalCobroDirecto('barberia')}
                >
                  <Icon name="plus" /> Registrar Cobro Directo Ahora
                </button>
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

      {/* Modal de Cobro Rápido Directo en Mostrador */}
      <Modal
        open={modalCobroDirecto}
        onClose={() => setModalCobroDirecto(false)}
        title="Cobro Directo en Mostrador"
        subtitle="Registra al instante el corte, barba, cejas o uñas del cliente, calcula la comisión y cobra."
        size="lg"
        footer={
          <div className="row-between wrap" style={{ width: '100%', gap: 12 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="faint small">Total a cobrar:</span>
              <strong className="gold-text mono" style={{ fontSize: 20 }}>
                {money(calculosDirecto.total)}
              </strong>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModalCobroDirecto(false)}
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleGuardarCobroDirecto}
                disabled={processing || !cobroDirectoForm.empleado_id || !cobroDirectoForm.servicio_id}
                id="caja-directo-submit"
              >
                {processing ? <Spinner /> : <><Icon name="checkCircle" /> Cobrar y Liquidar</>}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleGuardarCobroDirecto} className="col" style={{ gap: 18 }}>
          {/* Selector de Área */}
          <div className="segmented">
            <button
              type="button"
              className={areaDirecto === 'barberia' ? 'active' : ''}
              onClick={() => {
                setAreaDirecto('barberia')
                const emps = empleados.filter((e) => e.area === 'barberia')
                const servs = servicios.filter((s) => !s.area || s.area === 'barberia')
                setCobroDirectoForm((prev) => ({
                  ...prev,
                  empleado_id: emps[0]?.id || '',
                  servicio_id: servs[0]?.id || '',
                  servicios_extras: [],
                }))
              }}
            >
              <Icon name="scissors" /> Barbería (Caballeros)
            </button>
            <button
              type="button"
              className={areaDirecto === 'women' ? 'active' : ''}
              onClick={() => {
                setAreaDirecto('women')
                const emps = empleados.filter((e) => e.area === 'women')
                const servs = servicios.filter((s) => !s.area || s.area === 'women')
                setCobroDirectoForm((prev) => ({
                  ...prev,
                  empleado_id: emps[0]?.id || '',
                  servicio_id: servs[0]?.id || '',
                  servicios_extras: [],
                }))
              }}
            >
              <Icon name="sparkles" /> Zona Women (Damas / Uñas)
            </button>
          </div>

          <div className="form-grid">
            {/* 1. Barbero / Profesional */}
            <div className="field span-2">
              <label className="label">1. ¿Quién atendió al cliente? (Barbero / Estilista)</label>
              <select
                className="select"
                value={cobroDirectoForm.empleado_id}
                onChange={(e) => setCobroDirectoForm({ ...cobroDirectoForm, empleado_id: e.target.value })}
                required
              >
                <option value="" disabled>Selecciona el profesional...</option>
                {empleados
                  .filter((e) => e.area === areaDirecto)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} · {AREAS[emp.area]?.label || emp.area} ({emp.porcentaje_comision}% comisión)
                    </option>
                  ))}
              </select>
            </div>

            {/* 2. Servicio Principal */}
            <div className="field span-2">
              <label className="label">2. Servicio Principal Realizado</label>
              <select
                className="select"
                value={cobroDirectoForm.servicio_id}
                onChange={(e) => setCobroDirectoForm({ ...cobroDirectoForm, servicio_id: e.target.value })}
                required
              >
                <option value="" disabled>Selecciona el servicio...</option>
                {servicios
                  .filter((s) => !s.area || s.area === areaDirecto)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} — {money(s.precio)} ({duracion(s.duracion_minutos)})
                    </option>
                  ))}
              </select>
            </div>

            {/* 3. Servicios Adicionales (Cejas, Barba, Extras) */}
            <div className="field span-2">
              <label className="label">
                3. ¿Se realizó algún servicio adicional? (Ej. Cejas, Barba, Uñas adicionales)
              </label>
              <p className="faint small mb-8">
                Toca para sumar otros servicios al mismo cobro y el total se calculará solo con su precio preestablecido:
              </p>
              <div className="row wrap" style={{ gap: 8 }}>
                {servicios
                  .filter((s) => (!s.area || s.area === areaDirecto) && s.id !== cobroDirectoForm.servicio_id)
                  .map((s) => {
                    const check = cobroDirectoForm.servicios_extras.includes(s.id)
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => toggleServicioExtra(s.id)}
                        className={`btn btn-sm ${check ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: 13, padding: '5px 12px' }}
                      >
                        {check ? '✓ ' : '+ '} {s.nombre} ({money(s.precio)})
                      </button>
                    )
                  })}
              </div>
            </div>

            {/* 4. Nombre del Cliente */}
            <div className="field">
              <label className="label">Nombre del Cliente (Opcional)</label>
              <input
                className="input"
                placeholder="Ej. Juan Pérez / Cliente en mostrador"
                value={cobroDirectoForm.cliente}
                onChange={(e) => setCobroDirectoForm({ ...cobroDirectoForm, cliente: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="label">Notas (Opcional)</label>
              <input
                className="input"
                placeholder="Ej. Corte degradado alto + cejas"
                value={cobroDirectoForm.notas}
                onChange={(e) => setCobroDirectoForm({ ...cobroDirectoForm, notas: e.target.value })}
              />
            </div>
          </div>

          {/* 5. Venta de Productos (Opcional) */}
          <div style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <label className="label" style={{ marginBottom: 6, display: 'block' }}>
              ¿El cliente compró algún producto físico? (Cera, aceite, esmalte, etc.)
            </label>
            <div className="row wrap" style={{ gap: 8 }}>
              {inventario.slice(0, 6).map((prod) => {
                const cant = cobroDirectoForm.productosVenta[prod.id] || 0
                return (
                  <div
                    key={prod.id}
                    className="row"
                    style={{
                      background: cant > 0 ? 'rgba(217, 119, 6, 0.15)' : 'var(--surface)',
                      border: `1px solid ${cant > 0 ? 'var(--gold)' : 'var(--border)'}`,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius)',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: cant > 0 ? 600 : 400 }}>
                      {prod.nombre} ({money(prod.precio_venta)})
                    </span>
                    <div className="row" style={{ gap: 4 }}>
                      {cant > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          style={{ padding: '0 6px', height: 22 }}
                          onClick={() => modificarCantidadDirecto(prod, -1)}
                        >
                          -
                        </button>
                      )}
                      {cant > 0 && <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{cant}</span>}
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        style={{ padding: '0 6px', height: 22 }}
                        onClick={() => modificarCantidadDirecto(prod, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 6. Método de Pago */}
          <div>
            <label className="label mb-8" style={{ display: 'block' }}>
              4. ¿Cómo pagó el cliente?
            </label>
            <div className="row payment-methods" style={{ gap: 12 }}>
              <button
                type="button"
                className={`pay-method ${cobroDirectoForm.metodo === 'efectivo' ? 'active' : ''}`}
                onClick={() => setCobroDirectoForm({ ...cobroDirectoForm, metodo: 'efectivo' })}
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
                className={`pay-method ${cobroDirectoForm.metodo === 'transferencia' ? 'active' : ''}`}
                onClick={() => setCobroDirectoForm({ ...cobroDirectoForm, metodo: 'transferencia' })}
              >
                <div className="pm-icon" style={{ color: 'hsl(300, 75%, 75%)' }}>
                  <Icon name="smartphone" />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>Transferencia</div>
                  <div className="faint small">Nequi / Daviplata / Bre-B</div>
                </div>
              </button>

              <button
                type="button"
                className={`pay-method ${cobroDirectoForm.metodo === 'tarjeta' ? 'active' : ''}`}
                onClick={() => setCobroDirectoForm({ ...cobroDirectoForm, metodo: 'tarjeta' })}
              >
                <div className="pm-icon" style={{ color: 'hsl(190, 85%, 65%)' }}>
                  <Icon name="creditCard" />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>Tarjeta</div>
                  <div className="faint small">Débito / Crédito / Datáfono</div>
                </div>
              </button>
            </div>
          </div>

          {/* 7. Resumen Financiero y Liquidación de Comisión */}
          <div className="receipt">
            <div className="receipt-row">
              <span className="muted">Servicio(s) Seleccionado(s):</span>
              <strong className="mono">{money(calculosDirecto.subtotalServicio)}</strong>
            </div>
            {calculosDirecto.subtotalProductos > 0 && (
              <div className="receipt-row">
                <span className="muted">Productos de venta:</span>
                <strong className="mono">{money(calculosDirecto.subtotalProductos)}</strong>
              </div>
            )}
            <div className="receipt-row total">
              <span>Total a Cobrar</span>
              <span className="gold-text">{money(calculosDirecto.total)}</span>
            </div>
            <div className="commission-box mt-8">
              <div className="row" style={{ gap: 10 }}>
                <Icon name="percent" size={20} style={{ color: 'var(--green)' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--green)' }}>
                    Comisión para {calculosDirecto.emp?.nombre || 'el profesional'}: {money(calculosDirecto.comision)}
                  </div>
                  <div className="faint small">
                    Calculado automáticamente al {calculosDirecto.porcentaje}% · Ganancia neta para la barbería: {money(calculosDirecto.gananciaLocal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
