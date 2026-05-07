-- AlterTable
ALTER TABLE "Mesa" ADD COLUMN     "zona" TEXT NOT NULL DEFAULT 'salon';

-- AlterTable
ALTER TABLE "Orden" ADD COLUMN     "cargoServicio" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "clienteId" INTEGER,
ADD COLUMN     "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "metodoPago" TEXT,
ADD COLUMN     "zona" TEXT NOT NULL DEFAULT 'salon';

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" SERIAL NOT NULL,
    "mesasSalon" INTEGER NOT NULL DEFAULT 10,
    "sillasBarra" INTEGER NOT NULL DEFAULT 8,
    "cargoServicio" DOUBLE PRECISION NOT NULL DEFAULT 10,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "deuda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
