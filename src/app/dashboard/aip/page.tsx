import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import AIPClient from "@/src/components/AIPClient"
import { saveBudgetLine, deleteBudgetLine, approveAIP } from "@/actions/aipActions";

export const dynamic = "force-dynamic"

export default async function AIPIndexPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userRole = session.user.role
  const canEdit = userRole === 'PRINCIPAL'
  const resolvedParams = await searchParams
  const selectedYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : new Date().getFullYear()

  const distinctYears = await prisma.aIPPlan.findMany({
    select: { year: true }, distinct: ['year'], orderBy: { year: 'desc' }
  })
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const availableYears = [...new Set([...distinctYears.map(y => y.year), currentYear, nextYear])].sort((a, b) => b - a)

  const aipPlan = await prisma.aIPPlan.findUnique({
    where: { year: selectedYear },
    include: { budgetLines: { orderBy: { category: 'asc' } } }
  })

  const safeAipPlan = aipPlan ? {
    ...aipPlan,
    budgetLines: aipPlan.budgetLines.map(line => ({
      ...line,
      plannedAmount: Number(line.plannedAmount)
    }))
  } : null

  return (
    <AIPClient 
      aipPlan={safeAipPlan} 
      selectedYear={selectedYear}
      availableYears={availableYears}
      canEdit={canEdit}
      saveBudgetLine={saveBudgetLine}
      deleteBudgetLine={deleteBudgetLine}
      approveAIP={approveAIP}
    />
  )
}