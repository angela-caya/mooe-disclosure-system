import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AllocationsClient from "@/src/components/AllocationsClient";
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"

export const dynamic = "force-dynamic";

export default async function AllocationsIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'DISBURSING_OFFICER') {
    redirect('/login');
  }

  const userId = session.user.id;

  const allocations = await prisma.monthlyAllocation.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      reports: {
        where: { disbursingOfficerId: userId },
        include: { 
          expenses: { 
            orderBy: { date: 'desc' } 
          } 
        }
      }
    }
  });

  // Server action processing the initialization of a new fiscal month workflow
  async function createDraft(formData: FormData) {
    'use server'
    const sessionContext = await getServerSession(authOptions);
    const activeUserId = sessionContext?.user?.id;
    
    if (!activeUserId) return;

    const month = parseInt(formData.get("month") as string, 10);
    const year = parseInt(formData.get("year") as string, 10);
    const totalAmount = parseFloat(formData.get("totalAmount") as string);

    // Verify if an allocation already exists to prevent duplication collisions
    let allocation = await prisma.monthlyAllocation.findUnique({
      where: { month_year: { month, year } }
    });

    if (!allocation) {
      allocation = await prisma.monthlyAllocation.create({
        data: { month, year, totalAmount }
      });
    }

    // Verify if a draft report already exists for the selected timeframe
    const existingReport = await prisma.liquidationReport.findUnique({
      where: { month_year: { month, year } }
    });

    if (!existingReport) {
      const report = await prisma.liquidationReport.create({
        data: {
          month,
          year,
          status: "DRAFT",
          allocationId: allocation.id,
          disbursingOfficerId: activeUserId
        }
      });

      await logSystemAction(
        activeUserId,
        "CREATE",
        "LiquidationReport",
        report.id,
        `Initialized new draft workflow for Month ${month}, Year ${year} with a budget of ₱${totalAmount}`
      );
    }

    revalidatePath("/dashboard/expenses");
  }

  return <AllocationsClient allocations={allocations} createDraft={createDraft} />;
}