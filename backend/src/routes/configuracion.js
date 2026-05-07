const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

// Obtener configuracion
router.get('/', async (req, res) => {
  try {
    let config = await prisma.configuracion.findFirst()
    if (!config) {
      config = await prisma.configuracion.create({ data: {} })
    }
    res.json(config)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración' })
  }
})

// Actualizar configuracion
router.put('/', async (req, res) => {
  try {
    const { mesasSalon, sillasBarra, cargoServicio } = req.body
    let config = await prisma.configuracion.findFirst()
    if (!config) {
      config = await prisma.configuracion.create({ data: {} })
    }
    const actualizada = await prisma.configuracion.update({
      where: { id: config.id },
      data: { mesasSalon, sillasBarra, cargoServicio }
    })
    res.json(actualizada)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar configuración' })
  }
})

module.exports = router