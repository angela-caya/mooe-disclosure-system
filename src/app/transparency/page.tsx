import prisma from "@/lib/prisma";
import TransparencyClient from "@/src/components/TransparencyClient";

export const revalidate = 60; // Regenerate data every 60 seconds

export default async function TransparencyBoard() {
  // Fetch all historical allocations
  const allocations = await prisma.monthlyAllocation.findMany({
    orderBy: [{ year: 'asc' }, { month: 'asc' }]
  });

  // FIX: I-include ang allocation table para makuha ang tamang month at year
  const expenses = await prisma.expense.findMany({
    where: {
      report: { status: "APPROVED" }
    },
    include: {
      report: {
        include: {
          allocation: {
            select: { month: true, year: true }
          }
        }
      }
    }
  });

  // Fetch all yearly AIP settings
  const aipSettings = await prisma.aIPSetting.findMany();

  return (
    <TransparencyClient 
      allocations={allocations} 
      expenses={expenses} 
      aipSettings={aipSettings} 
    />
  );
}