/*
  Warnings:

  - The values [ANALYSIS,ADJUSTMENT] on the enum `ServiceOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `OperationalUnit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operationalUnitId` to the `ServiceOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ServiceOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ServiceOrderItemStatus" AS ENUM ('ADDED', 'REMOVED');

-- AlterEnum
BEGIN;
CREATE TYPE "ServiceOrderStatus_new" AS ENUM ('DRAFT', 'ACTIVE', 'PENDING', 'READY', 'CANCELED');
ALTER TABLE "ServiceOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ServiceOrder" ALTER COLUMN "status" TYPE "ServiceOrderStatus_new" USING ("status"::text::"ServiceOrderStatus_new");
ALTER TYPE "ServiceOrderStatus" RENAME TO "ServiceOrderStatus_old";
ALTER TYPE "ServiceOrderStatus_new" RENAME TO "ServiceOrderStatus";
DROP TYPE "ServiceOrderStatus_old";
ALTER TABLE "ServiceOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "OperationalUnit" DROP CONSTRAINT "OperationalUnit_addressId_fkey";

-- AlterTable
ALTER TABLE "OperationalUnit" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "addressId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ServiceOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "ServiceOrderItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "operationalUnitId" TEXT NOT NULL,
ADD COLUMN     "status" "ServiceOrderItemStatus" NOT NULL DEFAULT 'ADDED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE "OperationalUnit" ADD CONSTRAINT "OperationalUnit_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_operationalUnitId_fkey" FOREIGN KEY ("operationalUnitId") REFERENCES "OperationalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
