import { useState, useEffect } from 'react'
import { getProductos, agregarItem, eliminarItem, cerrarOrden, cancelarOrden, getOrdenes, crearOrden, aplicarDescuento, getClientes, pagarItems, getOrden } from '../services/api'

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
  const [seleccionados, setSeleccionados] = useState([])
  const [modoDividir, setModoDividir] = useState(null)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [ordenCerrada, setOrdenCerrada] = useState(null)

  useEffect(() => { inicializar() }, [mesa])

  const inicializar = async () => {
    setCargando(true)
    try {
      const [resOrdenes, resProductos, resClientes] = await Promise.all([
        getOrdenes(), getProductos(), getClientes()
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
        if (ordenExistente) setOrden(ordenExistente)
      }
    } catch (e) { console.error(e) }
    setCargando(false)
  }

  const recargarOrden = async () => {
    const res = await getOrdenes()
    const actualizada = res.data.find(o => o.id === orden.id)
    if (actualizada) setOrden(actualizada)
  }

  const agregarProducto = (producto) => {
    setProductoSeleccionado(producto)
    setCantidad(1)
  }

  const confirmarAgregarProducto = async () => {
    try {
      let ordenActual = orden
      if (!ordenActual) {
        const res = await crearOrden({ tipo: 'mesa', mesaId: mesa.id, zona: mesa.zona })
        ordenActual = res.data
        setOrden(ordenActual)
      }
      await agregarItem(ordenActual.id, { productoId: productoSeleccionado.id, cantidad })
      const resOrdenes = await getOrdenes()
      const actualizada = resOrdenes.data.find(o => o.id === ordenActual.id)
      if (actualizada) setOrden(actualizada)
      setProductoSeleccionado(null)
      setCantidad(1)
    } catch (e) { console.error(e) }
  }

  const quitarItem = async (itemId) => {
    try {
      const res = await eliminarItem(orden.id, itemId)
      if (res.data.mesaLiberada) {
        onVolver()
      } else {
        await recargarOrden()
      }
    } catch (e) { console.error(e) }
  }

  const aplicarDesc = async () => {
    try {
      await aplicarDescuento(orden.id, descuento)
      await recargarOrden()
    } catch (e) { console.error(e) }
  }

  const cobrar = async () => {
    if (!metodoPago) return alert('Selecciona un método de pago')
    if (metodoPago === 'fiado' && !clienteId) return alert('Selecciona el cliente')
    if (!orden) return alert('No hay productos en la orden')
    try {
      await cerrarOrden(orden.id, { metodoPago, clienteId })
      const resDetalle = await getOrden(orden.id)
      setOrdenCerrada(resDetalle.data)
      setVista('exito')
    } catch (e) { console.error(e) }
  }

  const cobrarPorConsumo = async () => {
    if (!metodoPago) return alert('Selecciona un método de pago')
    if (seleccionados.length === 0) return alert('Selecciona al menos un producto')
    try {
      const res = await pagarItems(orden.id, { itemIds: seleccionados, metodoPago })
      if (res.data.cerrada) {
        const resDetalle = await getOrden(orden.id)
        setOrdenCerrada(resDetalle.data)
        setVista('exito')
      } else {
        await recargarOrden()
        setSeleccionados([])
        setMetodoPago(null)
        setEfectivo('')
        setVista('dividir')
        alert(`Pago registrado. Quedan ${res.data.pendientes} producto(s) por pagar.`)
      }
    } catch (e) { console.error(e) }
  }

  const cancelar = async () => {
    if (!window.confirm('Cancelar esta orden?')) return
    try {
      if (orden) await cancelarOrden(orden.id)
      onVolver()
    } catch (e) { console.error(e) }
  }

  const toggleSeleccion = (itemId) => {
    setSeleccionados(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  const abrirDividir = (modo) => {
    setModoDividir(modo)
    setSeleccionados([])
    setPersonas(2)
    setMetodoPago(null)
    setEfectivo('')
    setVista('dividir')
  }

  const imprimirTicket = () => window.print()

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F5F0' }}>
      <p style={{ color: '#9E9E9E' }}>Cargando...</p>
    </div>
  )

  // ── PANTALLA DE EXITO ─────────────────────────────────────────
  if (vista === 'exito' && ordenCerrada) {
    const itemsTotales = ordenCerrada.items || []
    const subtotalTicket = itemsTotales.reduce((s, i) => s + i.precio * i.cantidad, 0)
    const cargoTicket = subtotalTicket * ((ordenCerrada.cargoServicio || 0) / 100)
    const descuentoTicket = subtotalTicket * ((ordenCerrada.descuento || 0) / 100)
    const totalTicket = subtotalTicket + cargoTicket - descuentoTicket
    const metodosLabel = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', fiado: 'Fiado' }
    const fecha = new Date()
    const fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

    return (
      <div style={{ display: 'flex', height: '100vh', background: '#F7F5F0', alignItems: 'center', justifyContent: 'center' }}>

        {/* CSS de impresion — solo muestra el ticket, sin fondo ni colores */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #ticket, #ticket * { visibility: visible; }
            #ticket {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 8mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11pt;
              color: #000;
              background: #fff;
            }
            .no-print { display: none !important; }
          }
        `}</style>

        <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', textAlign: 'center' }}>

          {/* Confirmacion visual */}
          <div style={{ width: 56, height: 56, background: '#E8F5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26, color: '#2E7D32', fontWeight: 700 }}>✓</div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#2E7D32', marginBottom: 4 }}>Cobro registrado</h2>
          <p style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 24 }}>
            {ordenCerrada.tipo === 'llevar'
              ? `Para llevar — ${ordenCerrada.cliente}`
              : `${ordenCerrada.mesa?.zona === 'barra' ? 'Barra' : 'Salon'} — Mesa ${ordenCerrada.mesa?.numero}`}
          </p>

          {/* Ticket */}
          <div id="ticket" style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 10, padding: '20px 20px', textAlign: 'left', marginBottom: 20, fontFamily: "'Courier New', Courier, monospace" }}>

            {/* Encabezado */}
            <div style={{ textAlign: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '1px dashed #BDBDBD' }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Mi Restaurante</div>
              <div style={{ fontSize: 11, color: '#616161', marginTop: 4 }}>{fechaStr} &nbsp; {horaStr}</div>
              <div style={{ fontSize: 11, color: '#616161', marginTop: 2 }}>
                {ordenCerrada.tipo === 'llevar'
                  ? `Para llevar: ${ordenCerrada.cliente}`
                  : `${ordenCerrada.mesa?.zona === 'barra' ? 'Barra' : 'Salon'} - Mesa ${ordenCerrada.mesa?.numero}`}
              </div>
            </div>

            {/* Cabecera de columnas */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              <span style={{ flex: 1 }}>Descripcion</span>
              <span style={{ width: 30, textAlign: 'center' }}>Cant</span>
              <span style={{ width: 70, textAlign: 'right' }}>Total</span>
            </div>

            {/* Productos */}
            <div style={{ marginBottom: 12 }}>
              {itemsTotales.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ flex: 1, color: '#212121' }}>{item.producto.nombre}</span>
                  <span style={{ width: 30, textAlign: 'center', color: '#757575' }}>{item.cantidad}</span>
                  <span style={{ width: 70, textAlign: 'right', color: '#212121' }}>${(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div style={{ borderTop: '1px dashed #BDBDBD', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#616161', marginBottom: 4 }}>
                <span>Subtotal</span><span>${subtotalTicket.toFixed(2)}</span>
              </div>
              {ordenCerrada.descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#616161', marginBottom: 4 }}>
                  <span>Descuento {ordenCerrada.descuento}%</span>
                  <span>- ${descuentoTicket.toFixed(2)}</span>
                </div>
              )}
              {ordenCerrada.cargoServicio > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#616161', marginBottom: 4 }}>
                  <span>Cargo servicio {ordenCerrada.cargoServicio}%</span>
                  <span>+ ${cargoTicket.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginTop: 10, paddingTop: 10, borderTop: '1px dashed #BDBDBD' }}>
                <span>TOTAL</span><span>${totalTicket.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#757575', marginTop: 8 }}>
                Forma de pago: {metodosLabel[ordenCerrada.metodoPago] || ordenCerrada.metodoPago}
              </div>
            </div>

            {/* Pie */}
            <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #BDBDBD', fontSize: 11, color: '#9E9E9E', letterSpacing: 1 }}>
              GRACIAS POR SU VISITA
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="no-print">
            <button onClick={imprimirTicket}
              style={{ background: '#F5F5F5', color: '#424242', border: '1px solid #E0E0E0', borderRadius: 10, padding: 12, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Imprimir ticket
            </button>
            <button onClick={onVolver}
              style={{ background: '#1976D2', color: '#fff', border: 'none', borderRadius: 10, padding: 12, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Volver al plano
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CALCULO DE TOTALES ────────────────────────────────────────
  const itemsPendientes = (orden?.items || []).filter(i => !i.pagado)
  const itemsPagados = (orden?.items || []).filter(i => i.pagado)
  const subtotal = itemsPendientes.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const montoDescuento = subtotal * ((orden?.descuento || 0) / 100)
  const montoCargo = (subtotal - montoDescuento) * ((orden?.cargoServicio || 0) / 100)
  const total = subtotal - montoDescuento + montoCargo
  const cambio = parseFloat(efectivo) - total
  const categorias = [...new Set(productos.map(p => p.categoria))]
  const subtotalSeleccionado = itemsPendientes
    .filter(i => seleccionados.includes(i.id))
    .reduce((s, i) => s + i.precio * i.cantidad, 0)
  const totalSeleccionado = subtotalSeleccionado + (subtotalSeleccionado * ((orden?.cargoServicio || 0) / 100))

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F7F5F0' }}>

      {/* Panel izquierdo */}
      <div style={{ width: 340, background: '#fff', borderRight: '0.5px solid #E0E0E0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #E0E0E0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onVolver} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#757575' }}>←</button>
            <div>
              <div style={{ fontWeight: 500, fontSize: 16 }}>
                {mesa === 'llevar' ? `Para llevar — ${orden?.cliente}` : `${mesa?.zona === 'barra' ? 'Barra' : 'Mesa'} ${mesa?.numero}`}
              </div>
              <div style={{ fontSize: 12, color: '#9E9E9E' }}>
                {mesa === 'llevar' ? 'Sin cargo de servicio' : mesa?.zona === 'salon' ? '+10% cargo de servicio' : 'Sin cargo de servicio'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {itemsPendientes.length === 0 && itemsPagados.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
              <p style={{ color: '#BDBDBD', fontSize: 13 }}>Sin productos aún</p>
              <p style={{ color: '#BDBDBD', fontSize: 12 }}>Agrega productos desde el menú →</p>
            </div>
          ) : (
            <>
              {itemsPendientes.map(item => (
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
              ))}
              {itemsPagados.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#9E9E9E', letterSpacing: 1, marginBottom: 6 }}>YA PAGADOS</div>
                  {itemsPagados.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', opacity: 0.5 }}>
                      <div style={{ fontSize: 13, textDecoration: 'line-through', color: '#9E9E9E' }}>{item.producto.nombre} x{item.cantidad}</div>
                      <span style={{ fontSize: 13, color: '#9E9E9E' }}>${item.precio * item.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
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
              Cancelar
            </button>
            <button onClick={() => setVista('cobrar')} disabled={!orden || itemsPendientes.length === 0}
              style={{ background: orden && itemsPendientes.length > 0 ? '#1976D2' : '#BDBDBD', color: '#fff', border: 'none', borderRadius: 8, padding: 10, cursor: orden && itemsPendientes.length > 0 ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>
              Cobrar ${total.toFixed(2)}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <button onClick={() => abrirDividir('iguales')} disabled={!orden || itemsPendientes.length === 0}
              style={{ background: orden && itemsPendientes.length > 0 ? '#F3E5F5' : '#F5F5F5', color: orden && itemsPendientes.length > 0 ? '#6A1B9A' : '#BDBDBD', border: `1px solid ${orden && itemsPendientes.length > 0 ? '#9C27B0' : '#E0E0E0'}`, borderRadius: 8, padding: 10, cursor: orden && itemsPendientes.length > 0 ? 'pointer' : 'default', fontSize: 12, fontWeight: 500 }}>
              Partes iguales
            </button>
            <button onClick={() => abrirDividir('consumo')} disabled={!orden || itemsPendientes.length === 0}
              style={{ background: orden && itemsPendientes.length > 0 ? '#E8EAF6' : '#F5F5F5', color: orden && itemsPendientes.length > 0 ? '#283593' : '#BDBDBD', border: `1px solid ${orden && itemsPendientes.length > 0 ? '#5C6BC0' : '#E0E0E0'}`, borderRadius: 8, padding: 10, cursor: orden && itemsPendientes.length > 0 ? 'pointer' : 'default', fontSize: 12, fontWeight: 500 }}>
              Por consumo
            </button>
          </div>
        </div>
      </div>

      {/* Panel derecho — menu */}
      {vista === 'orden' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: '#424242' }}>Menu</h2>
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
      )}

      {/* Panel derecho — dividir */}
      {vista === 'dividir' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 500 }}>
                {modoDividir === 'iguales' ? 'Partes iguales' : 'Por consumo'}
              </h2>
              <p style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>
                {modoDividir === 'iguales' ? 'Elige cuantas personas dividen la cuenta' : 'Toca los productos que consumiste'}
              </p>
            </div>
            <button onClick={() => setVista('orden')}
              style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
              Volver
            </button>
          </div>

          {modoDividir === 'iguales' && (
            <div style={{ maxWidth: 360 }}>
              <label style={{ fontSize: 12, color: '#9E9E9E' }}>Entre cuantas personas?</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, marginBottom: 24 }}>
                <button onClick={() => setPersonas(p => Math.max(2, p - 1))}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #E0E0E0', background: '#F5F5F5', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 32, fontWeight: 500, minWidth: 40, textAlign: 'center' }}>{personas}</span>
                <button onClick={() => setPersonas(p => p + 1)}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #E0E0E0', background: '#F5F5F5', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
              <div style={{ background: '#E8F5E9', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#388E3C', marginBottom: 4 }}>Cada persona paga</div>
                <div style={{ fontSize: 40, fontWeight: 500, color: '#2E7D32' }}>${(total / personas).toFixed(2)}</div>
                <div style={{ fontSize: 12, color: '#66BB6A', marginTop: 4 }}>{personas} personas — total ${total.toFixed(2)}</div>
              </div>
              <button onClick={() => setVista('cobrar')}
                style={{ width: '100%', background: '#1976D2', color: '#fff', border: 'none', borderRadius: 10, padding: 14, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                Ir a cobrar
              </button>
            </div>
          )}

          {modoDividir === 'consumo' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
                {itemsPendientes.map(item => {
                  const sel = seleccionados.includes(item.id)
                  return (
                    <button key={item.id} onClick={() => toggleSeleccion(item.id)}
                      style={{ background: sel ? '#E3F2FD' : '#fff', border: `2px solid ${sel ? '#1976D2' : '#E0E0E0'}`, borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: sel ? '#1565C0' : '#424242' }}>{item.producto.nombre}</span>
                        {sel && <span style={{ color: '#1976D2', fontSize: 16 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#9E9E9E' }}>x{item.cantidad}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: sel ? '#1976D2' : '#424242', marginTop: 4 }}>${item.precio * item.cantidad}</div>
                    </button>
                  )
                })}
              </div>

              {seleccionados.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 360 }}>
                  <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 4 }}>Tu total</div>
                  <div style={{ fontSize: 36, fontWeight: 500, color: '#1976D2', marginBottom: 16 }}>${totalSeleccionado.toFixed(2)}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                    {[['efectivo','💵'],['tarjeta','💳'],['transferencia','📲'],['fiado','📋']].map(([id, emoji]) => (
                      <button key={id} onClick={() => setMetodoPago(id)}
                        style={{ background: metodoPago===id ? '#E3F2FD' : '#F5F5F5', border: `1.5px solid ${metodoPago===id ? '#1976D2' : '#E0E0E0'}`, borderRadius: 8, padding: '8px 4px', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: 20 }}>{emoji}</div>
                        <div style={{ fontSize: 10, color: metodoPago===id ? '#1565C0' : '#9E9E9E', marginTop: 2, textTransform: 'capitalize' }}>{id}</div>
                      </button>
                    ))}
                  </div>
                  {metodoPago === 'efectivo' && (
                    <div style={{ marginBottom: 12 }}>
                      <input type="number" value={efectivo} onChange={e => setEfectivo(e.target.value)} placeholder="Efectivo recibido"
                        style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 12px', fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
                      {parseFloat(efectivo) >= totalSeleccionado && efectivo && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: 10, background: '#E8F5E9', borderRadius: 8 }}>
                          <span style={{ color: '#2E7D32', fontSize: 13 }}>Cambio</span>
                          <span style={{ color: '#2E7D32', fontWeight: 500 }}>${(parseFloat(efectivo) - totalSeleccionado).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={cobrarPorConsumo}
                    style={{ width: '100%', background: metodoPago ? '#1976D2' : '#BDBDBD', color: '#fff', border: 'none', borderRadius: 10, padding: 14, cursor: metodoPago ? 'pointer' : 'default', fontSize: 14, fontWeight: 500 }}>
                    Cobrar mi parte — ${totalSeleccionado.toFixed(2)}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Panel derecho — cobrar */}
      {vista === 'cobrar' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Metodo de pago</h2>
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
                Volver
              </button>
              <button onClick={cobrar}
                style={{ background: metodoPago ? '#1976D2' : '#BDBDBD', color: '#fff', border: 'none', borderRadius: 8, padding: 12, cursor: metodoPago ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal selector de cantidad */}
      {productoSeleccionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{productoSeleccionado.nombre}</div>
            <div style={{ fontSize: 13, color: '#9E9E9E', marginBottom: 24 }}>${productoSeleccionado.precio} c/u</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
              <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #E0E0E0', background: '#F5F5F5', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: 36, fontWeight: 500, minWidth: 48, textAlign: 'center' }}>{cantidad}</span>
              <button onClick={() => setCantidad(c => c + 1)}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #E0E0E0', background: '#F5F5F5', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '0.5px solid #F5F5F5', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#9E9E9E' }}>Subtotal</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>${(productoSeleccionado.precio * cantidad).toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => { setProductoSeleccionado(null); setCantidad(1) }}
                style={{ background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 10, padding: 12, cursor: 'pointer', fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmarAgregarProducto}
                style={{ background: '#1976D2', color: '#fff', border: 'none', borderRadius: 10, padding: 12, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Agregar {cantidad}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}