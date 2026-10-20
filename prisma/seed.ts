
import "dotenv/config";
import { PrismaClient, Prisma, Role, ReportStatus, ExpenseCategory, AIPPlanStatus, AuditAction } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from your environment.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEED_YEAR = 2026;

async function main() {
  console.log("Starting MOOE database seeding...");

  // 1. Create or reuse the test accounts.
  const principalPassword = await bcrypt.hash("admin123", 10);
  const officerPassword = await bcrypt.hash("disbursing123", 10);

  const principal = await prisma.user.upsert({
    where: { email: "admin@school.edu.ph" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@school.edu.ph",
      password: principalPassword,
      role: Role.PRINCIPAL,
    },
  });

  const officer = await prisma.user.upsert({
    where: { email: "disbursing@school.edu.ph" },
    update: {},
    create: {
      name: "Disbursing Officer",
      email: "disbursing@school.edu.ph",
      password: officerPassword,
      role: Role.DISBURSING_OFFICER,
    },
  });

  // 2. Create or reuse the AIP percentage settings.
  await prisma.aIPSetting.upsert({
    where: { year: SEED_YEAR },
    update: {},
    create: {
      year: SEED_YEAR,
      utilitiesPercent: 0.30,
      suppliesPercent: 0.30,
      repairsPercent: 0.20,
      travelPercent: 0.05,
      trainingPercent: 0.05,
      othersPercent: 0.10,
    },
  });

  // 3. Create or reuse the Annual Implementation Plan.
  const aipPlan = await prisma.aIPPlan.upsert({
    where: { year: SEED_YEAR },
    update: {},
    create: {
      year: SEED_YEAR,
      status: AIPPlanStatus.APPROVED,
      submittedAt: new Date(`${SEED_YEAR}-01-05T00:00:00Z`),
      approvedAt: new Date(`${SEED_YEAR}-01-10T00:00:00Z`),
      externalReference: "TEST-AIP-2026",
    },
  });

  // 4. Create sample AIP budget lines without duplicating them.
  const budgetLines = [
    {
      description: "Electricity and Water",
      category: ExpenseCategory.UTILITIES,
      plannedAmount: 180000,
      remarks: "Sample annual utilities budget",
    },
    {
      description: "Office and Classroom Supplies",
      category: ExpenseCategory.SUPPLIES,
      plannedAmount: 180000,
      remarks: "Sample supplies budget",
    },
    {
      description: "Minor Facility Repairs",
      category: ExpenseCategory.MINOR_REPAIRS,
      plannedAmount: 120000,
      remarks: "Sample maintenance budget",
    },
    {
      description: "Official Travel",
      category: ExpenseCategory.TRAVEL,
      plannedAmount: 30000,
      remarks: "Sample travel budget",
    },
    {
      description: "Staff Training",
      category: ExpenseCategory.TRAINING,
      plannedAmount: 30000,
      remarks: "Sample training budget",
    },
    {
      description: "Other Operating Expenses",
      category: ExpenseCategory.OTHERS,
      plannedAmount: 60000,
      remarks: "Sample other expenses budget",
    },
  ];

  for (const line of budgetLines) {
    const existing = await prisma.aIPBudgetLine.findFirst({
      where: {
        aipPlanId: aipPlan.id,
        description: line.description,
        category: line.category,
      },
    });

    if (!existing) {
      await prisma.aIPBudgetLine.create({
        data: {
          ...line,
          plannedAmount: new Prisma.Decimal(line.plannedAmount),
          aipPlanId: aipPlan.id,
        },
      });
    }
  }

  // 5. Create monthly cash allocations.
  const allocationData = [
    { month: 1, year: SEED_YEAR, totalAmount: 50000 },
    { month: 2, year: SEED_YEAR, totalAmount: 50000 },
    { month: 3, year: SEED_YEAR, totalAmount: 50000 },
  ];

  const allocations = new Map<number, string>();

  for (const item of allocationData) {
    const allocation = await prisma.monthlyAllocation.upsert({
      where: {
        month_year: {
          month: item.month,
          year: item.year,
        },
      },
      update: {},
      create: item,
    });

    allocations.set(item.month, allocation.id);
  }

  // 6. Create or reuse monthly liquidation reports.
  const reportDefinitions = [
    {
      month: 1,
      status: ReportStatus.APPROVED,
      remarks: "Sample approved liquidation report",
      submittedAt: new Date(`${SEED_YEAR}-01-28T00:00:00Z`),
      approvedAt: new Date(`${SEED_YEAR}-01-30T00:00:00Z`),
      principalId: principal.id,
    },
    {
      month: 2,
      status: ReportStatus.PENDING,
      remarks: "Sample report awaiting principal approval",
      submittedAt: new Date(`${SEED_YEAR}-02-25T00:00:00Z`),
      approvedAt: null,
      principalId: null,
    },
    {
      month: 3,
      status: ReportStatus.DRAFT,
      remarks: "Sample draft report",
      submittedAt: null,
      approvedAt: null,
      principalId: null,
    },
  ];

  const reports = new Map<number, string>();

  for (const item of reportDefinitions) {
    const allocationId = allocations.get(item.month);

    if (!allocationId) {
      throw new Error(`Missing allocation for month ${item.month}`);
    }

    const report = await prisma.liquidationReport.upsert({
      where: {
        month_year: {
          month: item.month,
          year: SEED_YEAR,
        },
      },
      update: {},
      create: {
        month: item.month,
        year: SEED_YEAR,
        status: item.status,
        remarks: item.remarks,
        submittedAt: item.submittedAt,
        approvedAt: item.approvedAt,
        principalId: item.principalId,
        allocationId,
        disbursingOfficerId: officer.id,
      },
    });

    reports.set(item.month, report.id);
  }

  // 7. Add sample expenses, checking for duplicates first.
  const expenseData = [
    {
      month: 1,
      description: "Meralco Bill - January",
      amount: 12500,
      category: ExpenseCategory.UTILITIES,
      date: new Date(`${SEED_YEAR}-01-10T00:00:00Z`),
    },
    {
      month: 1,
      description: "Internet Service - January",
      amount: 2000,
      category: ExpenseCategory.UTILITIES,
      date: new Date(`${SEED_YEAR}-01-12T00:00:00Z`),
    },
    {
      month: 1,
      description: "Bond Paper and Printer Ink",
      amount: 14000,
      category: ExpenseCategory.SUPPLIES,
      date: new Date(`${SEED_YEAR}-01-15T00:00:00Z`),
    },
    {
      month: 1,
      description: "Classroom Window Repair",
      amount: 8000,
      category: ExpenseCategory.MINOR_REPAIRS,
      date: new Date(`${SEED_YEAR}-01-20T00:00:00Z`),
    },
    {
      month: 2,
      description: "Meralco Bill - February",
      amount: 13000,
      category: ExpenseCategory.UTILITIES,
      date: new Date(`${SEED_YEAR}-02-10T00:00:00Z`),
    },
    {
      month: 2,
      description: "Transportation for Division Meeting",
      amount: 2500,
      category: ExpenseCategory.TRAVEL,
      date: new Date(`${SEED_YEAR}-02-14T00:00:00Z`),
    },
    {
      month: 2,
      description: "Teachers Capacity Building Seminar",
      amount: 5000,
      category: ExpenseCategory.TRAINING,
      date: new Date(`${SEED_YEAR}-02-18T00:00:00Z`),
    },
    {
      month: 3,
      description: "Office Cleaning Supplies",
      amount: 3500,
      category: ExpenseCategory.SUPPLIES,
      date: new Date(`${SEED_YEAR}-03-10T00:00:00Z`),
    },
  ];

  for (const item of expenseData) {
    const reportId = reports.get(item.month);

    if (!reportId) {
      throw new Error(`Missing report for month ${item.month}`);
    }

    const existing = await prisma.expense.findFirst({
      where: {
        reportId,
        description: item.description,
      },
    });

    if (!existing) {
      await prisma.expense.create({
        data: {
          reportId,
          description: item.description,
          amount: item.amount,
          category: item.category,
          date: item.date,
        },
      });
    }
  }

  // 8. Add sample audit records only when they do not already exist.
  const auditEntries = [
    {
      action: AuditAction.CREATE,
      entity: "AIPPlan",
      entityId: aipPlan.id,
      details: `Seeded sample AIP plan for ${SEED_YEAR}`,
      userId: principal.id,
    },
    {
      action: AuditAction.CREATE,
      entity: "User",
      entityId: officer.id,
      details: "Seeded sample Disbursing Officer account",
      userId: principal.id,
    },
  ];

  for (const entry of auditEntries) {
    const existing = await prisma.auditLog.findFirst({
      where: entry,
    });

    if (!existing) {
      await prisma.auditLog.create({
        data: entry,
      });
    }
  }

  console.log("MOOE database seeding completed.");
  console.log("Test accounts:");
  console.log("Principal: admin@school.edu.ph / admin123");
  console.log("Disbursing Officer: disbursing@school.edu.ph / disbursing123");
}

main()
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
