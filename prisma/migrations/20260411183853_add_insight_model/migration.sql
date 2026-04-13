-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delta" TEXT NOT NULL DEFAULT '',
    "deltaLabel" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT '',
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insight_brandId_createdAt_idx" ON "Insight"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "Insight_brandId_fromDate_toDate_idx" ON "Insight"("brandId", "fromDate", "toDate");

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
