/*
  Warnings:

  - You are about to drop the column `latitude` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Event` table. All the data in the column will be lost.
  - The `status` column on the `ServiceOrder` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `addressId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ServiceOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PRODUCAO', 'GALPAO', 'ADMIN');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('ACTIVE', 'ANALYSIS', 'ADJUSTMENT', 'READY');

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "addressId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ServiceOrder" ADD COLUMN     "missingItems" JSONB,
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ServiceOrderStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'PRODUCAO';

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "street" TEXT,
    "number" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,

    CONSTRAINT "OperationalUnit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalUnit" ADD CONSTRAINT "OperationalUnit_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
