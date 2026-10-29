import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../api/auth/[...nextauth]/route"
import { redirect, notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"
import Link from "next/link"

export default async function EditExpensePage({
  params
}: {
  params: Promise<{ id: string, expenseId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'DISBURSING_OFFICER') {
    redirect('/login')
  }

  const resolvedParams = await params
  const { id: allocationId, expenseId } = resolvedParams

  // 1. Kunin ang Expense at siguraduhing hindi pa naka-lock ang Report
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { report: true }
  })

  // Idinagdag ang "return" para malaman ng TypeScript na hihinto na ang execution dito
  if (!expense || !expense.report) {
    return notFound()
  }

  // Kapag PENDING o APPROVED na, bawal na i-edit.
  if (expense.report.status === "PENDING" || expense.report.status === "APPROVED") {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center mt-10 bg-white rounded-xl shadow-sm border border-red-200">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">You cannot edit this expense because the liquidation report has already been submitted or approved.</p>
        <Link href={`/dashboard/expenses/${allocationId}`} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
          &larr; Back to Expenses
        </Link>
      </div>
    )
  }

  // I-extract ang report ID sa labas ng Server Action para ligtas basahin ng TypeScript
  const reportId = expense.report.id
  const reportMonth = expense.report.month
  const reportYear = expense.report.year

  async function updateExpense(formData: FormData) {
    'use server'
    const amount = parseFloat(formData.get("amount") as string)
    const taxAmount = parseFloat(formData.get("taxAmount") as string) || 0
    const category = formData.get("category") as any
    const description = formData.get("description") as string
    const date = new Date(formData.get("date") as string)

    // ISO 1.3: Validate incorrect data inputs (negative amounts)
    if (amount <= 0 || taxAmount < 0) {
      throw new Error("Amounts must be greater than zero.")
    }

    await prisma.expense.update({
      where: { id: expenseId },
      data: { category, amount, taxAmount, description, date }
    })

    // Recalculate Total Tax for the Report gamit ang na-extract na reportId
    const allExpenses = await prisma.expense.findMany({
      where: { reportId: reportId }
    })
    const totalTax = allExpenses.reduce((sum, exp) => sum + (exp.taxAmount || 0), 0)

    await prisma.liquidationReport.update({
      where: { id: reportId },
      data: { birDeduction: totalTax }
    })

    await logSystemAction(
      session!.user.id,
      "UPDATE",
      `Expense (${reportMonth}-${reportYear})`,
      expenseId,
      `Updated expense details: ${description} (₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})`
    )

    revalidatePath(`/dashboard/expenses/${allocationId}`)
    redirect(`/dashboard/expenses/${allocationId}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      
      <div className="mb-6">
        <Link href={`/dashboard/expenses/${allocationId}`} className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline mb-2 inline-block transition-colors">
          &larr; Back to Expenses
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Expense Record</h2>
        <p className="text-sm text-gray-600 mt-1">Update the details of the selected receipt or disbursement.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
        <form action={updateExpense} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="expenseDate" className="block text-sm font-semibold text-gray-700 mb-1">Date on Receipt</label>
              <input id="expenseDate" type="date" name="date" required defaultValue={expense.date.toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div>
              <label htmlFor="expenseCategory" className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <select id="expenseCategory" name="category" required defaultValue={expense.category} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                <option value="UTILITIES">Utilities</option>
                <option value="SUPPLIES">Supplies & Materials</option>
                <option value="MINOR_REPAIRS">Minor Repairs</option>
                <option value="TRAVEL">Travel Expenses</option>
                <option value="TRAINING">Training & Seminars</option>
                <option value="OTHERS">Others</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="expenseDesc" className="block text-sm font-semibold text-gray-700 mb-1">Description / Payee</label>
            <input id="expenseDesc" type="text" name="description" required defaultValue={expense.description} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="expenseAmount" className="block text-sm font-semibold text-gray-700 mb-1">Gross Amount (₱)</label>
              <input id="expenseAmount" type="number" name="amount" step="0.01"  min="0.01" required defaultValue={expense.amount} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div>
              <label htmlFor="expenseTax" className="block text-sm font-semibold text-gray-700 mb-1">BIR Tax Withheld (₱)</label>
              <input id="expenseTax" type="number" name="taxAmount" step="0.01"  min="0" defaultValue={expense.taxAmount} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <Link href={`/dashboard/expenses/${allocationId}`} className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-lg transition-colors border border-gray-300">
              Cancel
            </Link>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition-all">
              Save Changes
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}