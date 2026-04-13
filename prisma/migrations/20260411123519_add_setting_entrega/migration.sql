-- CreateEnum
CREATE TYPE "EntregaTipo" AS ENUM ('post', 'campanha');

-- CreateEnum
CREATE TYPE "EntregaStatus" AS ENUM ('pendente', 'ativa', 'encerrada');

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tipo" "EntregaTipo" NOT NULL,
    "nome" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "investimento" DOUBLE PRECISION NOT NULL,
    "metaCPV" DOUBLE PRECISION,
    "status" "EntregaStatus" NOT NULL DEFAULT 'pendente',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostEntrega" (
    "id" TEXT NOT NULL,
    "entregaId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "alcance" INTEGER NOT NULL DEFAULT 0,
    "curtidas" INTEGER NOT NULL DEFAULT 0,
    "compartilhamentos" INTEGER NOT NULL DEFAULT 0,
    "salvamentos" INTEGER NOT NULL DEFAULT 0,
    "comentarios" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostEntrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_token_key" ON "Entrega"("token");

-- CreateIndex
CREATE INDEX "Entrega_brandId_criadaEm_idx" ON "Entrega"("brandId", "criadaEm");

-- CreateIndex
CREATE INDEX "Entrega_token_idx" ON "Entrega"("token");

-- CreateIndex
CREATE INDEX "PostEntrega_entregaId_idx" ON "PostEntrega"("entregaId");

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostEntrega" ADD CONSTRAINT "PostEntrega_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "Entrega"("id") ON DELETE CASCADE ON UPDATE CASCADE;
