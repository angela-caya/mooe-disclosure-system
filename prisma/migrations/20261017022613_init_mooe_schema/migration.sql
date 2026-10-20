/*
  Warnings:

  - You are about to drop the column `budgetId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `amountSpent` on the `LiquidationReport` table. All the data in the column will be lost.
  - You are about to drop the column `dateIncurred` on the `LiquidationReport` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `LiquidationReport` table. All the data in the column will be lost.
  - You are about to drop the column `expenseType` on the `LiquidationReport` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Budget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MooeAllocation` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[month,year]` on the table `LiquidationReport` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reportId` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Expense` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `category` on the `Expense` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `disbursingOfficerId` to the `LiquidationReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month` to the `LiquidationReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LiquidationReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `LiquidationReport` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PRINCIPAL', 'DISBURSING_OFFICER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('UTILITIES', 'SUPPLIES', 'MINOR_REPAIRS', 'TRAVEL', 'TRAINING', 'OTHERS');

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "LiquidationReport" DROP CONSTRAINT "LiquidationReport_allocationId_fkey";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "budgetId",
ADD COLUMN     "reportId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" "ExpenseCategory" NOT NULL;

-- AlterTable
ALTER TABLE "LiquidationReport" DROP COLUMN "amountSpent",
DROP COLUMN "dateIncurred",
DROP COLUMN "description",
DROP COLUMN "expenseType",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disbursingOfficerId" TEXT NOT NULL,
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "principalId" TEXT,
ADD COLUMN     "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signatureUrl" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'DISBURSING_OFFICER';

-- DropTable
DROP TABLE "Budget";

-- DropTable
DROP TABLE "MooeAllocation";

-- CreateTable
CREATE TABLE "AIPSetting" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "utilitiesPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suppliesPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repairsPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trainingPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "othersPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyAllocation" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIPSetting_year_key" ON "AIPSetting"("year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAllocation_month_year_key" ON "MonthlyAllocation"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidationReport_month_year_key" ON "LiquidationReport"("month", "year");

-- AddForeignKey
ALTER TABLE "LiquidationReport" ADD CONSTRAINT "LiquidationReport_disbursingOfficerId_fkey" FOREIGN KEY ("disbursingOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidationReport" ADD CONSTRAINT "LiquidationReport_principalId_fkey" FOREIGN KEY ("principalId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidationReport" ADD CONSTRAINT "LiquidationReport_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "MonthlyAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LiquidationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
