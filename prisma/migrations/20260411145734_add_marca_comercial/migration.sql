-- AlterTable
ALTER TABLE "Entrega" ADD COLUMN     "marcaComercialId" TEXT;

-- CreateTable
CREATE TABLE "MarcaComercial" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#4ade80',
    "emoji" TEXT NOT NULL DEFAULT '🏷',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarcaComercial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entrega_marcaComercialId_idx" ON "Entrega"("marcaComercialId");

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_marcaComercialId_fkey" FOREIGN KEY ("marcaComercialId") REFERENCES "MarcaComercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
