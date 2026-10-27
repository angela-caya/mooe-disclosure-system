import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AllocationsClient from "@/src/components/AllocationsClient";
import { revalidatePath } from "next/cache";
import { logSystemAction } from "@/lib/auditLogger";

export const dynamic = "force-dynamic";

export default async function AllocationsIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'DISBURSING_OFFICER') {
    redirect('/login');
  }

  const userId = session.user.id;

  // Fetch all allocations and their associated reports
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

  // Fetch active signatories to populate the modal dropdowns
  const activeSignatories = await prisma.signatory.findMany({
    where: { isActive: true }
  });

  // Server action processing the initialization of a new fiscal month workflow
  // Server action inside AllocationsIndexPage
  async function createDraft(formData: FormData) {
    'use server'
    const sessionContext = await getServerSession(authOptions);
    const activeUserId = sessionContext?.user?.id;
    
    if (!activeUserId) return;

    const month = parseInt(formData.get("month") as string, 10);
    const year = parseInt(formData.get("year") as string, 10);
    const totalAmount = parseFloat(formData.get("totalAmount") as string);

    const fundPurpose = formData.get("fundPurpose") as string;
    const dvNumber = formData.get("dvNumber") as string;
    const birDeduction = parseFloat(formData.get("birDeduction") as string) || 0;
    
    // Get Signatory IDs from form
    const principalId = formData.get("principalId") as string;
    const asdsId = formData.get("asdsId") as string;
    const sdsId = formData.get("sdsId") as string;
    const accountantId = formData.get("accountantId") as string;

    // Fetch actual names and positions from Signatory table for historical snapshot
    const [principalSig, asdsSig, sdsSig, accountantSig] = await Promise.all([
      principalId ? prisma.signatory.findUnique({ where: { id: principalId } }) : null,
      asdsId ? prisma.signatory.findUnique({ where: { id: asdsId } }) : null,
      sdsId ? prisma.signatory.findUnique({ where: { id: sdsId } }) : null,
      accountantId ? prisma.signatory.findUnique({ where: { id: accountantId } }) : null,
    ]);

    let allocation = await prisma.monthlyAllocation.findUnique({
      where: { month_year: { month, year } }
    });

    if (!allocation) {
      allocation = await prisma.monthlyAllocation.create({
        data: { month, year, totalAmount }
      });
    }

    const existingReport = await prisma.liquidationReport.findUnique({
      where: { month_year: { month, year } }
    });

    if (!existingReport) {
      const countThisYear = await prisma.liquidationReport.count({ where: { year } });

      const report = await prisma.liquidationReport.create({
        data: {
          month,
          year,
          status: "DRAFT",
          allocationId: allocation.id,
          disbursingOfficerId: activeUserId,
          yearlySequence: countThisYear + 1,
          fundPurpose,
          dvNumber: dvNumber || null,
          birDeduction,
          dvDate: new Date(),
          // Save Name and Position Snapshots
          principalName: principalSig?.name || null,
          principalPosition: principalSig?.position || null,
          asdsName: asdsSig?.name || null,
          asdsPosition: asdsSig?.position || null,
          sdsName: sdsSig?.name || null,
          sdsPosition: sdsSig?.position || null,
          accountantName: accountantSig?.name || null,
          accountantPosition: accountantSig?.position || null,
        }
      });

      await logSystemAction(
        activeUserId,
        "CREATE",
        "LiquidationReport",
        report.id,
        `Initialized draft for Month ${month}, Year ${year}`
      );
    }

    revalidatePath("/dashboard/expenses");
  }

  // Pass both allocations and signatories to the client component
  return <AllocationsClient allocations={allocations} signatories={activeSignatories} createDraft={createDraft} />;
}