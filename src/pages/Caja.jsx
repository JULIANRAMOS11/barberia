import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { Avatar, Empty, Modal, Spinner, StatCard } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { AREAS, METODOS_PAGO } from '../lib/constants'
import { addDays, fechaHora, hora, money, startOfDay } from '../lib/format'

export default function Caja() {
  const toast = useToast()
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const preselectCitaId = searchParams.get('cita')

  // Datos del sistema
  const [citasHoy, setCitasHoy] = useState([])
  const [inventario, setInventario] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [servicios, setServicios] = useState([])
  const [pagosHoy, setPagosHoy] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [ticketExitoso, setTicketExitoso] = useState(null)

  // Modo de operación de la caja: 'servicio' | 'producto' | 'grupo'
  const [pestañaCaja, setPestañaCaja] = useState('servicio')

  // --- 1. Formulario de Cobro de Servicio (Cero Enredos) ---
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState(null)
  const [busquedaCita, setBusquedaCita] = useState('')
  const [areaServicio, setAreaServicio] = useState('barberia')
  const [formServicio, setFormServicio] = useState({
    empleado_id: '',
    servicio_id: '',
    precioEditable: 25000,
    cliente: '',
    cliente_telefono: '',
    esNuevo: false,
    notas: '',
    metodo: 'efectivo',
    banco: 'Nequi',
    referenciaComprobante: '',
  })

  // --- 2. Formulario de Venta de Productos de Tienda (Caja Aparte) ---
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [productosVentaTienda, setProductosVentaTienda] = useState({}) // { [id]: cantidad }
  const [formProducto, setFormProducto] = useState({
    cliente: 'Cliente Mostrador',
    cliente_telefono: '',
    metodo: 'efectivo',
    banco: 'Nequi',
    referenciaComprobante: '',
  })

  // --- 3. Formulario de Cobro Familiar / Grupo ---
  const [formGrupo, setFormGrupo] = useState({
    responsable: 'Familia Gómez',
    cliente_telefono: '',
    metodo: 'efectivo',
    banco: 'Nequi',
    referenciaComprobante: '',
    notas: '',
    miembros: [
      { id: 'm1', nombre: 'Papá', empleado_id: '', servicio_id: '', precio: 25000 },
      { id: 'm2', nombre: 'Hijo 1', empleado_id: '', servicio_id: '', precio: 25000 },
    ],
  })

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const hoy = startOfDay(new Date())
      const manana = addDays(hoy, 1)
      const [citas, prods, emps, servs, pagos] = await Promise.all([
        api.listCitas({ desde: hoy, hasta: manana }),
        api.listInventario(),
        api.listEquipo({ soloActivos: true }),
        api.listServicios({ soloActivos: true }),
        api.listCaja({ desde: hoy, hasta: manana }),
      ])

      setCitasHoy(citas)
      setInventario(prods)
      setEmpleados(emps)
      setServicios(servs)
      setPagosHoy(pagos || [])

      // Inicializar empleado y servicio por defecto si están vacíos
      const empsBarberia = emps.filter((e) => e.area === 'barberia')
      const servsBarberia = servs.filter((s) => !s.area || s.area === 'barberia')

      setFormServicio((prev) => {
        const empId = prev.empleado_id || empsBarberia[0]?.id || emps[0]?.id || ''
        const servId = prev.servicio_id || servsBarberia[0]?.id || servs[0]?.id || ''
        const servObj = servs.find((s) => s.id === servId)
        return {
          ...prev,
          empleado_id: empId,
          servicio_id: servId,
          precioEditable: prev.precioEditable || Number(servObj?.precio || 25000),
        }
      })

      // Si viene con cita precargada en la URL
      if (preselectCitaId) {
        const encontrada = citas.find((c) => c.id === preselectCitaId)
        if (encontrada) seleccionarCitaParaCobro(encontrada)
      }
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
  }, [preselectCitaId, toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Cargar cita agendada en el formulario de cobro
  const seleccionarCitaParaCobro = (cita) => {
    setCitaSeleccionadaId(cita.id)
    const emp = empleados.find((e) => e.id === cita.empleado_id)
    const serv = servicios.find((s) => s.id === cita.servicio_id)
    if (emp?.area) setAreaServicio(emp.area)

    setFormServicio((prev) => ({
      ...prev,
      empleado_id: cita.empleado_id,
      servicio_id: cita.servicio_id,
      precioEditable: Number(cita.precio || serv?.precio || 25000),
      cliente: cita.cliente || '',
      cliente_telefono: cita.cliente_telefono || '',
      esNuevo: cita.notas?.includes('[Cliente Nuevo]') || false,
      notas: (cita.notas || '').replace(/\[Nequi Ref:[^\]]*\]/g, '').replace(/\[Cliente Nuevo\]/g, '').trim(),
    }))
    setBusquedaCita('')
    toast.success(`Cita de ${cita.cliente} cargada para cobrar.`)
  }

  const limpiarCitaSeleccionada = () => {
    setCitaSeleccionadaId(null)
    setFormServicio((prev) => ({
      ...prev,
      cliente: '',
      cliente_telefono: '',
      esNuevo: false,
      notas: '',
      referenciaComprobante: '',
    }))
  }

  // Filtrado de citas agendadas de hoy para autocompletar
  const citasFiltradasBusqueda = useMemo(() => {
    if (!busquedaCita.trim()) return []
    const q = busquedaCita.toLowerCase().trim()
    return citasHoy.filter((c) =>
      c.cliente?.toLowerCase().includes(q) ||
      (c.cliente_telefono && c.cliente_telefono.includes(q))
    ).slice(0, 5)
  }, [citasHoy, busquedaCita])

  // Métricas financieras del día (Arqueo en tiempo real)
  const metricasCaja = useMemo(() => {
    const totalRecaudado = pagosHoy.reduce((s, p) => s + Number(p.total_pago || 0), 0)
    const efectivo = pagosHoy.filter((p) => p.metodo_pago === 'efectivo').reduce((s, p) => s + Number(p.total_pago || 0), 0)
    const transferencia = pagosHoy.filter((p) => ['transferencia', 'nequi'].includes(p.metodo_pago)).reduce((s, p) => s + Number(p.total_pago || 0), 0)
    const tarjeta = pagosHoy.filter((p) => p.metodo_pago === 'tarjeta').reduce((s, p) => s + Number(p.total_pago || 0), 0)
    const totalComisiones = pagosHoy.reduce((s, p) => s + Number(p.comision_empleado || 0), 0)
    const gananciaLocal = totalRecaudado - totalComisiones
    return {
      totalRecaudado,
      efectivo,
      transferencia,
      tarjeta,
      totalComisiones,
      gananciaLocal,
      cantidad: pagosHoy.length,
    }
  }, [pagosHoy])

  // Empleados y servicios según el área seleccionada (Barbería / Women)
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((e) => e.area === areaServicio)
  }, [empleados, areaServicio])

  const serviciosFiltrados = useMemo(() => {
    return servicios.filter((s) => !s.area || s.area === areaServicio)
  }, [servicios, areaServicio])

  // Al cambiar de servicio en el select, actualizar automáticamente el precio editable
  const handleCambioServicio = (servId) => {
    const s = servicios.find((x) => x.id === servId)
    setFormServicio((prev) => ({
      ...prev,
      servicio_id: servId,
      precioEditable: Number(s?.precio || 25000),
    }))
  }

  // Al cambiar de área, ajustar empleado y servicio al nuevo catálogo
  const handleCambioArea = (nuevaArea) => {
    setAreaServicio(nuevaArea)
    const emps = empleados.filter((e) => e.area === nuevaArea)
    const servs = servicios.filter((s) => !s.area || s.area === nuevaArea)
    const primerServ = servs[0]
    setFormServicio((prev) => ({
      ...prev,
      empleado_id: emps[0]?.id || prev.empleado_id,
      servicio_id: primerServ?.id || prev.servicio_id,
      precioEditable: Number(primerServ?.precio || 25000),
    }))
  }

  // Cálculos en tiempo real del cobro de servicio (Comisión exacta al 50%)
  const calculosServicio = useMemo(() => {
    const total = Math.max(0, Number(formServicio.precioEditable) || 0)
    const emp = empleados.find((e) => e.id === formServicio.empleado_id)
    const serv = servicios.find((s) => s.id === formServicio.servicio_id)
    const pct = Number(emp?.porcentaje_comision ?? 50)
    const comision = Math.round((total * pct) / 100)
    const gananciaLocal = total - comision
    return {
      total,
      emp,
      serv,
      porcentaje: pct,
      comision,
      gananciaLocal,
    }
  }, [formServicio, empleados, servicios])

  // --- PROCESAR COBRO DE CORTE / SERVICIO ---
  const handleCobrarServicio = async (e) => {
    e.preventDefault()
    if (!formServicio.cliente.trim()) {
      toast.error('Por favor escribe el nombre del cliente.')
      return
    }
    if (!formServicio.cliente_telefono.trim()) {
      toast.error('El número de celular es obligatorio para guardar el contacto.')
      return
    }
    if (!formServicio.empleado_id || !formServicio.servicio_id) {
      toast.error('Selecciona el profesional y el servicio.')
      return
    }

    setProcessing(true)
    try {
      const now = new Date()
      const emp = calculosServicio.emp
      const serv = calculosServicio.serv
      const precioFinal = calculosServicio.total

      // Preparar notas del cobro (con ref de transferencia y cliente nuevo)
      const partesNota = []
      if (formServicio.esNuevo) partesNota.push('[Cliente Nuevo]')
      if (formServicio.metodo === 'transferencia' && formServicio.referenciaComprobante.trim()) {
        partesNota.push(`[${formServicio.banco} Ref: ${formServicio.referenciaComprobante.trim()}]`)
      }
      if (formServicio.notas.trim()) partesNota.push(formServicio.notas.trim())
      const notasFinales = partesNota.join(' · ')

      let idCitaACobrar = citaSeleccionadaId

      // 1. Si no viene de una cita agendada, crear la cita completada al instante
      if (!idCitaACobrar) {
        const durMin = Number(serv?.duracion_minutos || 30)
        const inicio = new Date(now.getTime() - durMin * 60000)
        inicio.setSeconds(0, 0)

        const nuevaCita = await api.createCita({
          barberia_id: serv?.barberia_id,
          cliente: formServicio.cliente.trim(),
          cliente_telefono: formServicio.cliente_telefono.trim(),
          empleado_id: formServicio.empleado_id,
          servicio_id: formServicio.servicio_id,
          fecha_hora: inicio,
          estado: 'completada',
          precio: precioFinal,
          notas: notasFinales || 'Cobro directo en caja',
        })
        idCitaACobrar = nuevaCita.id
      } else {
        // Si ya existía, sincronizar cliente, teléfono, estado, notas y precio editable
        await api.updateCita(idCitaACobrar, {
          cliente: formServicio.cliente.trim(),
          cliente_telefono: formServicio.cliente_telefono.trim(),
          estado: 'completada',
          precio: precioFinal,
          notas: notasFinales,
        })
      }

      // 2. Procesar pago en caja
      const resultado = await api.procesarPago({
        citaId: idCitaACobrar,
        metodo: formServicio.metodo,
        productos: [],
      })

      toast.success(`¡Cobro de ${money(precioFinal)} registrado con éxito!`)

      // Mostrar ticket
      setTicketExitoso({
        cliente: formServicio.cliente.trim(),
        telefono: formServicio.cliente_telefono.trim(),
        profesional: emp?.nombre || 'Profesional',
        servicio: serv?.nombre || 'Servicio',
        precio: precioFinal,
        metodo: formServicio.metodo,
        banco: formServicio.banco,
        referencia: formServicio.referenciaComprobante,
        esNuevo: formServicio.esNuevo,
        comision: calculosServicio.comision,
        gananciaLocal: calculosServicio.gananciaLocal,
        fecha: new Date(),
      })

      // Resetear campos del cliente
      limpiarCitaSeleccionada()
      await cargarDatos()
    } catch (err) {
      toast.error(err)
    } finally {
      setProcessing(false)
    }
  }

  // --- 2. VENTA DE PRODUCTOS (TIENDA SEPARADA) ---
  const modificarCantidadTienda = (producto, delta) => {
    const actual = productosVentaTienda[producto.id] || 0
    const nuevo = actual + delta
    if (nuevo < 0) return
    if (nuevo > producto.stock_actual) {
      toast.error(`Solo hay ${producto.stock_actual} unidades en inventario de "${producto.nombre}".`)
      return
    }
    setProductosVentaTienda((prev) => {
      const copia = { ...prev }
      if (nuevo === 0) delete copia[producto.id]
      else copia[producto.id] = nuevo
      return copia
    })
  }

  const productosVentaFiltrados = useMemo(() => {
    const lista = inventario.filter((p) => p.tipo === 'venta')
    if (!busquedaProducto.trim()) return lista
    const q = busquedaProducto.toLowerCase()
    return lista.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [inventario, busquedaProducto])

  const totalVentaProductos = useMemo(() => {
    let tot = 0
    Object.entries(productosVentaTienda).forEach(([id, cant]) => {
      const p = inventario.find((x) => x.id === id)
      if (p) tot += Number(p.precio_venta || 0) * cant
    })
    return tot
  }, [productosVentaTienda, inventario])

  const handleCobrarProductos = async (e) => {
    e.preventDefault()
    if (totalVentaProductos <= 0) {
      toast.error('Agrega al menos un producto para cobrar.')
      return
    }

    setProcessing(true)
    try {
      const now = new Date()
      const servVenta = servicios[0]
      const empVenta = empleados[0]

      const payloadProductos = Object.entries(productosVentaTienda).map(([producto_id, cantidad]) => ({
        producto_id,
        cantidad,
      }))

      // Crear cita técnica de venta
      const cita = await api.createCita({
        barberia_id: servVenta?.barberia_id,
        cliente: formProducto.cliente.trim() || 'Cliente Mostrador',
        cliente_telefono: formProducto.cliente_telefono.trim() || null,
        empleado_id: empVenta?.id,
        servicio_id: servVenta?.id,
        fecha_hora: now,
        estado: 'completada',
        precio: 0,
        notas: `Venta de mostrador (Productos de Tienda)${formProducto.referenciaComprobante ? ` · [${formProducto.banco} Ref: ${formProducto.referenciaComprobante}]` : ''}`,
      })

      // Procesar pago con los productos
      await api.procesarPago({
        citaId: cita.id,
        metodo: formProducto.metodo,
        productos: payloadProductos,
      })

      toast.success(`¡Venta de productos por ${money(totalVentaProductos)} cobrada!`)

      setTicketExitoso({
        cliente: formProducto.cliente || 'Cliente Mostrador',
        telefono: formProducto.cliente_telefono,
        profesional: 'Barbería (Venta Directa)',
        servicio: 'Productos de Tienda',
        precio: totalVentaProductos,
        metodo: formProducto.metodo,
        banco: formProducto.banco,
        referencia: formProducto.referenciaComprobante,
        esNuevo: false,
        comision: 0, // 0% al barbero, 100% negocio
        gananciaLocal: totalVentaProductos,
        itemsComprados: Object.entries(productosVentaTienda).map(([id, cant]) => {
          const item = inventario.find((x) => x.id === id)
          return { nombre: item?.nombre, cantidad: cant, precio: item?.precio_venta }
        }),
        fecha: new Date(),
      })

      setProductosVentaTienda({})
      setFormProducto({
        cliente: 'Cliente Mostrador',
        cliente_telefono: '',
        metodo: 'efectivo',
        banco: 'Nequi',
        referenciaComprobante: '',
      })
      await cargarDatos()
    } catch (err) {
      toast.error(err)
    } finally {
      setProcessing(false)
    }
  }

  // --- 3. COBRO FAMILIAR / GRUPO ---
  const agregarMiembroGrupo = () => {
    setFormGrupo((prev) => ({
      ...prev,
      miembros: [
        ...prev.miembros,
        {
          id: 'm_' + Date.now(),
          nombre: `Integrante ${prev.miembros.length + 1}`,
          empleado_id: empleados[0]?.id || '',
          servicio_id: servicios[0]?.id || '',
          precio: Number(servicios[0]?.precio || 25000),
        },
      ],
    }))
  }

  const quitarMiembroGrupo = (id) => {
    if (formGrupo.miembros.length <= 1) {
      toast.error('Debe haber al menos un integrante en la cuenta.')
      return
    }
    setFormGrupo((prev) => ({
      ...prev,
      miembros: prev.miembros.filter((m) => m.id !== id),
    }))
  }

  const actualizarMiembroGrupo = (id, campo, valor) => {
    setFormGrupo((prev) => ({
      ...prev,
      miembros: prev.miembros.map((m) => {
        if (m.id !== id) return m
        if (campo === 'servicio_id') {
          const serv = servicios.find((s) => s.id === valor)
          return { ...m, servicio_id: valor, precio: Number(serv?.precio || 25000) }
        }
        return { ...m, [campo]: valor }
      }),
    }))
  }

  const calculosGrupo = useMemo(() => {
    let total = 0
    const porBarbero = {}

    formGrupo.miembros.forEach((m) => {
      const p = Number(m.precio) || 0
      total += p
      const emp = empleados.find((e) => e.id === m.empleado_id)
      if (emp) {
        const pct = Number(emp.porcentaje_comision ?? 50)
        const com = Math.round((p * pct) / 100)
        porBarbero[emp.id] ??= {
          nombre: emp.nombre,
          porcentaje: pct,
          totalServicios: 0,
          comision: 0,
          personas: 0,
        }
        porBarbero[emp.id].totalServicios += p
        porBarbero[emp.id].comision += com
        porBarbero[emp.id].personas += 1
      }
    })

    const totalComisiones = Object.values(porBarbero).reduce((s, b) => s + b.comision, 0)
    const gananciaLocal = total - totalComisiones

    return {
      total,
      totalComisiones,
      gananciaLocal,
      desglose: Object.values(porBarbero),
    }
  }, [formGrupo, empleados, servicios])

  const handleCobrarGrupo = async (e) => {
    e.preventDefault()
    if (!formGrupo.responsable.trim()) {
      toast.error('Escribe el nombre de la familia o responsable.')
      return
    }
    setProcessing(true)
    try {
      const now = new Date()
      const refText = formGrupo.referenciaComprobante
        ? ` · [${formGrupo.banco} Ref: ${formGrupo.referenciaComprobante.trim()}]`
        : ''

      for (const m of formGrupo.miembros) {
        const serv = servicios.find((s) => s.id === m.servicio_id)
        const durMin = Number(serv?.duracion_minutos || 30)
        const inicio = new Date(now.getTime() - durMin * 60000)

        const cita = await api.createCita({
          barberia_id: serv?.barberia_id,
          cliente: `${formGrupo.responsable.trim()} · ${m.nombre}`,
          cliente_telefono: formGrupo.cliente_telefono.trim() || null,
          empleado_id: m.empleado_id,
          servicio_id: m.servicio_id,
          fecha_hora: inicio,
          estado: 'completada',
          precio: Number(m.precio) || 25000,
          notas: `Cuenta Familiar (${formGrupo.responsable}) · Integrante: ${m.nombre}${refText}`,
        })

        await api.procesarPago({
          citaId: cita.id,
          metodo: formGrupo.metodo,
          productos: [],
        })
      }

      toast.success(`¡Cuenta familiar cobrada con éxito por ${money(calculosGrupo.total)}!`)

      setTicketExitoso({
        cliente: `${formGrupo.responsable} (${formGrupo.miembros.length} personas)`,
        telefono: formGrupo.cliente_telefono,
        profesional: 'Varios Profesionales',
        servicio: formGrupo.miembros.map((m) => m.nombre).join(' + '),
        precio: calculosGrupo.total,
        metodo: formGrupo.metodo,
        banco: formGrupo.banco,
        referencia: formGrupo.referenciaComprobante,
        esNuevo: false,
        comision: calculosGrupo.totalComisiones,
        gananciaLocal: calculosGrupo.gananciaLocal,
        desgloseGrupo: calculosGrupo.desglose,
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
    <div className="animate-in caja-container">
      {/* Header Principal */}
      <header className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>💈</span>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>Caja de Cobro</h1>
              <p className="page-sub" style={{ margin: 0 }}>
                Cobro rápido en mostrador · Comisión 50% automática · Cero enredos
              </p>
            </div>
          </div>
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

      {/* Arqueo de Caja del Día en Tiempo Real */}
      <div className="grid grid-4 stagger mb-24">
        <StatCard
          icon="trending"
          accent="gold"
          label="Total Recaudado Hoy"
          value={money(metricasCaja.totalRecaudado)}
          hint={`${metricasCaja.cantidad} cobro${metricasCaja.cantidad === 1 ? '' : 's'} hoy`}
        />
        <StatCard
          icon="bill"
          accent="green"
          label="💵 Efectivo en Cajón"
          value={money(metricasCaja.efectivo)}
          hint="Dinero físico en caja"
        />
        <StatCard
          icon="smartphone"
          accent="violet"
          label="📲 Nequi / Transferencias"
          value={money(metricasCaja.transferencia)}
          hint={`Tarjetas: ${money(metricasCaja.tarjeta)}`}
        />
        <StatCard
          icon="wallet"
          accent="blue"
          label="💈 Ganancia Neta Barbería"
          value={money(metricasCaja.gananciaLocal)}
          hint={`Comisiones personal: ${money(metricasCaja.totalComisiones)}`}
        />
      </div>

      {/* Pestañas de Cobro Claras y Grandes */}
      <div className="caja-tabs-nav mb-20">
        <button
          type="button"
          className={`caja-tab-btn ${pestañaCaja === 'servicio' ? 'active' : ''}`}
          onClick={() => setPestañaCaja('servicio')}
        >
          <span style={{ fontSize: 20 }}>💈</span>
          <div>
            <div className="tab-title">Cobro de Corte / Servicio</div>
            <div className="tab-sub">Barbería o Peluquería (50% de comisión)</div>
          </div>
        </button>

        <button
          type="button"
          className={`caja-tab-btn ${pestañaCaja === 'producto' ? 'active' : ''}`}
          onClick={() => setPestañaCaja('producto')}
        >
          <span style={{ fontSize: 20 }}>🛍️</span>
          <div>
            <div className="tab-title">Venta de Productos (Tienda)</div>
            <div className="tab-sub">Ceras, minoxidil, champú (100% Barbería)</div>
          </div>
        </button>

        <button
          type="button"
          className={`caja-tab-btn ${pestañaCaja === 'grupo' ? 'active' : ''}`}
          onClick={() => setPestañaCaja('grupo')}
        >
          <span style={{ fontSize: 20 }}>👥</span>
          <div>
            <div className="tab-title">Cobro Familiar / Grupo</div>
            <div className="tab-sub">2 o más personas en 1 sola factura</div>
          </div>
        </button>
      </div>

      {loading ? (
        <div className="loader-screen" style={{ minHeight: '30vh' }}>
          <Spinner />
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* PESTAÑA 1: COBRO DE CORTE / SERVICIO DIRECTO              */}
          {/* ========================================================= */}
          {pestañaCaja === 'servicio' && (
            <div className="card caja-main-card mb-24">
              {/* Buscador de citas agendadas de hoy para autocompletar */}
              <div
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div className="row-between wrap" style={{ gap: 8, alignItems: 'center' }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <Icon name="search" size={18} style={{ color: 'var(--gold)' }} />
                    <strong style={{ fontSize: 14 }}>
                      ¿El cliente tenía cita agendada? Búscalo por celular o nombre:
                    </strong>
                  </div>
                  {citaSeleccionadaId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)', padding: '2px 8px' }}
                      onClick={limpiarCitaSeleccionada}
                    >
                      ✕ Quitar cita vinculada (Cobrar como cliente libre)
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 8, position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escribe el celular (ej. 312...) o el nombre del cliente..."
                    value={busquedaCita}
                    onChange={(e) => setBusquedaCita(e.target.value)}
                  />

                  {citasFiltradasBusqueda.length > 0 && (
                    <div className="citas-search-dropdown">
                      {citasFiltradasBusqueda.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="citas-search-item"
                          onClick={() => seleccionarCitaParaCobro(c)}
                        >
                          <Avatar nombre={c.empleado?.nombre} area={c.empleado?.area} />
                          <div className="grow" style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>{c.cliente}</div>
                            <div className="faint small">
                              {c.cliente_telefono ? `📱 ${c.cliente_telefono} · ` : ''}
                              {c.servicio?.nombre} con {c.empleado?.nombre}
                            </div>
                          </div>
                          <div className="gold-text mono font-bold">{money(c.precio)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {citaSeleccionadaId && (
                  <div
                    className="row mt-8"
                    style={{
                      background: 'rgba(234, 179, 8, 0.1)',
                      border: '1px solid var(--gold)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Icon name="checkCircle" size={16} style={{ color: 'var(--gold)' }} />
                    <span className="small gold-text font-bold">
                      Cita agendada vinculada. Al cobrar, el sistema marcará su cita como pagada en la agenda.
                    </span>
                  </div>
                )}
              </div>

              {/* Formulario Principal de Cobro */}
              <form onSubmit={handleCobrarServicio}>
                {/* 1. Selector de Área: Barbería o Women */}
                <div className="form-group mb-16">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    1. ¿Barbero o Estilista?
                  </label>
                  <div className="segmented" style={{ maxWidth: 360 }}>
                    <button
                      type="button"
                      className={areaServicio === 'barberia' ? 'active' : ''}
                      onClick={() => handleCambioArea('barberia')}
                    >
                      <Icon name="scissors" /> 💈 Barbería
                    </button>
                    <button
                      type="button"
                      className={areaServicio === 'women' ? 'active' : ''}
                      onClick={() => handleCambioArea('women')}
                    >
                      <Icon name="sparkles" /> 💅 Zona Women
                    </button>
                  </div>
                </div>

                {/* 2. Profesional y Servicio */}
                <div className="grid grid-2 mb-16" style={{ gap: 16 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label required" style={{ fontWeight: 600 }}>
                      2. Profesional que atendió
                    </label>
                    <select
                      className="form-control"
                      value={formServicio.empleado_id}
                      onChange={(e) => setFormServicio({ ...formServicio, empleado_id: e.target.value })}
                      required
                    >
                      <option value="">-- Selecciona Barbero / Estilista --</option>
                      {empleadosFiltrados.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre} (Comisión {emp.porcentaje_comision}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label required" style={{ fontWeight: 600 }}>
                      3. Servicio Realizado
                    </label>
                    <select
                      className="form-control"
                      value={formServicio.servicio_id}
                      onChange={(e) => handleCambioServicio(e.target.value)}
                      required
                    >
                      <option value="">-- Selecciona Servicio --</option>
                      {serviciosFiltrados.map((serv) => (
                        <option key={serv.id} value={serv.id}>
                          {serv.nombre} — {money(serv.precio)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Valor a Cobrar (Directamente editable sin enredos de extras) */}
                <div className="form-group mb-20">
                  <label className="form-label required" style={{ fontWeight: 600 }}>
                    Valor a Cobrar por este Servicio (COP)
                  </label>
                  <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                    <input
                      type="number"
                      className="form-control mono font-bold gold-text"
                      style={{ fontSize: 20, maxWidth: 220 }}
                      value={formServicio.precioEditable}
                      onChange={(e) => setFormServicio({ ...formServicio, precioEditable: e.target.value })}
                      step={1000}
                      min={0}
                      required
                    />
                    <span className="faint small">
                      * El precio se carga automáticamente. Puedes cambiarlo directamente aquí si el cliente pagará un valor diferente.
                    </span>
                  </div>
                </div>

                {/* 3. Datos del Cliente (Base de datos propia) */}
                <div
                  style={{
                    background: 'var(--surface-hover)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <div className="form-title small mb-12" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                    DATOS DEL CLIENTE (BASE DE DATOS DE LA DUEÑA)
                  </div>
                  <div className="grid grid-2 mb-12" style={{ gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label required">Nombre del Cliente</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: Juan David Pérez"
                        value={formServicio.cliente}
                        onChange={(e) => setFormServicio({ ...formServicio, cliente: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label required">
                        📱 Celular / WhatsApp (Importante para tu base de datos)
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="Ej: 312 456 7890"
                        value={formServicio.cliente_telefono}
                        onChange={(e) => setFormServicio({ ...formServicio, cliente_telefono: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row-between wrap" style={{ gap: 12, alignItems: 'center' }}>
                    <label className="row" style={{ gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={formServicio.esNuevo}
                        onChange={(e) => setFormServicio({ ...formServicio, esNuevo: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: 'var(--gold)' }}
                      />
                      <span style={{ fontWeight: 600 }}>⭐ ¿Es cliente nuevo en la barbería?</span>
                    </label>

                    <input
                      type="text"
                      className="form-control input-sm"
                      style={{ maxWidth: 300 }}
                      placeholder="Nota rápida opcional (ej: corte con línea)"
                      value={formServicio.notas}
                      onChange={(e) => setFormServicio({ ...formServicio, notas: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. Método de Pago */}
                <div className="form-group mb-20">
                  <label className="form-label required" style={{ fontWeight: 600 }}>
                    4. ¿Cómo pagó el cliente?
                  </label>
                  <div className="pay-methods-grid">
                    <button
                      type="button"
                      className={`pay-method ${formServicio.metodo === 'efectivo' ? 'active' : ''}`}
                      onClick={() => setFormServicio({ ...formServicio, metodo: 'efectivo' })}
                    >
                      <div className="pm-icon" style={{ color: 'hsl(142, 70%, 55%)' }}>
                        <Icon name="cash" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>💵 Efectivo</div>
                        <div className="faint small">Dinero en cajón físico</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`pay-method ${formServicio.metodo === 'transferencia' ? 'active' : ''}`}
                      onClick={() => setFormServicio({ ...formServicio, metodo: 'transferencia' })}
                    >
                      <div className="pm-icon" style={{ color: 'hsl(300, 75%, 75%)' }}>
                        <Icon name="smartphone" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>📲 Nequi / Transferencia</div>
                        <div className="faint small">Daviplata / Bancolombia / Bre-B</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`pay-method ${formServicio.metodo === 'tarjeta' ? 'active' : ''}`}
                      onClick={() => setFormServicio({ ...formServicio, metodo: 'tarjeta' })}
                    >
                      <div className="pm-icon" style={{ color: 'hsl(190, 85%, 65%)' }}>
                        <Icon name="creditCard" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>💳 Tarjeta</div>
                        <div className="faint small">Datáfono / Débito / Crédito</div>
                      </div>
                    </button>
                  </div>

                  {/* Validación de Transferencia sin necesidad de tomar fotos */}
                  {formServicio.metodo === 'transferencia' && (
                    <div
                      className="mt-12"
                      style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid hsl(300, 70%, 55%)',
                        borderRadius: 'var(--radius)',
                        padding: 14,
                      }}
                    >
                      <div className="row wrap" style={{ gap: 12, alignItems: 'center' }}>
                        <div style={{ minWidth: 150 }}>
                          <label className="form-label small" style={{ marginBottom: 4 }}>
                            Banco / App de Origen:
                          </label>
                          <select
                            className="form-control input-sm"
                            value={formServicio.banco}
                            onChange={(e) => setFormServicio({ ...formServicio, banco: e.target.value })}
                          >
                            <option value="Nequi">Nequi</option>
                            <option value="Daviplata">Daviplata</option>
                            <option value="Bancolombia">Bancolombia</option>
                            <option value="Bre-B">Bre-B</option>
                            <option value="Otro">Otro Banco</option>
                          </select>
                        </div>

                        <div className="grow">
                          <label className="form-label small" style={{ marginBottom: 4 }}>
                            Nro. de Aprobación o Comprobante (Últimos dígitos):
                          </label>
                          <input
                            type="text"
                            className="form-control input-sm mono"
                            placeholder="Ej: M849201 o 8492 (Para cotejar sin tomar fotos al celular)"
                            value={formServicio.referenciaComprobante}
                            onChange={(e) => setFormServicio({ ...formServicio, referenciaComprobante: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Tarjeta de Liquidación Clara al 50% */}
                <div
                  className="receipt mb-20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(202, 138, 4, 0.08), rgba(234, 179, 8, 0.03))',
                    border: '1px solid var(--gold)',
                    borderRadius: 'var(--radius)',
                    padding: 16,
                  }}
                >
                  <div className="receipt-row" style={{ fontSize: 16 }}>
                    <span className="muted">Total a Cobrar al Cliente:</span>
                    <strong className="mono gold-text font-bold" style={{ fontSize: 22 }}>
                      {money(calculosServicio.total)}
                    </strong>
                  </div>

                  <div className="receipt-divider" style={{ margin: '10px 0' }} />

                  <div className="grid grid-2" style={{ gap: 12 }}>
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <div className="faint small">
                        Comisión para {calculosServicio.emp?.nombre || 'el barbero'} ({calculosServicio.porcentaje}%):
                      </div>
                      <div className="mono font-bold" style={{ color: 'hsl(0, 80%, 70%)', fontSize: 18 }}>
                        {money(calculosServicio.comision)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <div className="faint small">Queda libre para la Barbería (50%):</div>
                      <div className="mono font-bold" style={{ color: 'var(--green)', fontSize: 18 }}>
                        {money(calculosServicio.gananciaLocal)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón de Cobro Gigante */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', fontSize: 18, height: 50, justifyContent: 'center' }}
                  disabled={processing}
                  id="caja-btn-cobrar-servicio"
                >
                  {processing ? (
                    <Spinner size="sm" />
                  ) : (
                    <Icon name="check" size={20} />
                  )}{' '}
                  REGISTRAR Y COBRAR CORTE ({money(calculosServicio.total)})
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: VENTA DE PRODUCTOS (TIENDA SEPARADA)           */}
          {/* ========================================================= */}
          {pestañaCaja === 'producto' && (
            <div className="card caja-main-card mb-24">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Venta de Productos de Mostrador</h2>
                  <p className="faint small">
                    El dinero de la venta de ceras, minoxidil y champú va 100% para la barbería (0% comisión a barberos).
                  </p>
                </div>
              </div>

              <form onSubmit={handleCobrarProductos}>
                <div className="grid grid-2 mb-20" style={{ gap: 20 }}>
                  {/* Catálogo de productos para seleccionar */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Selecciona los productos vendidos:
                    </label>
                    <input
                      type="text"
                      className="form-control input-sm mb-12"
                      placeholder="Buscar producto por nombre..."
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                    />

                    <div className="caja-prod-grid">
                      {productosVentaFiltrados.map((p) => {
                        const cant = productosVentaTienda[p.id] || 0
                        return (
                          <div
                            key={p.id}
                            className={`caja-prod-card ${cant > 0 ? 'selected' : ''}`}
                            onClick={() => modificarCantidadTienda(p, cant > 0 ? -1 : 1)}
                          >
                            <div className="row-between">
                              <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                              <span className="mono gold-text">{money(p.precio_venta)}</span>
                            </div>
                            <div className="row-between mt-8 faint small">
                              <span>Stock: {p.stock_actual} uds</span>
                              {cant > 0 && (
                                <span className="badge badge-gold">{cant} en cuenta</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Resumen de la Venta de Productos */}
                  <div className="stack" style={{ gap: 14 }}>
                    <div
                      style={{
                        background: 'var(--surface-hover)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: 14,
                      }}
                    >
                      <div className="form-title small mb-8" style={{ fontWeight: 600 }}>
                        Cliente Comprador:
                      </div>
                      <div className="grid grid-2" style={{ gap: 10 }}>
                        <input
                          type="text"
                          className="form-control input-sm"
                          placeholder="Nombre del cliente"
                          value={formProducto.cliente}
                          onChange={(e) => setFormProducto({ ...formProducto, cliente: e.target.value })}
                        />
                        <input
                          type="tel"
                          className="form-control input-sm"
                          placeholder="Celular (opcional)"
                          value={formProducto.cliente_telefono}
                          onChange={(e) => setFormProducto({ ...formProducto, cliente_telefono: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Método de pago de productos */}
                    <div>
                      <label className="form-label small" style={{ fontWeight: 600 }}>
                        Método de pago de los productos:
                      </label>
                      <div className="row wrap" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${formProducto.metodo === 'efectivo' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setFormProducto({ ...formProducto, metodo: 'efectivo' })}
                        >
                          💵 Efectivo
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${formProducto.metodo === 'transferencia' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setFormProducto({ ...formProducto, metodo: 'transferencia' })}
                        >
                          📲 Nequi / Transferencia
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${formProducto.metodo === 'tarjeta' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setFormProducto({ ...formProducto, metodo: 'tarjeta' })}
                        >
                          💳 Tarjeta
                        </button>
                      </div>

                      {formProducto.metodo === 'transferencia' && (
                        <div className="row mt-8" style={{ gap: 8 }}>
                          <select
                            className="form-control input-sm"
                            style={{ width: 130 }}
                            value={formProducto.banco}
                            onChange={(e) => setFormProducto({ ...formProducto, banco: e.target.value })}
                          >
                            <option value="Nequi">Nequi</option>
                            <option value="Daviplata">Daviplata</option>
                            <option value="Bancolombia">Bancolombia</option>
                          </select>
                          <input
                            type="text"
                            className="form-control input-sm grow mono"
                            placeholder="Nro Comprobante / Aprobación (ej. 8492)"
                            value={formProducto.referenciaComprobante}
                            onChange={(e) => setFormProducto({ ...formProducto, referenciaComprobante: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Total y botón */}
                    <div className="receipt">
                      <div className="receipt-row total">
                        <span>Total Productos:</span>
                        <span className="gold-text mono">{money(totalVentaProductos)}</span>
                      </div>
                      <div className="faint small mt-4" style={{ color: 'var(--green)' }}>
                        ✓ 100% Ganancia neta para la barbería (Sin deducción de comisiones)
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%', justifyContent: 'center' }}
                      disabled={processing || totalVentaProductos <= 0}
                      id="caja-btn-cobrar-productos"
                    >
                      {processing ? <Spinner size="sm" /> : <Icon name="check" />}{' '}
                      Cobrar Venta de Productos ({money(totalVentaProductos)})
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: COBRO FAMILIAR / GRUPO (2+ PERSONAS)           */}
          {/* ========================================================= */}
          {pestañaCaja === 'grupo' && (
            <div className="card caja-main-card mb-24">
              <div className="card-header">
                <div>
                  <h2 className="card-title">👥 Cobro Familiar / Grupo (1 Sola Cuenta)</h2>
                  <p className="faint small">
                    Cobra a la familia completa en una sola factura. Cada miembro tiene su barbero y sus comisiones se separan solas.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={agregarMiembroGrupo}
                  style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                >
                  <Icon name="plus" size={14} /> + Agregar Integrante
                </button>
              </div>

              <form onSubmit={handleCobrarGrupo}>
                <div className="grid grid-2 mb-16" style={{ gap: 14 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label required">Nombre de la Familia o Responsable</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Familia Gómez / Papá Juan"
                      value={formGrupo.responsable}
                      onChange={(e) => setFormGrupo({ ...formGrupo, responsable: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">📱 Celular del Responsable (WhatsApp)</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Ej: 312 456 7890"
                      value={formGrupo.cliente_telefono}
                      onChange={(e) => setFormGrupo({ ...formGrupo, cliente_telefono: e.target.value })}
                    />
                  </div>
                </div>

                {/* Lista de Miembros */}
                <div className="stack mb-20" style={{ gap: 10 }}>
                  {formGrupo.miembros.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        background: 'var(--surface-hover)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: 12,
                      }}
                      className="row wrap"
                    >
                      <div className="row" style={{ gap: 8, alignItems: 'center', minWidth: 200 }}>
                        <span className="badge badge-gold" style={{ width: 24, height: 24, padding: 0, justifyContent: 'center' }}>
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          className="form-control input-sm font-bold"
                          placeholder="Nombre / Parentesco"
                          value={m.nombre}
                          onChange={(e) => actualizarMiembroGrupo(m.id, 'nombre', e.target.value)}
                        />
                      </div>

                      <div className="grow row" style={{ gap: 8 }}>
                        <select
                          className="form-control input-sm"
                          value={m.empleado_id}
                          onChange={(e) => actualizarMiembroGrupo(m.id, 'empleado_id', e.target.value)}
                          required
                        >
                          <option value="">-- Barbero --</option>
                          {empleados.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.nombre} ({emp.area === 'barberia' ? 'Barbero' : 'Estilista'})
                            </option>
                          ))}
                        </select>

                        <select
                          className="form-control input-sm"
                          value={m.servicio_id}
                          onChange={(e) => actualizarMiembroGrupo(m.id, 'servicio_id', e.target.value)}
                          required
                        >
                          <option value="">-- Servicio --</option>
                          {servicios.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre} ({money(s.precio)})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          className="form-control input-sm mono font-bold gold-text"
                          style={{ width: 110 }}
                          value={m.precio}
                          onChange={(e) => actualizarMiembroGrupo(m.id, 'precio', e.target.value)}
                          step={1000}
                        />

                        {formGrupo.miembros.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)', padding: 4 }}
                            onClick={() => quitarMiembroGrupo(m.id)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Método de Pago y Resumen */}
                <div className="grid grid-2 mb-20" style={{ gap: 16 }}>
                  <div>
                    <label className="form-label small" style={{ fontWeight: 600 }}>
                      Método de Pago de la Cuenta Familiar:
                    </label>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${formGrupo.metodo === 'efectivo' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFormGrupo({ ...formGrupo, metodo: 'efectivo' })}
                      >
                        💵 Efectivo
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${formGrupo.metodo === 'transferencia' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFormGrupo({ ...formGrupo, metodo: 'transferencia' })}
                      >
                        📲 Nequi / Transferencia
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${formGrupo.metodo === 'tarjeta' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFormGrupo({ ...formGrupo, metodo: 'tarjeta' })}
                      >
                        💳 Tarjeta
                      </button>
                    </div>

                    {formGrupo.metodo === 'transferencia' && (
                      <div className="row mt-8" style={{ gap: 8 }}>
                        <select
                          className="form-control input-sm"
                          style={{ width: 130 }}
                          value={formGrupo.banco}
                          onChange={(e) => setFormGrupo({ ...formGrupo, banco: e.target.value })}
                        >
                          <option value="Nequi">Nequi</option>
                          <option value="Daviplata">Daviplata</option>
                          <option value="Bancolombia">Bancolombia</option>
                        </select>
                        <input
                          type="text"
                          className="form-control input-sm grow mono"
                          placeholder="Nro Comprobante / Aprobación (ej. 8492)"
                          value={formGrupo.referenciaComprobante}
                          onChange={(e) => setFormGrupo({ ...formGrupo, referenciaComprobante: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="receipt">
                    <div className="receipt-row total">
                      <span>Total Familia / Grupo:</span>
                      <span className="gold-text mono">{money(calculosGrupo.total)}</span>
                    </div>
                    <div className="receipt-divider" style={{ margin: '8px 0' }} />
                    <div className="faint small">
                      {calculosGrupo.desglose.map((b) => (
                        <div key={b.nombre} className="row-between">
                          <span>{b.nombre} ({b.personas} pers.):</span>
                          <strong className="mono" style={{ color: 'var(--green)' }}>
                            Comisión: {money(b.comision)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={processing}
                  id="caja-btn-cobrar-grupo"
                >
                  {processing ? <Spinner size="sm" /> : <Icon name="check" />}{' '}
                  Cobrar Cuenta Familiar ({money(calculosGrupo.total)})
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* HISTORIAL DE COBROS DE HOY EN TIEMPO REAL                 */}
          {/* ========================================================= */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Cobros Realizados Hoy ({pagosHoy.length})</h2>
                <p className="faint small">
                  Registro contable en tiempo real con comprobantes de transferencia y comisiones al 50%.
                </p>
              </div>
            </div>

            {pagosHoy.length === 0 ? (
              <Empty
                icon="cash"
                title="Aún no hay cobros registrados hoy"
              >
                <p className="faint small">Los cobros que realices en el formulario de arriba aparecerán aquí en vivo.</p>
              </Empty>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Cliente & Celular</th>
                      <th>Servicio / Ítem</th>
                      <th>Profesional</th>
                      <th>Método de Pago</th>
                      <th className="right">Cobrado</th>
                      <th className="right">Comisión (50%)</th>
                      <th className="right">Barbería</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosHoy.map((p) => {
                      const esNuevo = p.cita?.notas?.includes('[Cliente Nuevo]')
                      const ganancia = Number(p.total_pago) - Number(p.comision_empleado)
                      return (
                        <tr key={p.id}>
                          <td className="mono faint small">{hora(p.created_at)}</td>
                          <td>
                            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                              <strong>{p.cita?.cliente || 'Cliente'}</strong>
                              {esNuevo && (
                                <span
                                  className="badge badge-gold"
                                  style={{ fontSize: 10, padding: '2px 6px' }}
                                >
                                  ⭐ NUEVO
                                </span>
                              )}
                            </div>
                            {p.cita?.cliente_telefono && (
                              <div className="faint small mono">📱 {p.cita.cliente_telefono}</div>
                            )}
                          </td>
                          <td>
                            <div>{p.cita?.servicio?.nombre || 'Servicio'}</div>
                            {p.cita?.notas && (
                              <div className="faint small" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.cita.notas}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                              <Avatar nombre={p.empleado?.nombre} area={p.empleado?.area} size="sm" />
                              <span>{p.empleado?.nombre || 'Profesional'}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-outline">
                              {p.metodo_pago === 'efectivo'
                                ? '💵 Efectivo'
                                : p.metodo_pago === 'tarjeta'
                                ? '💳 Tarjeta'
                                : '📲 Nequi / Transf.'}
                            </span>
                          </td>
                          <td className="right mono font-bold gold-text">
                            {money(p.total_pago)}
                          </td>
                          <td className="right mono" style={{ color: 'hsl(0, 80%, 70%)' }}>
                            {money(p.comision_empleado)}
                          </td>
                          <td className="right mono" style={{ color: 'var(--green)' }}>
                            {money(ganancia)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL / TICKET DE COBRO EXITOSO                           */}
      {/* ========================================================= */}
      <Modal
        open={Boolean(ticketExitoso)}
        onClose={() => setTicketExitoso(null)}
        title="✓ ¡Cobro Registrado con Éxito!"
        subtitle="El pago quedó asentado en la caja y en las comisiones de hoy."
        size="md"
        footer={
          <div className="row-between wrap" style={{ width: '100%', gap: 10 }}>
            {ticketExitoso?.telefono ? (
              <a
                href={`https://wa.me/57${ticketExitoso.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `¡Hola ${ticketExitoso.cliente}! Muchas gracias por tu visita a Elite Barber Studio. Tu pago de ${money(ticketExitoso.precio)} por ${ticketExitoso.servicio} fue recibido con éxito. ¡Te esperamos pronto!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
              >
                <Icon name="smartphone" /> Enviar Comprobante WhatsApp
              </a>
            ) : <div />}

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setTicketExitoso(null)}
            >
              Listo, Cerrar
            </button>
          </div>
        }
      >
        {ticketExitoso && (
          <div className="receipt stack" style={{ gap: 14 }}>
            <div className="receipt-header" style={{ textAlign: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: 12 }}>
              <div style={{ fontSize: 24 }}>💈</div>
              <strong style={{ fontSize: 18, color: 'var(--gold)' }}>Elite Barber Studio</strong>
              <div className="faint small">{fechaHora(ticketExitoso.fecha)}</div>
            </div>

            <div className="receipt-row">
              <span className="muted">Cliente:</span>
              <strong>{ticketExitoso.cliente} {ticketExitoso.esNuevo ? '⭐ (Nuevo)' : ''}</strong>
            </div>

            {ticketExitoso.telefono && (
              <div className="receipt-row">
                <span className="muted">Celular:</span>
                <strong className="mono">{ticketExitoso.telefono}</strong>
              </div>
            )}

            <div className="receipt-row">
              <span className="muted">Profesional:</span>
              <span>{ticketExitoso.profesional}</span>
            </div>

            <div className="receipt-row">
              <span className="muted">Servicio / Ítems:</span>
              <span>{ticketExitoso.servicio}</span>
            </div>

            <div className="receipt-row">
              <span className="muted">Método de Pago:</span>
              <span className="badge badge-outline">
                {ticketExitoso.metodo === 'efectivo' ? '💵 Efectivo' : ticketExitoso.metodo === 'tarjeta' ? '💳 Tarjeta' : `📲 ${ticketExitoso.banco || 'Nequi'} ${ticketExitoso.referencia ? `#${ticketExitoso.referencia}` : ''}`}
              </span>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-row total">
              <span>Total Cobrado:</span>
              <span className="gold-text mono font-bold" style={{ fontSize: 22 }}>
                {money(ticketExitoso.precio)}
              </span>
            </div>

            <div className="grid grid-2 mt-8" style={{ gap: 10 }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: 8, borderRadius: 6 }}>
                <div className="faint small">Comisión Personal (50%):</div>
                <strong className="mono" style={{ color: 'hsl(0, 80%, 70%)' }}>
                  {money(ticketExitoso.comision)}
                </strong>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', padding: 8, borderRadius: 6 }}>
                <div className="faint small">Ganancia Barbería:</div>
                <strong className="mono" style={{ color: 'var(--green)' }}>
                  {money(ticketExitoso.gananciaLocal)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
