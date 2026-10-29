import "dotenv/config";
import { 
  PrismaClient, 
  Prisma, 
  Role, 
  ReportStatus, 
  ExpenseCategory, 
  AIPPlanStatus, 
  AuditAction, 
  AdjustmentType // Added newly defined AdjustmentType enum
} from "@prisma/client";
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
  console.log("Starting MOOE database reset and seeding...");

  // 0. RESET: Wipe existing transactional data to ensure a clean slate
  console.log("Wiping old data...");
  await prisma.auditLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.budgetAdjustment.deleteMany();
  await prisma.monthlyBudgetLine.deleteMany();
  await prisma.aIPBudgetLine.deleteMany();
  await prisma.liquidationReport.deleteMany();
  await prisma.monthlyAllocation.deleteMany();
  await prisma.aIPPlan.deleteMany();
  await prisma.aIPSetting.deleteMany();
  // We don't delete Users and Signatories completely to preserve accounts, 
  // but they will be upserted/checked below.

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

  // 1.5 Create or reuse Signatories for Appendix 44 with Dynamic Positions
  const signatoryData = [
    { name: "JEANETTE O. ALVAREZ", position: "Principal II" },
    { name: "ARLENE S. RICASATA, CESO VI", position: "Assistant Schools Division Superintendent" },
    { name: "MA. OLIVIA E. MIRANDA", position: "Officer-in-Charge / Schools Division Superintendent" },
    { name: "JUAN DELA CRUZ, CPA", position: "Head, Accounting Division Unit" },
  ];

  for (const sig of signatoryData) {
    const existing = await prisma.signatory.findFirst({ where: { name: sig.name } });
    if (!existing) {
      await prisma.signatory.create({ data: sig });
    }
  }

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

  // 4. Create sample AIP budget lines representing the annual fund allocation per category
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

  const createdAipLines = [];

  for (const line of budgetLines) {
    let existing = await prisma.aIPBudgetLine.findFirst({
      where: {
        aipPlanId: aipPlan.id,
        description: line.description,
        category: line.category,
      },
    });

    if (!existing) {
      existing = await prisma.aIPBudgetLine.create({
        data: {
          ...line,
          plannedAmount: new Prisma.Decimal(line.plannedAmount),
          aipPlanId: aipPlan.id,
        },
      });
    }
    createdAipLines.push(existing);
  }

  // 4.5 Initialize MonthlyBudgetLines (1/12th of AIP) for Q1 (Months 1, 2, and 3)
  const monthsToSeed = [1, 2, 3];
  
  for (const aipLine of createdAipLines) {
    const monthlyAmount = Number(aipLine.plannedAmount) / 12;
    
    for (const m of monthsToSeed) {
      const existingMbl = await prisma.monthlyBudgetLine.findUnique({
        where: {
          aipBudgetLineId_month_year: {
            aipBudgetLineId: aipLine.id,
            month: m,
            year: SEED_YEAR,
          }
        }
      });
      
      if (!existingMbl) {
        await prisma.monthlyBudgetLine.create({
          data: {
            aipBudgetLineId: aipLine.id,
            month: m,
            year: SEED_YEAR,
            plannedAmount: new Prisma.Decimal(monthlyAmount)
          }
        });
      }
    }
  }

  // 4.6 Create a Sample Budget Adjustment using the updated AdjustmentType Enum
  const suppliesM2 = await prisma.monthlyBudgetLine.findFirst({
    where: { month: 2, year: SEED_YEAR, aipBudgetLine: { category: ExpenseCategory.SUPPLIES } }
  });
  
  const utilitiesM2 = await prisma.monthlyBudgetLine.findFirst({
    where: { month: 2, year: SEED_YEAR, aipBudgetLine: { category: ExpenseCategory.UTILITIES } }
  });

  if (suppliesM2 && utilitiesM2) {
    const existingAdj = await prisma.budgetAdjustment.findFirst({
      where: { sourceLineId: suppliesM2.id, destinationLineId: utilitiesM2.id }
    });
    
    if (!existingAdj) {
      await prisma.budgetAdjustment.create({
        data: {
          adjustmentType: AdjustmentType.REALLOCATION,
          sourceLineId: suppliesM2.id,
          destinationLineId: utilitiesM2.id,
          amount: new Prisma.Decimal(5000),
          reason: "Reallocate from Supplies to Utilities to cover increased electricity rates",
          requestedById: officer.id,
          approvedById: principal.id,
          status: ReportStatus.APPROVED
        }
      });
    }
  }

  // 5. Create monthly cash allocations.
  const allocationData = [
    { month: 1, year: SEED_YEAR, totalAmount: 50000 },
    { month: 2, year: SEED_YEAR, totalAmount: 50000 },
    { month: 3, year: SEED_YEAR, totalAmount: 99831.62 },
  ];

  const allocations = new Map<number, string>();

  for (const item of allocationData) {
    const allocation = await prisma.monthlyAllocation.upsert({
      where: { month_year: { month: item.month, year: item.year } },
      update: {},
      create: item,
    });
    allocations.set(item.month, allocation.id);
  }

  // 6. Create or reuse monthly liquidation reports (Appendix 44 snapshots).
  const reportDefinitions = [
    {
      month: 1,
      status: ReportStatus.APPROVED,
      remarks: "Sample approved liquidation report",
      submittedAt: new Date(`${SEED_YEAR}-01-28T00:00:00Z`),
      approvedAt: new Date(`${SEED_YEAR}-01-30T00:00:00Z`),
      yearlySequence: 1,
      fundPurpose: "MOOE",
      birDeduction: 1250.00,
      dvNumber: "2026-01-00100",
      dvDate: new Date(`${SEED_YEAR}-01-25T00:00:00Z`),
      principalName: "JEANETTE O. ALVAREZ",
      principalPosition: "Principal II",
      asdsName: "ARLENE S. RICASATA, CESO VI",
      asdsPosition: "Assistant Schools Division Superintendent",
      sdsName: "MA. OLIVIA E. MIRANDA",
      sdsPosition: "Officer-in-Charge / Schools Division Superintendent",
      accountantName: "JUAN DELA CRUZ, CPA",
      accountantPosition: "Head, Accounting Division Unit"
    },
    {
      month: 2,
      status: ReportStatus.PENDING,
      remarks: "Sample report awaiting principal approval",
      submittedAt: new Date(`${SEED_YEAR}-02-25T00:00:00Z`),
      approvedAt: null,
      yearlySequence: 2,
      fundPurpose: "MOOE",
      birDeduction: 800.00,
      dvNumber: "2026-02-00210",
      dvDate: new Date(`${SEED_YEAR}-02-22T00:00:00Z`),
      principalName: "JEANETTE O. ALVAREZ",
      principalPosition: "Principal II",
      asdsName: "ARLENE S. RICASATA, CESO VI",
      asdsPosition: "Assistant Schools Division Superintendent",
      sdsName: "MA. OLIVIA E. MIRANDA",
      sdsPosition: "Officer-in-Charge / Schools Division Superintendent",
      accountantName: "JUAN DELA CRUZ, CPA",
      accountantPosition: "Head, Accounting Division Unit"
    },
    {
      month: 3,
      status: ReportStatus.DRAFT,
      remarks: "Sample draft report based on Appendix 44",
      submittedAt: null,
      approvedAt: null,
      yearlySequence: 3,
      fundPurpose: "MOOE",
      birDeduction: 4182.88,
      dvNumber: "2026-03-00329",
      dvDate: new Date(`${SEED_YEAR}-03-23T00:00:00Z`),
      principalName: "JEANETTE O. ALVAREZ",
      principalPosition: "Principal II",
      asdsName: "ARLENE S. RICASATA, CESO VI",
      asdsPosition: "Assistant Schools Division Superintendent",
      sdsName: "MA. OLIVIA E. MIRANDA",
      sdsPosition: "Officer-in-Charge / Schools Division Superintendent",
      accountantName: "JUAN DELA CRUZ, CPA",
      accountantPosition: "Head, Accounting Division Unit"
    },
  ];

  const reports = new Map<number, string>();

  for (const item of reportDefinitions) {
    const allocationId = allocations.get(item.month);

    if (!allocationId) {
      throw new Error(`Missing allocation for month ${item.month}`);
    }

    const report = await prisma.liquidationReport.upsert({
      where: { month_year: { month: item.month, year: SEED_YEAR } },
      update: {},
      create: {
        ...item,
        year: SEED_YEAR,
        allocationId,
        disbursingOfficerId: officer.id,
      },
    });

    reports.set(item.month, report.id);
  }

  // 7. Add sample expenses mapped to their explicit ExpenseCategory to enable balance tracking
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
      description: "Seminar Workshop Expenses",
      amount: 6000,
      category: ExpenseCategory.TRAINING,
      date: new Date(`${SEED_YEAR}-03-05T00:00:00Z`),
    },
    {
      month: 3,
      description: "Accountable Forms Expenses",
      amount: 1200,
      category: ExpenseCategory.SUPPLIES,
      date: new Date(`${SEED_YEAR}-03-08T00:00:00Z`),
    },
    {
      month: 3,
      description: "Telephone Expenses - Mobile",
      amount: 1900,
      category: ExpenseCategory.UTILITIES,
      date: new Date(`${SEED_YEAR}-03-10T00:00:00Z`),
    },
    {
      month: 3,
      description: "Telephone Expenses - Landline",
      amount: 2088,
      category: ExpenseCategory.UTILITIES,
      date: new Date(`${SEED_YEAR}-03-11T00:00:00Z`),
    },
    {
      month: 3,
      description: "Internet Subscription Expenses",
      amount: 2088,
      category: ExpenseCategory.UTILITIES,
      date: new Date(`${SEED_YEAR}-03-12T00:00:00Z`),
    },
    {
      month: 3,
      description: "Janitorial Services",
      amount: 26400,
      category: ExpenseCategory.OTHERS,
      date: new Date(`${SEED_YEAR}-03-15T00:00:00Z`),
    },
    {
      month: 3,
      description: "Fidelity Bond Premiums",
      amount: 1588.50,
      category: ExpenseCategory.OTHERS,
      date: new Date(`${SEED_YEAR}-03-18T00:00:00Z`),
    },
    {
      month: 3,
      description: "Other Maintenance and Operating Expenses",
      amount: 62750,
      category: ExpenseCategory.OTHERS,
      date: new Date(`${SEED_YEAR}-03-20T00:00:00Z`),
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

  // 8. Add sample audit records
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