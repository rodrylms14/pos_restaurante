const express = require('express')
const cors = require('cors')
require('dotenv').config()

const mesasRouter = require('./routes/mesas')
const productosRouter = require('./routes/productos')
const ordenesRouter = require('./routes/ordenes')
const reportesRouter = require('./routes/reportes')
const clientesRouter = require('./routes/clientes')
const configuracionRouter = require('./routes/configuracion')

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares
app.use(cors())
app.use(express.json())

// Rutas
app.use('/api/mesas', mesasRouter)
app.use('/api/productos', productosRouter)
app.use('/api/ordenes', ordenesRouter)
app.use('/api/reportes', reportesRouter)
app.use('/api/clientes', clientesRouter)
app.use('/api/configuracion', configuracionRouter)

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor POS funcionando' })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})