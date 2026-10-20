-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "AIPPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- AlterTable
ALTER TABLE "LiquidationReport" ADD COLUMN     "remarks" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPPlan" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "AIPPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "externalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPBudgetLine" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "plannedAmount" DECIMAL(15,2) NOT NULL,
    "remarks" TEXT,
    "aipPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIPPlan_year_key" ON "AIPPlan"("year");

-- CreateIndex
CREATE INDEX "AIPPlan_status_year_idx" ON "AIPPlan"("status", "year");

-- CreateIndex
CREATE INDEX "AIPBudgetLine_aipPlanId_idx" ON "AIPBudgetLine"("aipPlanId");

-- CreateIndex
CREATE INDEX "AIPBudgetLine_category_idx" ON "AIPBudgetLine"("category");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPBudgetLine" ADD CONSTRAINT "AIPBudgetLine_aipPlanId_fkey" FOREIGN KEY ("aipPlanId") REFERENCES "AIPPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
