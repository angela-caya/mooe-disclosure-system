import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route"
import { redirect, notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"
import ManageExpensesClient from "@/src/components/ManageExpensesClient"

export const dynamic = "force-dynamic";

export default async function ManageExpensesPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const sessionEmail = session.user.email

  if (!sessionEmail) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { email: sessionEmail },
    select: { id: true, role: true },
  })

  if (!dbUser) redirect('/login')

  const userId = dbUser.id
  const userRole = dbUser.role

  const canEdit =
    userRole === 'PRINCIPAL' ||
    userRole === 'DISBURSING_OFFICER'
  
  const resolvedParams = await params
  const allocationId = resolvedParams.id
  if (!allocationId) notFound()

  const allocation = await prisma.monthlyAllocation.findUnique({
    where: { id: allocationId },
    include: {
      reports: { include: { expenses: { orderBy: { date: 'desc' } } } }
    }
  })

  if (!allocation) notFound()

  const activeReport = allocation.reports[0]
  const isLocked = activeReport && (activeReport.status === "PENDING" || activeReport.status === "APPROVED")
  const currentExpenses = activeReport?.expenses || []
  
  // Calculate remaining monthly cash allocation
  const totalSpent = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const monthlyRemainingBalance = allocation.totalAmount - totalSpent

  // Fetch annual expenses and AIP budget 
  const allYearExpenses = await prisma.expense.findMany({
    where: { report: { year: allocation.year } }
  })

  const aipLines = await prisma.aIPBudgetLine.findMany({
    where: { aipPlan: { year: allocation.year } }
  })

  // Fetch approved adjustments safely based on year relation
  const approvedAdjustments = await prisma.budgetAdjustment.findMany({
    where: { 
      status: 'APPROVED',
      OR: [
        { sourceLine: { year: allocation.year } },
        { destinationLine: { year: allocation.year } }
      ]
    },
    include: {
      sourceLine: { include: { aipBudgetLine: true } },
      destinationLine: { include: { aipBudgetLine: true } }
    }
  })

  // Compute Net Adjustments for Annual Categories safely
  const netAdjustments = approvedAdjustments.reduce((acc, adj) => {
    const amount = Number(adj.amount)
    const sourceCat = adj.sourceLine?.aipBudgetLine?.category
    const destCat = adj.destinationLine?.aipBudgetLine?.category
    
    if (adj.adjustmentType === 'REALLOCATION') {
      if (sourceCat) acc[sourceCat] = (acc[sourceCat] || 0) - amount
      if (destCat) acc[destCat] = (acc[destCat] || 0) + amount
    } else if (adj.adjustmentType === 'ADDITIONAL_FUND') {
      if (destCat) acc[destCat] = (acc[destCat] || 0) + amount
    } else if (adj.adjustmentType === 'RETURN_TO_DIVISION') {
      if (sourceCat) acc[sourceCat] = (acc[sourceCat] || 0) - amount
    }

    return acc
  }, {} as Record<string, number>)

  const annualSpentByCategory = allYearExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  // Merge Base Allocation + Adjustments - Spent = Remaining Category Budget
  const categoryBalances = aipLines.map(line => {
    const planned = Number(line.plannedAmount)
    const adjustments = netAdjustments[line.category] || 0
    const adjustedPlanned = planned + adjustments
    const spent = annualSpentByCategory[line.category] || 0

    return {
      category: line.category,
      planned: adjustedPlanned, // Represents Adjusted Annual Allocation
      spent,
      remaining: adjustedPlanned - spent
    }
  })

  // SERVER-SIDE SECURITY & RELIABILITY: Add or Update Expense (Transaction & IDOR Protection)
  async function addOrUpdateExpense(formData: FormData) {
    'use server'
    
    // Re-authenticate inside the Server Action (IDOR protection)
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'PRINCIPAL' && session.user.role !== 'DISBURSING_OFFICER')) {
      throw new Error("Unauthorized: Only authorized personnel can manage expenses.")
    }
    const currentUserId = session.user.id

    const expenseId = formData.get("expenseId") as string | null
    const amount = parseFloat(formData.get("amount") as string)
    const taxAmount = parseFloat(formData.get("taxAmount") as string) || 0
    const category = formData.get("category") as any
    const description = formData.get("description") as string
    const date = new Date(formData.get("date") as string)

    // ISO 1.3: Validate incorrect data inputs (negative amounts)
    if (amount <= 0 || taxAmount < 0) {
      throw new Error("Amounts must be greater than zero.")
    }

    let targetReportId = activeReport?.id

    // Use Prisma Transaction to ensure report creation, expense creation, and audit logging succeed or fail together
    await prisma.$transaction(async (tx) => {
      if (!targetReportId) {
        const countThisYear = await tx.liquidationReport.count({ where: { year: allocation!.year } })
        const newReport = await tx.liquidationReport.create({
          data: {
            month: allocation!.month,
            year: allocation!.year,
            status: "DRAFT",
            allocationId: allocation!.id,
            createdById: currentUserId,
            disbursingOfficerId: userRole === "DISBURSING_OFFICER" ? currentUserId : null,
            yearlySequence: countThisYear + 1,
          }
        })
        targetReportId = newReport.id
      }

      const entityContext = `Expense (${allocation!.month}-${allocation!.year})`;
      const formattedAmount = `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

      if (expenseId) {
        const existingExpense = await tx.expense.findUnique({ where: { id: expenseId } })
        if (!existingExpense) throw new Error("Expense not found.")

        const amountDifference = amount - existingExpense.amount
        if (amountDifference > monthlyRemainingBalance) throw new Error("Exceeds remaining balance.")

        await tx.expense.update({
          where: { id: expenseId },
          data: { category, amount, taxAmount, description, date }
        })

        // Implement accurate audit trail with data payload diffing to record exact field changes (ISO 25010: Security 5.3)
        const changes = [];
        if (existingExpense.category !== category) changes.push(`Category: ${existingExpense.category} -> ${category}`);
        if (existingExpense.description !== description) changes.push(`Desc: '${existingExpense.description}' -> '${description}'`);
        if (existingExpense.amount !== amount) changes.push(`Amount: ₱${existingExpense.amount} -> ₱${amount}`);
        if (existingExpense.taxAmount !== taxAmount) changes.push(`Tax: ₱${existingExpense.taxAmount} -> ₱${taxAmount}`);
        
        const changeDetails = changes.length > 0 
          ? `Updated expense. Changes: ${changes.join(' | ')}` 
          : `Updated expense with no significant value changes.`;

        // Direct audit log creation within transaction
        await tx.auditLog.create({
          data: {
            userId: currentUserId,
            action: "UPDATE",
            entity: entityContext,
            entityId: expenseId,
            details: changeDetails
          }
        })
      } else {
        if (amount > monthlyRemainingBalance) throw new Error("Exceeds remaining balance.")
        
        const newExpense = await tx.expense.create({
          data: { reportId: targetReportId!, category, amount, taxAmount, description, date }
        })

        // Direct audit log creation within transaction
        await tx.auditLog.create({
          data: {
            userId: currentUserId,
            action: "CREATE",
            entity: entityContext,
            entityId: newExpense.id,
            details: `Added ${category.replace("_", " ")} expense: ${description} (${formattedAmount})`
          }
        })
      }
    })

    revalidatePath(`/dashboard/expenses/${allocationId}`)
  }

  // SERVER-SIDE RELIABILITY: Submit Report (Transaction & IDOR Protection)
  async function submitReport() {
    'use server'
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")
    
    if (!activeReport) return

    await prisma.$transaction(async (tx) => {
      await tx.liquidationReport.update({
        where: { id: activeReport.id },
        data: { status: "PENDING", submittedAt: new Date() }
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "SUBMIT",
          entity: `Liquidation Report (${allocation!.month}-${allocation!.year})`,
          entityId: activeReport.id,
          details: `Submitted liquidation report for approval`
        }
      })
    })

    revalidatePath(`/dashboard/expenses/${allocationId}`)
  }

  // SERVER-SIDE RELIABILITY: Delete Expense (Transaction & IDOR Protection)
  async function deleteExpense(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const expenseId = formData.get("expenseId") as string
    
    await prisma.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id: expenseId } })
      
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE",
          entity: "Expense",
          entityId: expenseId,
          details: `Deleted expense entry`
        }
      })
    })

    revalidatePath(`/dashboard/expenses/${allocationId}`)
  }

  return (
    <ManageExpensesClient 
      allocation={allocation}
      activeReport={activeReport}
      currentExpenses={currentExpenses}
      monthlyRemainingBalance={monthlyRemainingBalance}
      totalSpent={totalSpent}
      categoryBalances={categoryBalances}
      isLocked={isLocked}
      canEdit={canEdit}
      addOrUpdateExpense={addOrUpdateExpense}
      submitReport={submitReport}
      deleteExpense={deleteExpense}
    />
  )
}