import { useEffect, useState, useRef } from 'react'
import { getMesas, guardarPosiciones, crearMesa, eliminarMesa } from '../services/api'

const COLORES = {
  libre:   { bg: '#E8F5E9', border: '#4CAF50', texto: '#2E7D32' },
  ocupada: { bg: '#FFEBEE', border: '#F44336', texto: '#C62828' },
  cuenta:  { bg: '#FFF3E0', border: '#FF9800', texto: '#E65100' },
}

const MESA_W = 80
const MESA_H = 70

export default function Plano({ onAbrirOrden, modoEdicion = false }) {
  const [mesas, setMesas] = useState([])
  const [editando, setEditando] = useState(modoEdicion)
  const [dragging, setDragging] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [guardando, setGuardando] = useState(false)
  const planoRef = useRef(null)

  useEffect(() => {
    cargarMesas()
  }, [])

  const cargarMesas = async () => {
    const res = await getMesas()
    const mesas = res.data.map(m => ({
      ...m,
      posX: m.posX || 20,
      posY: m.posY || 20,
    }))
    setMesas(mesas)
  }

  const onMouseDown = (e, mesa) => {
    if (!editando) return
    e.preventDefault()
    const rect = planoRef.current.getBoundingClientRect()
    setDragging(mesa.id)
    setOffset({
      x: e.clientX - rect.left - mesa.posX,
      y: e.clientY - rect.top - mesa.posY,
    })
  }

  const onMouseMove = (e) => {
    if (!dragging || !editando) return
    const rect = planoRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left - offset.x, rect.width - MESA_W))
    const y = Math.max(0, Math.min(e.clientY - rect.top - offset.y, rect.height - MESA_H))
    setMesas(prev => prev.map(m => m.id === dragging ? { ...m, posX: x, posY: y } : m))
  }

  const onMouseUp = () => setDragging(null)

  const guardar = async () => {
    setGuardando(true)
    try {
      await guardarPosiciones(mesas.map(m => ({ id: m.id, posX: m.posX, posY: m.posY, zona: m.zona })))
      setEditando(false)
    } catch (e) {
      console.error(e)
    }
    setGuardando(false)
  }

  const cambiarZona = (id) => {
    setMesas(prev => prev.map(m => m.id === id ? { ...m, zona: m.zona === 'salon' ? 'barra' : 'salon' } : m))
  }

  const agregarMesa = async () => {
    const numeros = mesas.map(m => m.numero)
    const siguiente = Math.max(...numeros, 0) + 1
    const res = await crearMesa({ numero: siguiente, zona: 'salon', posX: 20, posY: 20 })
    setMesas(prev => [...prev, { ...res.data, posX: 20, posY: 20 }])
  }

  const borrarMesa = async (id) => {
    if (!window.confirm('¿Eliminar esta mesa?')) return
    await eliminarMesa(id)
    setMesas(prev => prev.filter(m => m.id !== id))
  }

  const tocarMesa = (mesa) => {
    if (editando) return
    if (onAbrirOrden) onAbrirOrden(mesa)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F7F5F0' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#fff', borderBottom: '0.5px solid #E0E0E0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🍽️</span>
          <span style={{ fontWeight: 500, fontSize: 16 }}>Plano del restaurante</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Leyenda */}
          {!editando && ['libre', 'ocupada', 'cuenta'].map(e => (
            <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORES[e].border }} />
              <span style={{ fontSize: 12, color: '#757575', textTransform: 'capitalize' }}>{e}</span>
            </div>
          ))}
          {editando && (
            <button onClick={agregarMesa}
              style={{ background: '#E3F2FD', color: '#1565C0', border: '1px solid #90CAF9', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
              + Agregar mesa
            </button>
          )}
          {editando ? (
            <button onClick={guardar} disabled={guardando}
              style={{ background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              {guardando ? 'Guardando...' : '✓ Guardar plano'}
            </button>
          ) : (
            <button onClick={() => setEditando(true)}
              style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 13, color: '#424242' }}>
              ✏️ Editar plano
            </button>
          )}
          {editando && (
            <button onClick={() => { cargarMesas(); setEditando(false) }}
              style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#757575' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {editando && (
        <div style={{ background: '#FFF8E1', padding: '8px 20px', fontSize: 12, color: '#F57F17', borderBottom: '1px solid #FFE082' }}>
          ✏️ Modo edición — arrastra las mesas, cambia su zona y agrega o elimina. Presiona <strong>Guardar plano</strong> cuando termines.
        </div>
      )}

      {/* Plano */}
      <div ref={planoRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: editando ? 'default' : 'default' }}>

        {/* Fondo con textura de piso */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <pattern id="piso" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#F7F5F0"/>
              <rect width="39" height="39" fill="none" stroke="#EEEBE4" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#piso)"/>
        </svg>

        {/* Etiqueta de zona barra si hay mesas de barra */}
        {mesas.some(m => m.zona === 'barra') && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#E65100' }}>
            🍺 Zona Barra
          </div>
        )}
        {mesas.some(m => m.zona === 'salon') && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: '#E3F2FD', border: '1px solid #90CAF9', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#1565C0' }}>
            🪑 Zona Salón
          </div>
        )}

        {/* Mesas */}
        {mesas.map(mesa => {
          const c = COLORES[mesa.estado] || COLORES.libre
          const esBarra = mesa.zona === 'barra'
          return (
            <div key={mesa.id}
              onMouseDown={(e) => onMouseDown(e, mesa)}
              onClick={() => tocarMesa(mesa)}
              style={{
                position: 'absolute',
                left: mesa.posX,
                top: mesa.posY,
                width: MESA_W,
                height: MESA_H,
                background: editando ? '#fff' : c.bg,
                border: `2px solid ${editando ? '#BDBDBD' : c.border}`,
                borderRadius: esBarra ? 8 : 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: editando ? 'grab' : 'pointer',
                userSelect: 'none',
                boxShadow: dragging === mesa.id ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
                transform: dragging === mesa.id ? 'scale(1.05)' : 'scale(1)',
                transition: dragging === mesa.id ? 'none' : 'box-shadow 0.15s, transform 0.15s',
                zIndex: dragging === mesa.id ? 10 : 1,
              }}>

              {/* Sillas decorativas alrededor */}
              {!esBarra && !editando && (
                <>
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 10 }}>🪑</div>
                  <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 10 }}>🪑</div>
                  <div style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 10 }}>🪑</div>
                  <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', fontSize: 10 }}>🪑</div>
                </>
              )}

              <span style={{ fontSize: esBarra ? 16 : 20 }}>{esBarra ? '🍺' : '🍽️'}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: editando ? '#424242' : c.texto, marginTop: 2 }}>
                {esBarra ? `Silla ${mesa.numero}` : `Mesa ${mesa.numero}`}
              </span>
              {!editando && mesa.estado !== 'libre' && (
                <span style={{ fontSize: 11, color: c.texto, fontWeight: 500 }}>${mesa.total || 0}</span>
              )}
              {editando && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); cambiarZona(mesa.id) }}
                    style={{ fontSize: 9, background: esBarra ? '#FFF3E0' : '#E3F2FD', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: esBarra ? '#E65100' : '#1565C0' }}>
                    {esBarra ? 'Barra' : 'Salón'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); borrarMesa(mesa.id) }}
                    style={{ fontSize: 9, background: '#FFEBEE', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: '#C62828' }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Ventanilla para llevar fija abajo */}
        {!editando && (
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: '#F3E5F5', border: '2px dashed #9C27B0', borderRadius: 14, padding: '10px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}
            onClick={() => onAbrirOrden && onAbrirOrden(null, 'llevar')}>
            <span style={{ fontSize: 22 }}>🥡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#6A1B9A' }}>Ventanilla — Para Llevar</div>
              <div style={{ fontSize: 11, color: '#AB47BC' }}>Toca para crear una orden</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}