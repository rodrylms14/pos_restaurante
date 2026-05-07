import { useEffect, useState } from 'react'
import { getMesas, getOrdenes, crearOrden, getConfiguracion } from '../services/api'

const COLORES = {
  libre:    { bg: '#E8F5E9', border: '#4CAF50', texto: '#2E7D32', label: 'Libre' },
  ocupada:  { bg: '#FFEBEE', border: '#F44336', texto: '#C62828', label: 'Ocupada' },
  cuenta:   { bg: '#FFF3E0', border: '#FF9800', texto: '#E65100', label: 'Cuenta' },
}

export default function Sala({ onAbrirOrden }) {
  const [mesas, setMesas] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [config, setConfig] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const [resMesas, resOrdenes, resConfig] = await Promise.all([
      getMesas(),
      getOrdenes(),
      getConfiguracion()
    ])
    setMesas(resMesas.data)
    setOrdenes(resOrdenes.data)
    setConfig(resConfig.data)
  }

  const getOrdenDeMesa = (mesaId) => {
    return ordenes.find(o => o.mesaId === mesaId)
  }

  const tocarMesa = async (mesa) => {
    const orden = getOrdenDeMesa(mesa.id)
    if (orden) {
      // Mesa ocupada → abrir orden existente
      onAbrirOrden(orden, mesa)
    } else {
      // Mesa libre → crear orden nueva
      try {
        const zona = mesa.zona
        const res = await crearOrden({ tipo: 'mesa', mesaId: mesa.id, zona })
        cargarDatos()
        onAbrirOrden(res.data, mesa)
      } catch (error) {
        console.error('Error al abrir mesa', error)
      }
    }
  }

  const tocarVentanilla = async () => {
    try {
      const nombre = prompt('Nombre del cliente (para llevar):')
      if (!nombre) return
      const res = await crearOrden({ tipo: 'llevar', zona: 'barra', cliente: nombre })
      onAbrirOrden(res.data, null)
    } catch (error) {
      console.error('Error al crear orden para llevar', error)
    }
  }

  const mesasSalon = mesas.filter(m => m.zona === 'salon')
  const mesasBarra = mesas.filter(m => m.zona === 'barra')

  return (
    <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#212121' }}>
          🍽️ {config?.nombreNegocio || 'Mi Restaurante'}
        </h1>
        <div style={{ display: 'flex', gap: 16 }}>
          {Object.entries(COLORES).map(([estado, c]) => (
            <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.border }} />
              <span style={{ fontSize: 13, color: '#616161' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Salón */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px #0001' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🪑</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1565C0' }}>Salón</h2>
          <span style={{ fontSize: 12, color: '#90CAF9', background: '#E3F2FD', padding: '2px 10px', borderRadius: 20 }}>+{config?.cargoServicio || 10}% servicio</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {mesasSalon.map(mesa => {
            const orden = getOrdenDeMesa(mesa.id)
            const estado = orden?.estado === 'abierta' ? (orden?.total > 0 ? 'ocupada' : 'ocupada') : 'libre'
            const c = COLORES[estado]
            return (
              <button key={mesa.id} onClick={() => tocarMesa(mesa)}
                style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 12, padding: '16px 8px', cursor: 'pointer', textAlign: 'center', transition: 'transform .1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>🪑</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: c.texto }}>Mesa {mesa.numero}</div>
                <div style={{ fontSize: 11, color: c.texto, marginTop: 2 }}>{c.label}</div>
                {orden && <div style={{ fontSize: 13, fontWeight: 700, color: c.texto, marginTop: 4 }}>${orden.total}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px #0001' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🍺</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E65100' }}>Barra</h2>
          <span style={{ fontSize: 12, color: '#FFCC80', background: '#FFF3E0', padding: '2px 10px', borderRadius: 20 }}>Sin cargo de servicio</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {mesasBarra.map(mesa => {
            const orden = getOrdenDeMesa(mesa.id)
            const estado = orden ? 'ocupada' : 'libre'
            const c = COLORES[estado]
            return (
              <button key={mesa.id} onClick={() => tocarMesa(mesa)}
                style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', textAlign: 'center', minWidth: 80, transition: 'transform .1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>🍺</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: c.texto }}>Silla {mesa.numero}</div>
                <div style={{ fontSize: 11, color: c.texto }}>{c.label}</div>
                {orden && <div style={{ fontSize: 12, fontWeight: 700, color: c.texto, marginTop: 2 }}>${orden.total}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ventanilla para llevar */}
      <button onClick={tocarVentanilla}
        style={{ width: '100%', background: '#F3E5F5', border: '2px dashed #9C27B0', borderRadius: 16, padding: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'transform .1s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        <span style={{ fontSize: 28 }}>🥡</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#6A1B9A' }}>Ventanilla — Para Llevar</div>
          <div style={{ fontSize: 13, color: '#AB47BC' }}>Toca para crear una nueva orden</div>
        </div>
      </button>

    </div>
  )
}