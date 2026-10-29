import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AllocationsClient from "@/src/components/AllocationsClient";
import { revalidatePath } from "next/cache";
import { logSystemAction } from "@/lib/auditLogger";

export const dynamic = "force-dynamic";

export default async function AllocationsIndexPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const userId = session.user.id;
  const userRole = session.user.role;
  const resolvedParams = await searchParams;
  
  const selectedYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : new Date().getFullYear();

  const distinctYears = await prisma.monthlyAllocation.findMany({
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'desc' }
  });
  
  const availableYears = [...new Set([...distinctYears.map(y => y.year), new Date().getFullYear()])].sort((a, b) => b - a);

  const allocations = await prisma.monthlyAllocation.findMany({
    where: { year: selectedYear },
    orderBy: { month: 'asc' },
    include: {
      reports: {
        where: userRole === 'DISBURSING_OFFICER' ? { disbursingOfficerId: userId } : undefined,
        include: { 
          expenses: { orderBy: { date: 'desc' } } 
        }
      }
    }
  });

  const activeSignatories = await prisma.signatory.findMany({
    where: { isActive: true }
  });

  const aipPlan = await prisma.aIPPlan.findUnique({
    where: { year: selectedYear },
    include: { budgetLines: true }
  });


  const totalAnnualBudget = aipPlan?.budgetLines.reduce((sum, line) => sum + Number(line.plannedAmount), 0) || 0;
  const defaultMonthlyAllocation = totalAnnualBudget > 0 ? Number((totalAnnualBudget / 12).toFixed(2)) : 0;
  const hasApprovedAip = aipPlan?.status === "APPROVED" && aipPlan.budgetLines.length > 0;

  // SERVER-SIDE RELIABILITY: Create Draft Report (Transaction Protection for multi-table inserts)
  async function createDraft(formData: FormData) {
    'use server'
    const sessionContext = await getServerSession(authOptions);
    const activeUserId = sessionContext?.user?.id;

    if (!activeUserId) throw new Error("Unauthorized");

    const month = Number(formData.get("month"));
    const year = Number(formData.get("year"));
    const rawAmount = String(formData.get("totalAmount") ?? "").replace(/,/g, "");
    const totalAmount = Number(rawAmount);

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error("Invalid month, year, or allocation amount.");
    }

    const approvedAip = await prisma.aIPPlan.findUnique({
      where: { year },
      select: { status: true, budgetLines: { select: { id: true } } },
    });

    if (!approvedAip || approvedAip.status !== "APPROVED" || approvedAip.budgetLines.length === 0) {
      throw new Error(`Cannot create a monthly liquidation draft for ${year}. An approved AIP/APP with budget lines is required first.`);
    }

    const fundPurpose = formData.get("fundPurpose") as string;
    const dvNumber = formData.get("dvNumber") as string;
    const birDeduction = parseFloat(formData.get("birDeduction") as string) || 0;

    const [principalSig, sdsSig, accountantSig] = await Promise.all([
      prisma.signatory.findFirst({ where: { isActive: true, box: "A" } }),
      prisma.signatory.findFirst({ where: { isActive: true, box: "B" } }),
      prisma.signatory.findFirst({ where: { isActive: true, box: "C" } }),
    ]);

    if (!principalSig || !accountantSig || !sdsSig) {
      throw new Error("Missing active default signatories for Box A, Box B, or Box C. Please check your Signatory settings.");
    }

    // Execute database operations within a transaction to prevent orphaned allocations or missing reports
    await prisma.$transaction(async (tx) => {
      let allocation = await tx.monthlyAllocation.findUnique({
        where: { month_year: { month, year } }
      });

      if (!allocation) {
        allocation = await tx.monthlyAllocation.create({
          data: { month, year, totalAmount }
        });
      }

      const existingReport = await tx.liquidationReport.findUnique({
        where: { month_year: { month, year } }
      });

      if (!existingReport) {
        const countThisYear = await tx.liquidationReport.count({ where: { year } });
        const report = await tx.liquidationReport.create({
          data: {
            month, year, status: "DRAFT", allocationId: allocation.id,
            createdById: activeUserId, disbursingOfficerId: null,
            yearlySequence: countThisYear + 1, fundPurpose, dvNumber: dvNumber || null,
            birDeduction, dvDate: new Date(),
            principalName: principalSig?.name || null, principalPosition: principalSig?.position || null,
            sdsName: sdsSig?.name || null, sdsPosition: sdsSig?.position || null,
            accountantName: accountantSig?.name || null, accountantPosition: accountantSig?.position || null,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: activeUserId, action: "CREATE", entity: "LiquidationReport",
            entityId: report.id, details: `Initialized draft for Month ${month}, Year ${year}`
          }
        });
      }
    });

    revalidatePath("/dashboard/expenses");
  }

  return (
    <AllocationsClient 
      allocations={allocations} 
      signatories={activeSignatories} 
      createDraft={createDraft} 
      selectedYear={selectedYear}
      availableYears={availableYears}
      userRole={userRole}
      defaultMonthlyAllocation={defaultMonthlyAllocation}
      hasApprovedAip={hasApprovedAip}
    />
  );
}