const express = require('express')
const router = express.Router()
const prisma = require('../prisma')

// Obtener todas las órdenes abiertas
router.get('/', async (req, res) => {
  try {
    const ordenes = await prisma.orden.findMany({
      where: { estado: 'abierta' },
      include: {
        items: {
          include: { producto: true }
        },
        mesa: true,
        clienteFiado: true
      }
    })
    res.json(ordenes)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener órdenes' })
  }
})

// Crear una orden
router.post('/', async (req, res) => {
  try {
    const { tipo, mesaId, cliente, zona } = req.body

    // Obtener configuracion para saber el cargo de servicio
    const config = await prisma.configuracion.findFirst()
    const cargoServicio = zona === 'salon' ? (config?.cargoServicio || 10) : 0

    const orden = await prisma.orden.create({
      data: {
        tipo,
        zona: zona || 'salon',
        mesaId: mesaId ? parseInt(mesaId) : null,
        cliente: cliente || null,
        cargoServicio
      }
    })

    // Si es de mesa actualizamos el estado a ocupada
    if (mesaId) {
      await prisma.mesa.update({
        where: { id: parseInt(mesaId) },
        data: { estado: 'ocupada' }
      })
    }

    res.json(orden)
  } catch (error) {
    res.status(500).json({ error: 'Error al crear orden' })
  }
})

// Agregar producto a una orden
// Agregar producto a una orden
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params
    const { productoId, cantidad } = req.body

    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(productoId) }
    })

    const item = await prisma.itemOrden.create({
      data: {
        ordenId: parseInt(id),
        productoId: parseInt(productoId),
        cantidad: parseInt(cantidad),
        precio: producto.precio
      }
    })

    // Marcar la mesa como ocupada al agregar el primer producto
    const orden = await prisma.orden.findUnique({
      where: { id: parseInt(id) },
      include: { items: true }
    })

    if (orden.mesaId && orden.items.length === 1) {
      await prisma.mesa.update({
        where: { id: orden.mesaId },
        data: { estado: 'ocupada' }
      })
    }

    await recalcularTotal(parseInt(id))
    res.json(item)
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar item' })
  }
})

// Eliminar producto de una orden
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params

    const item = await prisma.itemOrden.findUnique({
      where: { id: parseInt(itemId) }
    })

    if (item.cantidad > 1) {
      await prisma.itemOrden.update({
        where: { id: parseInt(itemId) },
        data: { cantidad: item.cantidad - 1 }
      })
    } else {
      await prisma.itemOrden.delete({
        where: { id: parseInt(itemId) }
      })
    }

    await recalcularTotal(parseInt(id))

    // Si no quedan items, cancelar orden y liberar mesa
    const itemsRestantes = await prisma.itemOrden.findMany({
      where: { ordenId: parseInt(id) }
    })

    if (itemsRestantes.length === 0) {
      const orden = await prisma.orden.update({
        where: { id: parseInt(id) },
        data: { estado: 'cancelada', cerradaAt: new Date() }
      })
      if (orden.mesaId) {
        await prisma.mesa.update({
          where: { id: orden.mesaId },
          data: { estado: 'libre' }
        })
      }
      return res.json({ mensaje: 'Orden cancelada, mesa liberada', mesaLiberada: true })
    }

    res.json({ mensaje: 'Item actualizado', mesaLiberada: false })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar item' })
  }
})

// Aplicar descuento
router.put('/:id/descuento', async (req, res) => {
  try {
    const { id } = req.params
    const { descuento } = req.body
    await prisma.orden.update({
      where: { id: parseInt(id) },
      data: { descuento: parseFloat(descuento) }
    })
    await recalcularTotal(parseInt(id))
    res.json({ mensaje: 'Descuento aplicado' })
  } catch (error) {
    res.status(500).json({ error: 'Error al aplicar descuento' })
  }
})

// Cerrar una orden (cobrar)
router.put('/:id/cerrar', async (req, res) => {
  try {
    const { id } = req.params
    const { metodoPago, clienteId } = req.body

    const orden = await prisma.orden.findUnique({
      where: { id: parseInt(id) }
    })

    // Si es fiado registramos la deuda al cliente
    if (metodoPago === 'fiado' && clienteId) {
      await prisma.cliente.update({
        where: { id: parseInt(clienteId) },
        data: { deuda: { increment: orden.total } }
      })
    }

    const ordenCerrada = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'cerrada',
        metodoPago,
        clienteId: clienteId ? parseInt(clienteId) : null,
        cerradaAt: new Date()
      }
    })

    // Si tiene mesa la liberamos
    if (orden.mesaId) {
      await prisma.mesa.update({
        where: { id: orden.mesaId },
        data: { estado: 'libre' }
      })
    }

    res.json(ordenCerrada)
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar orden' })
  }
})

// Cancelar una orden
router.put('/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params

    const orden = await prisma.orden.update({
      where: { id: parseInt(id) },
      data: { estado: 'cancelada', cerradaAt: new Date() }
    })

    // Si tiene mesa la liberamos
    if (orden.mesaId) {
      await prisma.mesa.update({
        where: { id: orden.mesaId },
        data: { estado: 'libre' }
      })
    }

    res.json(orden)
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar orden' })
  }
})

// Función interna para recalcular el total
async function recalcularTotal(ordenId) {
  const orden = await prisma.orden.findUnique({
    where: { id: ordenId },
    include: { items: true }
  })

  const subtotal = orden.items.reduce((sum, i) => sum + (i.precio * i.cantidad), 0)
  const conDescuento = subtotal - (subtotal * (orden.descuento / 100))
  const conCargo = conDescuento + (conDescuento * (orden.cargoServicio / 100))

  await prisma.orden.update({
    where: { id: ordenId },
    data: { total: conCargo }
  })
}

// Marcar items como pagados (pago parcial por consumo)
router.put('/:id/pagar-items', async (req, res) => {
  try {
    const { id } = req.params
    const { itemIds, metodoPago } = req.body

    // Marcar los items seleccionados como pagados
    await prisma.itemOrden.updateMany({
      where: { id: { in: itemIds } },
      data: { pagado: true }
    })

    // Verificar si quedan items sin pagar
    const itemsPendientes = await prisma.itemOrden.findMany({
      where: { ordenId: parseInt(id), pagado: false }
    })

    // Si no quedan items pendientes cerramos la orden completa
    if (itemsPendientes.length === 0) {
      const orden = await prisma.orden.update({
        where: { id: parseInt(id) },
        data: { estado: 'cerrada', metodoPago, cerradaAt: new Date() }
      })
      if (orden.mesaId) {
        await prisma.mesa.update({
          where: { id: orden.mesaId },
          data: { estado: 'libre' }
        })
      }
      return res.json({ cerrada: true, orden })
    }

    // Recalcular total con items pendientes
    await recalcularTotal(parseInt(id))
    res.json({ cerrada: false, pendientes: itemsPendientes.length })
  } catch (error) {
    res.status(500).json({ error: 'Error al pagar items' })
  }
})

// Obtener detalle de una orden por id (para ticket)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const orden = await prisma.orden.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: { producto: true }
        },
        mesa: true,
        clienteFiado: true
      }
    })
    res.json(orden)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener orden' })
  }
})

module.exports = router