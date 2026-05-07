-- CreateEnum
CREATE TYPE "PhysicalItemStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'MAINTENANCE', 'REMOVED');

-- CreateTable
CREATE TABLE "PhysicalItem" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "operationalUnitId" TEXT NOT NULL,
    "serviceOrderItemId" TEXT,
    "status" "PhysicalItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PhysicalItem" ADD CONSTRAINT "PhysicalItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalItem" ADD CONSTRAINT "PhysicalItem_operationalUnitId_fkey" FOREIGN KEY ("operationalUnitId") REFERENCES "OperationalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalItem" ADD CONSTRAINT "PhysicalItem_serviceOrderItemId_fkey" FOREIGN KEY ("serviceOrderItemId") REFERENCES "ServiceOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
