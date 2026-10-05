import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { Avatar, Empty, Modal, Skeleton, Spinner, StatCard } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { TIPOS_PRODUCTO } from '../lib/constants'
import { money } from '../lib/format'

const INITIAL_DOTACIONES = [
  { id: 'd1', empleado_nombre: 'Barbero 01 (Carlos)', area: 'barberia', item: 'Máquina Wahl Magic Clip Cordless', serial: 'WHL-8941', estado: 'Excelente', fecha_entrega: '2026-01-10', notas: 'Cuchilla de repuesto incluida' },
  { id: 'd2', empleado_nombre: 'Barbero 01 (Carlos)', area: 'barberia', item: 'Barbera de Acero Inoxidable Parker', serial: 'BAR-01', estado: 'Excelente', fecha_entrega: '2026-01-10', notas: 'Mango ergonómico' },
  { id: 'd3', empleado_nombre: 'Barbero 01 (Carlos)', area: 'barberia', item: 'Tijera Microdentada 6.0" Cobalt', serial: 'TIJ-44', estado: 'Excelente', fecha_entrega: '2026-01-10', notas: 'Funda de cuero' },
  { id: 'd4', empleado_nombre: 'Barbero 02 (Andrés)', area: 'barberia', item: 'Máquina Babyliss Pro GoldFX', serial: 'BBL-3021', estado: 'Excelente', fecha_entrega: '2026-01-15', notas: 'Base de carga' },
  { id: 'd5', empleado_nombre: 'Barbero 02 (Andrés)', area: 'barberia', item: 'Trimmer Andis Slimline Pro Li', serial: 'AND-1102', estado: 'Bueno', fecha_entrega: '2026-01-15', notas: 'Para terminados y perfilado' },
  { id: 'd6', empleado_nombre: 'Barbero 03 (Julián)', area: 'barberia', item: 'Máquina Gamma+ Ergo Clipper', serial: 'GMA-9912', estado: 'Excelente', fecha_entrega: '2026-02-01', notas: 'Motor magnético 10k RPM' },
  { id: 'd7', empleado_nombre: 'Estilista 01 (Valentina)', area: 'women', item: 'Lámpara LED/UV SunX Plus 72W', serial: 'UV-7782', estado: 'Excelente', fecha_entrega: '2026-01-12', notas: 'Temporizador digital 4 tiempos' },
  { id: 'd8', empleado_nombre: 'Estilista 01 (Valentina)', area: 'women', item: 'Torno Pulidor Drill 35.000 RPM', serial: 'DRL-504', estado: 'Excelente', fecha_entrega: '2026-01-12', notas: 'Set de 6 fresas de carburo' },
  { id: 'd9', empleado_nombre: 'Estilista 01 (Valentina)', area: 'women', item: 'Extractor de Polvo de Uñas 40W', serial: 'EXT-101', estado: 'Bueno', fecha_entrega: '2026-01-12', notas: 'Filtro lavable de repuesto' },
  { id: 'd10', empleado_nombre: 'Estilista 02 (Camila)', area: 'women', item: 'Secador Iónico Babyliss 2000W', serial: 'SEC-883', estado: 'Excelente', fecha_entrega: '2026-01-18', notas: 'Boquilla y difusor profesional' },
  { id: 'd11', empleado_nombre: 'Estilista 02 (Camila)', area: 'women', item: 'Lámpara LED SunX 48W Manicure', serial: 'UV-4401', estado: 'Excelente', fecha_entrega: '2026-01-18', notas: 'Mesa #2' },
]

