-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'PRINCIPAL', 'DISBURSING_OFFICER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('UTILITIES', 'SUPPLIES', 'MINOR_REPAIRS', 'TRAVEL', 'TRAINING', 'OTHERS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "AIPPlanStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('REALLOCATION', 'ADDITIONAL_FUND', 'RETURN_TO_DIVISION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DISBURSING_OFFICER',
    "signatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signatory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "box" TEXT NOT NULL DEFAULT 'A',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signatory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPSetting" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "utilitiesPercent" DOUBLE PRECISION NOT NULL,
    "suppliesPercent" DOUBLE PRECISION NOT NULL,
    "repairsPercent" DOUBLE PRECISION NOT NULL,
    "travelPercent" DOUBLE PRECISION NOT NULL,
    "trainingPercent" DOUBLE PRECISION NOT NULL,
    "othersPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPSetting_pkey" PRIMARY KEY ("id")
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
    "aipPlanId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "plannedAmount" DECIMAL(65,30) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyBudgetLine" (
    "id" TEXT NOT NULL,
    "aipBudgetLineId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "plannedAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAdjustment" (
    "id" TEXT NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL DEFAULT 'REALLOCATION',
    "sourceLineId" TEXT,
    "destinationLineId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceDoc" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAdjustment_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "LiquidationReport" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "yearlySequence" INTEGER NOT NULL DEFAULT 1,
    "fundPurpose" TEXT NOT NULL DEFAULT 'MOOE',
    "birDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dvNumber" TEXT,
    "dvDate" TIMESTAMP(3),
    "principalName" TEXT,
    "principalPosition" TEXT,
    "asdsName" TEXT,
    "asdsPosition" TEXT,
    "sdsName" TEXT,
    "sdsPosition" TEXT,
    "accountantName" TEXT,
    "accountantPosition" TEXT,
    "entityName" TEXT NOT NULL DEFAULT 'BINAN CITY SENIOR HIGH SCHOOL-WEST CAMPUS',
    "fundCluster" TEXT NOT NULL DEFAULT '01',
    "centerCode" TEXT NOT NULL DEFAULT '070010804019',
    "allocationId" TEXT NOT NULL,
    "disbursingOfficerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AIPSetting_year_key" ON "AIPSetting"("year");

-- CreateIndex
CREATE UNIQUE INDEX "AIPPlan_year_key" ON "AIPPlan"("year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBudgetLine_aipBudgetLineId_month_year_key" ON "MonthlyBudgetLine"("aipBudgetLineId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAllocation_month_year_key" ON "MonthlyAllocation"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LiquidationReport_month_year_key" ON "LiquidationReport"("month", "year");

-- AddForeignKey
ALTER TABLE "AIPBudgetLine" ADD CONSTRAINT "AIPBudgetLine_aipPlanId_fkey" FOREIGN KEY ("aipPlanId") REFERENCES "AIPPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBudgetLine" ADD CONSTRAINT "MonthlyBudgetLine_aipBudgetLineId_fkey" FOREIGN KEY ("aipBudgetLineId") REFERENCES "AIPBudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAdjustment" ADD CONSTRAINT "BudgetAdjustment_sourceLineId_fkey" FOREIGN KEY ("sourceLineId") REFERENCES "MonthlyBudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAdjustment" ADD CONSTRAINT "BudgetAdjustment_destinationLineId_fkey" FOREIGN KEY ("destinationLineId") REFERENCES "MonthlyBudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAdjustment" ADD CONSTRAINT "BudgetAdjustment_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAdjustment" ADD CONSTRAINT "BudgetAdjustment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidationReport" ADD CONSTRAINT "LiquidationReport_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "MonthlyAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiquidationReport" ADD CONSTRAINT "LiquidationReport_disbursingOfficerId_fkey" FOREIGN KEY ("disbursingOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LiquidationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
