import { useState } from 'react'
import Plano from './pages/Plano'
import Orden from './pages/Orden'

function App() {
  const [mesaActiva, setMesaActiva] = useState(null)

  const abrirOrden = (mesa, tipo) => {
    if (tipo === 'llevar') {
      setMesaActiva('llevar')
    } else {
      setMesaActiva(mesa)
    }
  }

  const volverAlPlano = () => {
    setMesaActiva(null)
  }

  if (mesaActiva !== null) {
    return <Orden mesa={mesaActiva} onVolver={volverAlPlano} />
  }

  return <Plano onAbrirOrden={abrirOrden} />
}

export default App