export default function Inventario() {
  const toast = useToast()
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabTipo, setTabTipo] = useState('todos') // todos | venta | consumo_interno | herramienta | dotacion | bajo_stock
  const [busqueda, setBusqueda] = useState('')
  const [modalProducto, setModalProducto] = useState(null)
  const [modalDotacion, setModalDotacion] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [dotaciones, setDotaciones] = useState(() => {
    try {
      const s = localStorage.getItem('barberos-dotaciones')
      if (s) return JSON.parse(s)
    } catch {}
    return INITIAL_DOTACIONES
  })

  const [formDotacion, setFormDotacion] = useState({
    empleado_nombre: 'Barbero 01 (Carlos)',
    area: 'barberia',
    item: '',
    serial: '',
    estado: 'Excelente',
    notas: '',
  })
  const [form, setForm] = useState({
    nombre: '',
    tipo: 'venta',
    stock_actual: 0,
    stock_minimo: 5,
    precio_compra: 0,
    precio_venta: 0,
  })

  const cargarInventario = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listInventario()
      setProductos(data)
    } catch (err) {
      toast.error(err)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargarInventario()
  }, [cargarInventario])

  const abrirModal = (producto = null) => {
    if (producto) {
      setForm({
        id: producto.id,
        nombre: producto.nombre,
        tipo: producto.tipo,
        stock_actual: producto.stock_actual,
        stock_minimo: producto.stock_minimo ?? 5,
        precio_compra: producto.precio_compra,
        precio_venta: producto.precio_venta,
      })
    } else {
      setForm({
        nombre: '',
        tipo: 'venta',
        stock_actual: 10,
        stock_minimo: 5,
        precio_compra: 0,
        precio_venta: 0,
      })
    }
    setModalProducto(producto || {})
  }

  const guardarProducto = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      toast.error('El nombre del producto es obligatorio.')
      return
    }
    setGuardando(true)
    try {
      await api.saveProducto({
        ...form,
        nombre: form.nombre.trim(),
        stock_actual: Number(form.stock_actual),
        stock_minimo: Number(form.stock_minimo),
        precio_compra: Number(form.precio_compra),
        precio_venta: form.tipo === 'venta' ? Number(form.precio_venta) : 0,
      })
      toast.success(form.id ? 'Producto actualizado' : 'Producto añadido al inventario')
      setModalProducto(null)
      cargarInventario()
    } catch (err) {
      toast.error(err)
    } finally {
      setGuardando(false)
    }
  }

  const eliminarProducto = async (prod) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${prod.nombre}"?`)) return
    try {
      await api.deleteProducto(prod.id)
      toast.success('Producto eliminado')
      cargarInventario()
    } catch (err) {
      toast.error(err)
    }
  }

  const ajustarStockRapido = async (prod, delta) => {
    try {
      const nuevo = await api.ajustarStock(prod.id, delta)
      setProductos((prev) => prev.map((p) => (p.id === prod.id ? nuevo : p)))
      toast.success(`Stock de "${prod.nombre}": ${nuevo.stock_actual}`)
    } catch (err) {
      toast.error(err)
    }
  }

  // Filtrado
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchesSearch = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      if (!matchesSearch) return false

      if (tabTipo === 'todos') return true
      if (tabTipo === 'bajo_stock') return p.stock_actual < (p.stock_minimo ?? 5)
      return p.tipo === tabTipo
    })
  }, [productos, busqueda, tabTipo])

  // Estadísticas rápidas
  const metricas = useMemo(() => {
    const totalItems = productos.length
    const bajos = productos.filter((p) => p.stock_actual < (p.stock_minimo ?? 5)).length
    const valorCosto = productos.reduce((sum, p) => sum + Number(p.precio_compra || 0) * p.stock_actual, 0)
    const valorVentaEsperado = productos
      .filter((p) => p.tipo === 'venta')
      .reduce((sum, p) => sum + Number(p.precio_venta || 0) * p.stock_actual, 0)

    return { totalItems, bajos, valorCosto, valorVentaEsperado }
  }, [productos])

  return (
    <div className="animate-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Inventario y Stock</h1>
          <p className="page-sub">
            Control de productos para venta a clientes y de consumo interno para estilistas y barberos.
          </p>
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => setModalDotacion(true)}
            id="inv-btn-dotacion"
          >
            <Icon name="tool" /> Asignar Dotación
          </button>
          <button
            className="btn btn-primary"
            onClick={() => abrirModal(null)}
            id="inv-btn-nuevo"
          >
            <Icon name="plus" /> Nuevo Producto / Máquina
          </button>
        </div>
      </header>

      {/* Tarjetas de Métricas de Inventario */}
      <div className="grid grid-4 stagger mb-24">
        <StatCard
          icon="box"
          label="Total de Productos"
          value={metricas.totalItems}
          hint="En catálogo activo"
        />
        <StatCard
          icon="alert"
          accent={metricas.bajos > 0 ? 'red' : 'green'}
          label="Alertas de Stock Bajo"
          value={metricas.bajos}
          hint={metricas.bajos > 0 ? 'Por debajo del mínimo (< 5)' : 'Todo abastecido'}
        />
        <StatCard
          icon="tool"
          accent="amber"
          label="Dotación Asignada"
          value={`${dotaciones.length} ítems`}
          hint="Máquinas, tijeras, lámparas en uso"
        />
        <StatCard
          icon="trending"
          accent="gold"
          label="Valor Proyectado Venta"
          value={money(metricas.valorVentaEsperado)}
          hint="Potencial de venta en tienda"
        />
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card mt-24">
        <div className="row-between wrap" style={{ marginBottom: 16, gap: 12 }}>
          <div className="segmented wrap">
            <button
              className={tabTipo === 'todos' ? 'active' : ''}
              onClick={() => setTabTipo('todos')}
              id="inv-tab-todos"
            >
              Todos ({productos.length})
            </button>
            <button
              className={tabTipo === 'venta' ? 'active' : ''}
              onClick={() => setTabTipo('venta')}
              id="inv-tab-venta"
            >
              Venta ({productos.filter((p) => p.tipo === 'venta').length})
            </button>
            <button
              className={tabTipo === 'consumo_interno' ? 'active' : ''}
              onClick={() => setTabTipo('consumo_interno')}
              id="inv-tab-consumo"
            >
              Consumo Interno ({productos.filter((p) => p.tipo === 'consumo_interno').length})
            </button>
            <button
              className={tabTipo === 'herramienta' ? 'active' : ''}
              onClick={() => setTabTipo('herramienta')}
              id="inv-tab-equipos"
            >
              Máquinas y Equipos ({productos.filter((p) => p.tipo === 'herramienta').length})
            </button>
            <button
              className={tabTipo === 'dotacion' ? 'active' : ''}
              onClick={() => setTabTipo('dotacion')}
              id="inv-tab-dotacion"
              style={{ fontWeight: 700 }}
            >
              Dotación por Empleado ({dotaciones.length})
            </button>
            <button
              className={tabTipo === 'bajo_stock' ? 'active' : ''}
              onClick={() => setTabTipo('bajo_stock')}
              id="inv-tab-bajos"
              style={{ color: metricas.bajos > 0 ? 'var(--red)' : undefined }}
            >
              Stock Bajo ({metricas.bajos})
            </button>
          </div>

          <div className="input-icon" style={{ width: 260 }}>
            <Icon name="search" />
            <input
              type="text"
              className="input input-sm"
              placeholder="Buscar producto por nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              id="inv-buscar"
            />
          </div>
        </div>

        {/* Tabla CRUD o Vista de Dotación */}
        {tabTipo === 'dotacion' ? (
          <div className="col" style={{ gap: 16 }}>
            <div className="row-between wrap" style={{ gap: 10 }}>
              <div>
                <strong style={{ fontSize: 16 }}>Dotación y Máquinas Asignadas a Trabajadores</strong>
                <p className="faint small">Control de qué máquinas de corte, secadores, lámparas de uñas y barberas tiene a cargo cada empleado.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setModalDotacion(true)}>
                <Icon name="plus" /> Asignar Herramienta
              </button>
            </div>

            <div className="dotacion-grid">
              {Array.from(new Set(dotaciones.map((d) => d.empleado_nombre))).map((nombreEmp) => {
                const itemsEmp = dotaciones.filter((d) => d.empleado_nombre === nombreEmp)
                const areaEmp = itemsEmp[0]?.area || 'barberia'
                return (
                  <div key={nombreEmp} className="dotacion-card">
                    <div className="row-between">
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar nombre={nombreEmp} area={areaEmp} />
                        <div>
                          <strong>{nombreEmp}</strong>
                          <div className="faint small">{itemsEmp.length} herramientas asignadas</div>
                        </div>
                      </div>
                      <span className={`badge ${areaEmp === 'women' ? 'badge-rose' : 'badge-gold'} no-dot`}>
                        {areaEmp === 'women' ? 'Zona Women' : 'Barbería'}
                      </span>
                    </div>

                    <div className="col" style={{ gap: 8, marginTop: 4 }}>
                      {itemsEmp.map((it) => (
                        <div key={it.id} className="dotacion-item-row">
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>{it.item}</div>
                            <div className="row" style={{ gap: 6, marginTop: 2 }}>
                              {it.serial && <span className="dotacion-serial">{it.serial}</span>}
                              <span className="faint small">Entrega: {it.fecha_entrega}</span>
                            </div>
                            {it.notas && <div className="faint small" style={{ fontStyle: 'italic', marginTop: 2 }}>{it.notas}</div>}
                          </div>
                          <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                            <span className="badge badge-gold no-dot" style={{ fontSize: 11 }}>{it.estado}</span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Retirar dotación"
                              onClick={() => {
                                if (confirm(`¿Retirar "${it.item}" de ${nombreEmp}?`)) {
                                  const upd = dotaciones.filter((x) => x.id !== it.id)
                                  setDotaciones(upd)
                                  localStorage.setItem('barberos-dotaciones', JSON.stringify(upd))
                                  toast.success('Dotación actualizada')
                                }
                              }}
                            >
                              <Icon name="x" size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : loading ? (
          <Skeleton h={200} />
        ) : productosFiltrados.length === 0 ? (
          <Empty icon="box" title="No se encontraron productos">
            {busqueda ? 'No hay productos que coincidan con la búsqueda.' : 'Agrega tu primer producto al inventario.'}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto / Equipo</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'center' }}>Stock Actual</th>
                  <th className="num">Costo Compra</th>
                  <th className="num">Precio Venta</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((prod) => {
                  const bajoStock = prod.stock_actual < (prod.stock_minimo ?? 5)
                  return (
                    <tr key={prod.id} className={bajoStock ? 'row-alert' : ''}>
                      <td>
                        <strong style={{ display: 'block', fontSize: 14 }}>{prod.nombre}</strong>
                        {bajoStock && (
                          <span className="badge badge-cancelada no-dot" style={{ marginTop: 4 }}>
                            Stock bajo (mín. {prod.stock_minimo ?? 5})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${prod.tipo === 'venta' ? 'badge-gold' : prod.tipo === 'herramienta' ? 'badge-amber' : 'badge-nequi'} no-dot`}>
                          {TIPOS_PRODUCTO[prod.tipo] || prod.tipo}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Restar 1 unidad"
                            onClick={() => ajustarStockRapido(prod, -1)}
                            disabled={prod.stock_actual <= 0}
                            id={`inv-minus-${prod.id}`}
                          >
                            <Icon name="minus" />
                          </button>
                          <span
                            className="mono"
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              minWidth: 32,
                              color: bajoStock ? 'var(--red)' : undefined,
                            }}
                          >
                            {prod.stock_actual}
                          </span>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Sumar 1 unidad"
                            onClick={() => ajustarStockRapido(prod, 1)}
                            id={`inv-plus-${prod.id}`}
                          >
                            <Icon name="plus" />
                          </button>
                        </div>
                      </td>
                      <td className="num mono faint">{money(prod.precio_compra)}</td>
                      <td className="num mono">
                        {prod.tipo === 'venta' ? (
                          <strong style={{ color: 'var(--gold)' }}>{money(prod.precio_venta)}</strong>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Editar"
                            onClick={() => abrirModal(prod)}
                            id={`inv-edit-${prod.id}`}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            title="Eliminar"
                            onClick={() => eliminarProducto(prod)}
                            id={`inv-delete-${prod.id}`}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Producto */}
      <Modal
        open={Boolean(modalProducto)}
        onClose={() => setModalProducto(null)}
        title={form.id ? 'Editar Producto o Equipo' : 'Nuevo Producto / Equipo'}
        subtitle="Distingue entre insumos, máquinas de trabajo y productos para clientes."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalProducto(null)} type="button">
              Cancelar
            </button>
            <button className="btn btn-primary" form="form-producto" type="submit" disabled={guardando} id="inv-guardar">
              {guardando ? <Spinner /> : <><Icon name="check" /> {form.id ? 'Guardar Cambios' : 'Crear Producto'}</>}
            </button>
          </>
        }
      >
        <form id="form-producto" className="form-grid" onSubmit={guardarProducto}>
          <div className="field span-2">
            <label className="label" htmlFor="prod-nombre">Nombre del Producto / Equipo</label>
            <input
              id="prod-nombre"
              className="input"
              required
              placeholder="Ej. Cera mate, Máquina Wahl, Secador Babyliss..."
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              autoFocus
            />
          </div>

          <div className="field span-2">
            <label className="label" htmlFor="prod-tipo">Tipo de Ítem</label>
            <select
              id="prod-tipo"
              className="select"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="venta">Venta al cliente (Se puede cobrar en Caja)</option>
              <option value="consumo_interno">Consumo interno (Insumo del barbero/peluquera)</option>
              <option value="herramienta">Máquinas y Equipos del local (Activos / Dotación)</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="prod-stock-actual">Stock Actual</label>
            <input
              id="prod-stock-actual"
              type="number"
              min="0"
              className="input"
              required
              value={form.stock_actual}
              onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="prod-stock-minimo">Stock Mínimo (Alerta)</label>
            <input
              id="prod-stock-minimo"
              type="number"
              min="0"
              className="input"
              required
              value={form.stock_minimo}
              onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="prod-precio-compra">Precio de Compra / Costo</label>
            <input
              id="prod-precio-compra"
              type="number"
              min="0"
              step="500"
              className="input"
              value={form.precio_compra}
              onChange={(e) => setForm({ ...form, precio_compra: e.target.value })}
            />
          </div>

          {form.tipo === 'venta' && (
            <div className="field">
              <label className="label" htmlFor="prod-precio-venta">Precio de Venta al Público</label>
              <input
                id="prod-precio-venta"
                type="number"
                min="0"
                step="500"
                className="input"
                required
                value={form.precio_venta}
                onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Modal Asignar Dotación a Empleado */}
      <Modal
        open={modalDotacion}
        onClose={() => setModalDotacion(false)}
        title="Asignar Dotación / Herramienta a Empleado"
        subtitle="Registra qué máquinas de corte, secadores, lámparas UV o barberas tiene a cargo cada profesional."
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setModalDotacion(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              type="button"
              id="inv-guardar-dotacion"
              onClick={() => {
                if (!formDotacion.item.trim()) {
                  toast.error('Indica qué máquina o herramienta estás asignando')
                  return
                }
                const nuevoItem = {
                  id: 'dot-' + Date.now(),
                  ...formDotacion,
                  fecha_entrega: new Date().toISOString().split('T')[0],
                }
                const updated = [...dotaciones, nuevoItem]
                setDotaciones(updated)
                localStorage.setItem('barberos-dotaciones', JSON.stringify(updated))
                toast.success(`"${formDotacion.item}" asignada exitosamente a ${formDotacion.empleado_nombre}`)
                setModalDotacion(false)
                setFormDotacion({ ...formDotacion, item: '', serial: '', notas: '' })
              }}
            >
              <Icon name="check" /> Asignar Dotación
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field span-2">
            <label className="label">Profesional / Trabajador</label>
            <select
              className="select"
              value={formDotacion.empleado_nombre}
              onChange={(e) => {
                const nombre = e.target.value
                const isWomen = nombre.includes('Estilista') || nombre.includes('Valentina') || nombre.includes('Camila')
                setFormDotacion({
                  ...formDotacion,
                  empleado_nombre: nombre,
                  area: isWomen ? 'women' : 'barberia',
                })
              }}
            >
              <optgroup label="Barbería (Caballeros)">
                <option value="Barbero 01 (Carlos)">Barbero 01 (Carlos)</option>
                <option value="Barbero 02 (Andrés)">Barbero 02 (Andrés)</option>
                <option value="Barbero 03 (Julián)">Barbero 03 (Julián)</option>
                <option value="Barbero 04 (Santiago)">Barbero 04 (Santiago)</option>
                <option value="Barbero 05 (Mateo)">Barbero 05 (Mateo)</option>
                <option value="Barbero 06 (Felipe)">Barbero 06 (Felipe)</option>
                <option value="Barbero 07 (Daniel)">Barbero 07 (Daniel)</option>
                <option value="Barbero 08 (Sebastián)">Barbero 08 (Sebastián)</option>
                <option value="Barbero 09 (Kevin)">Barbero 09 (Kevin)</option>
              </optgroup>
              <optgroup label="Zona Women (Damas)">
                <option value="Estilista 01 (Valentina)">Estilista 01 (Valentina)</option>
                <option value="Estilista 02 (Camila)">Estilista 02 (Camila)</option>
                <option value="Estilista 03 (Laura)">Estilista 03 (Laura)</option>
                <option value="Estilista 04 (Daniela)">Estilista 04 (Daniela)</option>
                <option value="Estilista 05 (Sofía)">Estilista 05 (Sofía)</option>
              </optgroup>
            </select>
          </div>

          <div className="field span-2">
            <label className="label">Herramienta, Máquina o Dotación</label>
            <input
              className="input"
              placeholder="Ej. Máquina Wahl Senior, Lámpara UV/LED, Secador Babyliss, Barbera Acero..."
              value={formDotacion.item}
              onChange={(e) => setFormDotacion({ ...formDotacion, item: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label">Serial / Código Interno (Opcional)</label>
            <input
              className="input"
              placeholder="Ej. WHL-8841"
              value={formDotacion.serial}
              onChange={(e) => setFormDotacion({ ...formDotacion, serial: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label">Estado del Equipo</label>
            <select
              className="select"
              value={formDotacion.estado}
              onChange={(e) => setFormDotacion({ ...formDotacion, estado: e.target.value })}
            >
              <option value="Excelente">Excelente (Nuevo / Como nuevo)</option>
              <option value="Bueno">Bueno (Operativo)</option>
              <option value="En Mantenimiento">En Mantenimiento</option>
              <option value="Requiere Reemplazo">Requiere Reemplazo</option>
            </select>
          </div>

          <div className="field span-2">
            <label className="label">Notas de Entrega / Accesorios</label>
            <input
              className="input"
              placeholder="Ej. Entregada con 4 peines guía, cable y aceite lubricante"
              value={formDotacion.notas}
              onChange={(e) => setFormDotacion({ ...formDotacion, notas: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
