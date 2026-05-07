const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

// Obtener todas las mesas
router.get('/', async (req, res) => {
  try {
    const mesas = await prisma.mesa.findMany({
      orderBy: { numero: 'asc' }
    })
    res.json(mesas)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mesas' })
  }
})

// Crear una mesa
router.post('/', async (req, res) => {
  try {
    const { numero, zona, posX, posY } = req.body
    const mesa = await prisma.mesa.create({
      data: {
        numero,
        zona: zona || 'salon',
        posX: posX || 0,
        posY: posY || 0
      }
    })
    res.json(mesa)
  } catch (error) {
    res.status(500).json({ error: 'Error al crear mesa' })
  }
})

// Actualizar mesa (estado y/o posicion)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { estado, zona, posX, posY } = req.body
    const mesa = await prisma.mesa.update({
      where: { id: parseInt(id) },
      data: {
        ...(estado !== undefined && { estado }),
        ...(zona !== undefined && { zona }),
        ...(posX !== undefined && { posX }),
        ...(posY !== undefined && { posY }),
      }
    })
    res.json(mesa)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar mesa' })
  }
})

// Guardar posiciones de todas las mesas de una vez
router.put('/posiciones/guardar', async (req, res) => {
  try {
    const { mesas } = req.body
    const actualizaciones = mesas.map(m =>
      prisma.mesa.update({
        where: { id: m.id },
        data: { posX: m.posX, posY: m.posY, zona: m.zona }
      })
    )
    await Promise.all(actualizaciones)
    res.json({ mensaje: 'Posiciones guardadas' })
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar posiciones' })
  }
})

// Eliminar mesa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.mesa.delete({
      where: { id: parseInt(id) }
    })
    res.json({ mensaje: 'Mesa eliminada' })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar mesa' })
  }
})

module.exports = router