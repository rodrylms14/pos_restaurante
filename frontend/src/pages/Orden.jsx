import { useState, useEffect } from 'react'
import { getProductos, agregarItem, eliminarItem, cerrarOrden, cancelarOrden, getOrdenes, crearOrden, aplicarDescuento, getClientes } from '../services/api'

export default function Orden({ mesa, onVolver }) {
  const [orden, setOrden] = useState(null)
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [vista, setVista] = useState('orden')
  const [metodoPago, setMetodoPago] = useState(null)
  const [efectivo, setEfectivo] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [clienteId, setClienteId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [personas, setPersonas] = useState(2)

  useEffect(() => {
    inicializar()
  }, [mesa])

  const inicializar = async () => {
    setCargando(true)
    try {
      const [resOrdenes, resProductos, resClientes] = await Promise.all([
        getOrdenes(),
        getProductos(),
        getClientes()
      ])
      setProductos(resProductos.data.filter(p => p.disponible))
      setClientes(resClientes.data)

      if (mesa === 'llevar') {
        const nombre = prompt('Nombre del cliente:')
        if (!nombre) { onVolver(); return }
        const res = await crearOrden({ tipo: 'llevar', zona: 'barra', cliente: nombre })
        setOrden(res.data)
      } else {
        const ordenExistente = resOrdenes.data.find(o => o.mesaId === mesa.id)
        if (ordenExistente) {
          setOrden(ordenExistente)
        } else {
          const res = await crearOrden({ tipo: 'mesa', mesaId: mesa.id, zona: mesa.zona })
          setOrden(res.data)
        }
      }
    } catch (e) {
      console.error(e)
    }
    setCargando(false)
  }

  const recargarOrden = async () => {
    const res = await getOrdenes()
    const actualizada = res.data.find(o => o.id === orden.id)
    if (actualizada) setOrden(actualizada)
  }

  const agregarProducto = async (producto) => {
    try {
      await agregarItem(orden.id, { productoId: producto.id, cantidad: 1 })
      await recargarOrden()
    } catch (e) {
      console.error(e)
    }
  }

  const quitarItem = async (itemId) => {
    try {
      await eliminarItem(orden.id, itemId)
      await recargarOrden()
    } catch (e) {
      console.error(e)
    }
  }

  const aplicarDesc = async () => {
    try {
      await aplicarDescuento(orden.id, descuento)
      await recargarOrden()
    } catch (e) {
      console.error(e)
    }
  }

  const cobrar = async () => {
    if (!metodoPago) return alert('Selecciona un método de pago')
    if (metodoPago === 'fiado' && !clienteId) return alert('Selecciona el cliente')
    try {
      await cerrarOrden(orden.id, { metodoPago, clienteId })
      onVolver()
    } catch (e) {
      console.error(e)
    }
  }

  const cancelar = async () => {
    if (!window.confirm('¿Cancelar esta orden?')) return
    try {
      await cancelarOrden(orden.id)
      onVolver()
    } catch (e) {
      console.error(e)
    }
  }

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F5F0' }}>
      <p style={{ color: '#9E9E9E' }}>Cargando...</p>
    </div>
  )

  const subtotal = (orden?.items || []).reduce((s, i) => s + i.precio * i.cantidad, 0)
  const montoDescuento = subtotal * ((orden?.descuento || 0) / 100)
  const montoCargo = (subtotal - montoDescuento) * ((orden?.cargoServicio || 0) / 100)
  const total = subtotal - montoDescuento + montoCargo
  const cambio = parseFloat(efectivo) - total
  const categorias = [...new Set(productos.map(p => p.categoria))]

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F7F5F0' }}>

      {/* Panel izquierdo */}
      <div style={{ width: 340, background: '#fff', borderRight: '0.5px solid #E0E0E0', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #E0E0E0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onVolver}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#757575' }}>←</button>
            <div>
              <div style={{ fontWeight: 500, fontSize: 16 }}>
                {mesa === 'llevar' ? `🥡 Para llevar — ${orden?.cliente}` : `${mesa?.zona === 'barra' ? '🍺 Silla' : '🪑 Mesa'} ${mesa?.numero}`}
              </div>
              <div style={{ fontSize: 12, color: '#9E9E9E' }}>
                {mesa === 'llevar' ? 'Sin cargo de servicio' : mesa?.zona === 'salon' ? `+${orden?.cargoServicio || 0}% cargo de servicio` : 'Sin cargo de servicio'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {(!orden?.items || orden.items.length === 0) ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
              <p style={{ color: '#BDBDBD', fontSize: 13 }}>Sin productos aún</p>
              <p style={{ color: '#BDBDBD', fontSize: 12 }}>Agrega productos desde el menú</p>
            </div>
          ) : (
            orden.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #F5F5F5' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.producto.nombre}</div>
                  <div style={{ fontSize: 12, color: '#9E9E9E' }}>x{item.cantidad} · ${item.precio} c/u</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>${item.precio * item.cantidad}</span>
                  <button onClick={() => quitarItem(item.id)}
                    style={{ background: '#FFEBEE', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', color: '#F44336', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: 16, borderTop: '0.5px solid #E0E0E0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#757575', marginBottom: 6 }}>
            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
          </div>
          {orden?.descuento > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4CAF50', marginBottom: 6 }}>
              <span>Descuento {orden.descuento}%</span><span>-${montoDescuento.toFixed(2)}</span>
            </div>
          )}
          {orden?.cargoServicio > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1565C0', marginBottom: 6 }}>
              <span>Cargo servicio {orden.cargoServicio}%</span><span>+${montoCargo.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 500, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #E0E0E0' }}>
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input type="number" placeholder="Descuento %" value={descuento} onChange={e => setDescuento(e.target.value)} min="0" max="100"
              style={{ flex: 1, border: '1px solid #E0E0E0', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' }} />
            <button onClick={aplicarDesc}
              style={{ background: '#E8F5E9', color: '#2E7D32', border: '1px solid #4CAF50', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
              Aplicar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <button onClick={cancelar}
              style={{ background: '#FFEBEE', color: '#C62828', border: '1px solid #F44336', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Cancelar orden
            </button>
            <button onClick={() => setVista('cobrar')}
              style={{ background: '#1976D2', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Cobrar ${total.toFixed(2)}
            </button>
          </div>
          <button onClick={() => setVista('dividir')}
            style={{ width: '100%', marginTop: 8, background: '#F3E5F5', color: '#6A1B9A', border: '1px solid #9C27B0', borderRadius: 8, padding: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            ÷ Dividir cuenta
          </button>
        </div>
      </div>

      {/* Panel derecho */}
      {vista === 'orden' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: '#424242' }}>Menú</h2>
          {categorias.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#9E9E9E', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{cat}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {productos.filter(p => p.categoria === cat).map(producto => (
                  <button key={producto.id} onClick={() => agregarProducto(producto)}
                    style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 10, padding: '12px 10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.border = '1px solid #1976D2'; e.currentTarget.style.background = '#E3F2FD' }}
                    onMouseLeave={e => { e.currentTarget.style.border = '1px solid #E0E0E0'; e.currentTarget.style.background = '#fff' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{producto.nombre}</div>
                    <div style={{ fontSize: 13, color: '#1976D2', fontWeight: 500 }}>${producto.precio}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

      ) : vista === 'dividir' ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Dividir cuenta</h2>
            <p style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 24 }}>Total: <strong>${total.toFixed(2)}</strong></p>

            <label style={{ fontSize: 12, color: '#9E9E9E' }}>¿Entre cuántas personas?</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, marginBottom: 24 }}>
              <button onClick={() => setPersonas(p => Math.max(2, p - 1))}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E0E0E0', background: '#F5F5F5', cursor: 'pointer', fontSize: 20 }}>−</button>
              <span style={{ fontSize: 28, fontWeight: 500, minWidth: 40, textAlign: 'center' }}>{personas}</span>
              <button onClick={() => setPersonas(p => p + 1)}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E0E0E0', background: '#F5F5F5', cursor: 'pointer', fontSize: 20 }}>+</button>
            </div>

            <div style={{ background: '#E8F5E9', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#388E3C', marginBottom: 4 }}>Cada persona paga</div>
              <div style={{ fontSize: 36, fontWeight: 500, color: '#2E7D32' }}>${(total / personas).toFixed(2)}</div>
              <div style={{ fontSize: 12, color: '#66BB6A', marginTop: 4 }}>{personas} personas · total ${total.toFixed(2)}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setVista('orden')}
                style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 13 }}>
                ← Volver
              </button>
              <button onClick={() => setVista('cobrar')}
                style={{ background: '#1976D2', color: '#fff', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Ir a cobrar
              </button>
            </div>
          </div>
        </div>

      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Método de pago</h2>
            <p style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 20 }}>Total a cobrar: <strong>${total.toFixed(2)}</strong></p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[['efectivo','💵','Efectivo'],['tarjeta','💳','Tarjeta'],['transferencia','📲','Transferencia'],['fiado','📋','Fiado']].map(([id,emoji,label]) => (
                <button key={id} onClick={() => setMetodoPago(id)}
                  style={{ background: metodoPago===id ? '#E3F2FD' : '#F5F5F5', border: `1.5px solid ${metodoPago===id ? '#1976D2' : '#E0E0E0'}`, borderRadius: 10, padding: '12px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
                  <div style={{ fontSize: 13, color: metodoPago===id ? '#1565C0' : '#616161', fontWeight: metodoPago===id ? 500 : 400 }}>{label}</div>
                </button>
              ))}
            </div>

            {metodoPago === 'efectivo' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#9E9E9E' }}>Efectivo recibido</label>
                <input type="number" value={efectivo} onChange={e => setEfectivo(e.target.value)} placeholder="0.00"
                  style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 14px', fontSize: 18, fontWeight: 500, outline: 'none', boxSizing: 'border-box' }} />
                {cambio >= 0 && efectivo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: 12, background: '#E8F5E9', borderRadius: 8 }}>
                    <span style={{ color: '#2E7D32', fontWeight: 500 }}>Cambio</span>
                    <span style={{ color: '#2E7D32', fontWeight: 500, fontSize: 18 }}>${cambio.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {metodoPago === 'fiado' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#9E9E9E' }}>Cliente</label>
                <select value={clienteId || ''} onChange={e => setClienteId(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 6, border: '1px solid #E0E0E0', borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  <option value=''>Selecciona un cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => setVista('orden')}
                style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 13 }}>
                ← Volver
              </button>
              <button onClick={cobrar}
                style={{ background: metodoPago ? '#1976D2' : '#BDBDBD', color: '#fff', border: 'none', borderRadius: 8, padding: 12, cursor: metodoPago ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}