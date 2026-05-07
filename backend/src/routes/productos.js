const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

// Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const productos = await prisma.producto.findMany()
    res.json(productos)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// Crear un producto
router.post('/', async (req, res) => {
  try {
    const { nombre, precio, categoria } = req.body
    const producto = await prisma.producto.create({
      data: { nombre, precio, categoria }
    })
    res.json(producto)
  } catch (error) {
    res.status(500).json({ error: 'Error al crear producto' })
  }
})

// Actualizar un producto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, precio, categoria, disponible } = req.body
    const producto = await prisma.producto.update({
      where: { id: parseInt(id) },
      data: { nombre, precio, categoria, disponible }
    })
    res.json(producto)
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

// Eliminar un producto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    await prisma.producto.delete({
      where: { id: parseInt(id) }
    })
    res.json({ mensaje: 'Producto eliminado' })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

module.exports = router