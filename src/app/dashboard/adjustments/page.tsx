import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"
import AdjustmentsClient from "@/src/components/AdjustmentsClient"

export const dynamic = "force-dynamic"

export default async function AdjustmentsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userRole = session.user.role
  const userId = session.user.id
  const canRequest = userRole === 'DISBURSING_OFFICER'
  const canApprove = userRole === 'PRINCIPAL'
  const currentYear = new Date().getFullYear()

  // Fetch adjustments and map safely to plain JavaScript objects
  const rawAdjustments = await prisma.budgetAdjustment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sourceLine: { include: { aipBudgetLine: true } },
      destinationLine: { include: { aipBudgetLine: true } },
      requestedBy: true,
      approvedBy: true
    }
  })

  const adjustments = rawAdjustments.map(adj => ({
    ...adj,
    amount: Number(adj.amount),
    sourceLine: adj.sourceLine ? { 
      ...adj.sourceLine, 
      plannedAmount: Number(adj.sourceLine.plannedAmount),
      aipBudgetLine: adj.sourceLine.aipBudgetLine ? {
        ...adj.sourceLine.aipBudgetLine,
        plannedAmount: Number(adj.sourceLine.aipBudgetLine.plannedAmount)
      } : null
    } : null,
    destinationLine: adj.destinationLine ? { 
      ...adj.destinationLine, 
      plannedAmount: Number(adj.destinationLine.plannedAmount),
      aipBudgetLine: adj.destinationLine.aipBudgetLine ? {
        ...adj.destinationLine.aipBudgetLine,
        plannedAmount: Number(adj.destinationLine.aipBudgetLine.plannedAmount)
      } : null
    } : null,
  }))

  // Fetch AIP plan and extract pure string array for categories
  const aipPlan = await prisma.aIPPlan.findUnique({
    where: { year: currentYear },
    include: { budgetLines: true }
  })
  
  const categories: string[] = aipPlan?.budgetLines?.map(line => line.category) || []

  // Server Action: Handle Reallocation, Additional Funds, and Surplus Returns
  async function submitAdjustment(formData: FormData) {
    'use server'
    const type = formData.get("adjustmentType") as string
    const amount = parseFloat(formData.get("amount") as string)
    const reason = formData.get("reason") as string
    const sourceCat = formData.get("sourceCategory") as string
    const destCat = formData.get("destinationCategory") as string

    // ISO 1.3: Validate incorrect data inputs (negative amounts)
    if (amount <= 0) {
      throw new Error("Amounts must be greater than zero.")
    }

    // Fetch fresh plan inside the server action to find matching budget lines safely
    const currentPlan = await prisma.aIPPlan.findUnique({
      where: { year: currentYear },
      include: { budgetLines: true }
    })

    let sourceLineId = null
    let destinationLineId = null

    // For simplicity with MonthlyBudgetLine relation, we map to the first month or handle accordingly.
    // Here we find the AIP budget line ID first, then fetch its corresponding monthly line if needed, 
    // or link it directly if your schema allows. Let's link to the first month (month: 1) as baseline storage.
    if (type === 'REALLOCATION' || type === 'RETURN_TO_DIVISION') {
      const sAipLine = currentPlan?.budgetLines.find(l => l.category === sourceCat)
      if (sAipLine) {
        const monthLine = await prisma.monthlyBudgetLine.findFirst({
          where: { aipBudgetLineId: sAipLine.id, year: currentYear }
        })
        if (monthLine) sourceLineId = monthLine.id
      }
    }

    if (type === 'REALLOCATION' || type === 'ADDITIONAL_FUND') {
      const dAipLine = currentPlan?.budgetLines.find(l => l.category === destCat)
      if (dAipLine) {
        const monthLine = await prisma.monthlyBudgetLine.findFirst({
          where: { aipBudgetLineId: dAipLine.id, year: currentYear }
        })
        if (monthLine) destinationLineId = monthLine.id
      }
    }

    const adj = await prisma.budgetAdjustment.create({
      data: {
        adjustmentType: type as any,
        sourceLineId,
        destinationLineId,
        amount,
        reason,
        requestedById: userId,
        status: "PENDING"
      }
    })

    await logSystemAction(userId, "CREATE", "BudgetAdjustment", adj.id, `Requested ${type} of ₱${amount}`)
    revalidatePath('/dashboard/adjustments')
  }

  // Server Action: Principal Approval / Rejection
  async function processAdjustment(formData: FormData) {
    'use server'
    const adjustmentId = formData.get("adjustmentId") as string
    const action = formData.get("action") as string

    const adj = await prisma.budgetAdjustment.update({
      where: { id: adjustmentId },
      data: { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', approvedById: userId }
    })

    await logSystemAction(userId, action as any, "BudgetAdjustment", adj.id, `${action}D adjustment request`)
    revalidatePath('/dashboard/adjustments')
  }

  return (
    <AdjustmentsClient 
      adjustments={adjustments} 
      categories={categories} 
      canRequest={canRequest} 
      canApprove={canApprove}
      submitAdjustment={submitAdjustment}
      processAdjustment={processAdjustment}
    />
  )
}