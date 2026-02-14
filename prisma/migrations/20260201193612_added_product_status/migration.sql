-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_shopifyId_key" ON "products"("shopifyId");

-- CreateIndex
CREATE INDEX "products_shopifyId_idx" ON "products"("shopifyId");
