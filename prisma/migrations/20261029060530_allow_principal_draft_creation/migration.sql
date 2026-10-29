-- DropForeignKey
ALTER TABLE "LiquidationReport" DROP CONSTRAINT "LiquidationReport_disbursingOfficerId_fkey";

-- AlterTable
ALTER TABLE "LiquidationReport" ADD COLUMN     "createdById" TEXT,
ALTER COLUMN "disbursingOfficerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LiquidationReport" ADD CONSTRAINT "LiquidationReport_disbursingOfficerId_fkey" FOREIGN KEY ("disbursingOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidationReport" ADD CONSTRAINT "LiquidationReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
