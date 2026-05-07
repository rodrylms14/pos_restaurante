const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

// Obtener todos los clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nombre: 'asc' }
    })
    res.json(clientes)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' })
  }
})

// Crear un cliente
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono } = req.body
    const cliente = await prisma.cliente.create({
      data: { nombre, telefono }
    })
    res.json(cliente)
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente' })
  }
})

// Obtener clientes con deuda
router.get('/fiados', async (req, res) => {
  try {
    const clientes = await prisma.cliente.findMany({
      where: { deuda: { gt: 0 } },
      include: {
        ordenes: {
          where: { metodoPago: 'fiado', estado: 'cerrada' },
          orderBy: { cerradaAt: 'desc' }
        }
      }
    })
    res.json(clientes)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener fiados' })
  }
})

// Saldar deuda de un cliente
router.put('/:id/saldar', async (req, res) => {
  try {
    const { id } = req.params
    const cliente = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: { deuda: 0 }
    })
    res.json(cliente)
  } catch (error) {
    res.status(500).json({ error: 'Error al saldar deuda' })
  }
})

// Eliminar cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.cliente.delete({
      where: { id: parseInt(id) }
    })
    res.json({ mensaje: 'Cliente eliminado' })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' })
  }
})

module.exports = router