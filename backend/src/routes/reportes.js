const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

// Reporte del día
router.get('/hoy', async (req, res) => {
  try {
    // Inicio y fin del día actual
    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0)
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)

    // Órdenes cerradas hoy
    const ordenes = await prisma.orden.findMany({
      where: {
        estado: 'cerrada',
        cerradaAt: {
          gte: inicio,
          lte: fin
        }
      },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      }
    })

    // Total vendido
    const totalVentas = ordenes.reduce((sum, o) => sum + o.total, 0)

    // Ventas por canal
    const porCanal = {
      mesa: ordenes.filter(o => o.tipo === 'mesa').reduce((sum, o) => sum + o.total, 0),
      llevar: ordenes.filter(o => o.tipo === 'llevar').reduce((sum, o) => sum + o.total, 0)
    }

    // Productos más vendidos
    const productosMap = {}
    ordenes.forEach(orden => {
      orden.items.forEach(item => {
        const nombre = item.producto.nombre
        if (!productosMap[nombre]) {
          productosMap[nombre] = { nombre, cantidad: 0, total: 0 }
        }
        productosMap[nombre].cantidad += item.cantidad
        productosMap[nombre].total += item.precio * item.cantidad
      })
    })

    const topProductos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    res.json({
      totalVentas,
      totalOrdenes: ordenes.length,
      porCanal,
      topProductos
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reporte' })
  }
})

// Reporte por rango de fechas
router.get('/rango', async (req, res) => {
  try {
    const { desde, hasta } = req.query

    const ordenes = await prisma.orden.findMany({
      where: {
        estado: 'cerrada',
        cerradaAt: {
          gte: new Date(desde),
          lte: new Date(hasta)
        }
      }
    })

    const totalVentas = ordenes.reduce((sum, o) => sum + o.total, 0)

    res.json({
      totalVentas,
      totalOrdenes: ordenes.length,
      desde,
      hasta
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reporte' })
  }
})

module.exports = router