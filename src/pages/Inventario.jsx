import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { Empty, Modal, Skeleton, Spinner, StatCard } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { TIPOS_PRODUCTO } from '../lib/constants'
import { money } from '../lib/format'

export default function Inventario() {
  const toast = useToast()
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabTipo, setTabTipo] = useState('todos') // todos | venta | consumo_interno | bajo_stock
  const [busqueda, setBusqueda] = useState('')
  const [modalProducto, setModalProducto] = useState(null) // null | {} para nuevo o editar
  const [guardando, setGuardando] = useState(false)
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
        <button
          className="btn btn-primary"
          onClick={() => abrirModal(null)}
          id="inv-btn-nuevo"
        >
          <Icon name="plus" /> Nuevo Producto
        </button>
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
          icon="wallet"
          accent="blue"
          label="Valorización al Costo"
          value={money(metricas.valorCosto)}
          hint="Capital en bodega"
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
        <div className="row-between wrap" style={{ marginBottom: 16 }}>
          <div className="segmented">
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
              Venta a Clientes ({productos.filter((p) => p.tipo === 'venta').length})
            </button>
            <button
              className={tabTipo === 'consumo_interno' ? 'active' : ''}
              onClick={() => setTabTipo('consumo_interno')}
              id="inv-tab-consumo"
            >
              Consumo Interno ({productos.filter((p) => p.tipo === 'consumo_interno').length})
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

        {/* Tabla CRUD */}
        {loading ? (
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
                  <th>Producto</th>
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
                        <span className={`badge ${prod.tipo === 'venta' ? 'badge-gold' : 'badge-nequi'} no-dot`}>
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
        title={form.id ? 'Editar Producto' : 'Nuevo Producto'}
        subtitle="Distingue entre insumos de trabajo y productos para clientes."
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
            <label className="label" htmlFor="prod-nombre">Nombre del Producto</label>
            <input
              id="prod-nombre"
              className="input"
              required
              placeholder="Ej. Cera mate, Laca, Cuchillas..."
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              autoFocus
            />
          </div>

          <div className="field span-2">
            <label className="label" htmlFor="prod-tipo">Tipo de Producto</label>
            <select
              id="prod-tipo"
              className="select"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="venta">Venta al cliente (Se puede cobrar en Caja)</option>
              <option value="consumo_interno">Consumo interno (Insumo del barbero/peluquera)</option>
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
    </div>
  )
}
