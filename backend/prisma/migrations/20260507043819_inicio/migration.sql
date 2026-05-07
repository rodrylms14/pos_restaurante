-- CreateTable
CREATE TABLE "Mesa" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'libre',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "categoria" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orden" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'mesa',
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "cliente" TEXT,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mesaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaAt" TIMESTAMP(3),

    CONSTRAINT "Orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrden" (
    "id" SERIAL NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "ItemOrden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_numero_key" ON "Mesa"("numero");

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrden" ADD CONSTRAINT "ItemOrden_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOrden" ADD CONSTRAINT "ItemOrden_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
