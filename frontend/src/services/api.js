import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// Mesas
export const getMesas = () => api.get('/mesas')
export const actualizarMesa = (id, data) => api.put(`/mesas/${id}`, data)
export const crearMesa = (data) => api.post('/mesas', data)
export const eliminarMesa = (id) => api.delete(`/mesas/${id}`)
export const guardarPosiciones = (mesas) => api.put('/mesas/posiciones/guardar', { mesas })

// Productos
export const getProductos = () => api.get('/productos')
export const crearProducto = (data) => api.post('/productos', data)
export const actualizarProducto = (id, data) => api.put(`/productos/${id}`, data)
export const eliminarProducto = (id) => api.delete(`/productos/${id}`)

// Ordenes
export const getOrdenes = () => api.get('/ordenes')
export const crearOrden = (data) => api.post('/ordenes', data)
export const agregarItem = (ordenId, data) => api.post(`/ordenes/${ordenId}/items`, data)
export const eliminarItem = (ordenId, itemId) => api.delete(`/ordenes/${ordenId}/items/${itemId}`)
export const aplicarDescuento = (ordenId, descuento) => api.put(`/ordenes/${ordenId}/descuento`, { descuento })
export const cerrarOrden = (ordenId, data) => api.put(`/ordenes/${ordenId}/cerrar`, data)
export const cancelarOrden = (ordenId) => api.put(`/ordenes/${ordenId}/cancelar`)

// Clientes
export const getClientes = () => api.get('/clientes')
export const crearCliente = (data) => api.post('/clientes', data)
export const getFiados = () => api.get('/clientes/fiados')
export const saldarDeuda = (id) => api.put(`/clientes/${id}/saldar`)
export const eliminarCliente = (id) => api.delete(`/clientes/${id}`)

// Configuracion
export const getConfiguracion = () => api.get('/configuracion')
export const actualizarConfiguracion = (data) => api.put('/configuracion', data)

// Reportes
export const getReporteHoy = () => api.get('/reportes/hoy')
export const getReporteRango = (desde, hasta) => api.get(`/reportes/rango?desde=${desde}&hasta=${hasta}`)