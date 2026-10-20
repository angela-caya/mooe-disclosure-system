import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../api/auth/[...nextauth]/route"
import { redirect, notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"
import Link from "next/link"

export default async function ManageExpensesPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'DISBURSING_OFFICER') {
    redirect('/login');
  }
  const userId = session.user.id;

  // Await the asynchronous route parameters to safely extract the ID
  const resolvedParams = await params
  const allocationId = resolvedParams.id

  if (!allocationId) {
    notFound()
  }

  // Retrieve the allocation and its associated liquidation report
  const allocation = await prisma.monthlyAllocation.findUnique({
    where: { id: allocationId },
    include: {
      reports: {
        include: { expenses: { orderBy: { date: 'desc' } } }
      }
    }
  })

  if (!allocation) notFound()

  // Determine active report state and calculate current budget utilization
  const activeReport = allocation.reports[0]
  const isLocked = activeReport && (activeReport.status === "PENDING" || activeReport.status === "APPROVED")
  
  const currentExpenses = activeReport?.expenses || []
  const totalSpent = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const remainingBalance = allocation.totalAmount - totalSpent

  // Process incoming itemized expenses and enforce budget limits
  async function addExpense(formData: FormData) {
    'use server'
    
    const amount = parseFloat(formData.get("amount") as string)
    const category = formData.get("category") as any
    const description = formData.get("description") as string
    const date = new Date(formData.get("date") as string)

    // Security protocol: Prevent submissions if budget is exceeded
    if (amount > remainingBalance) return

    let targetReportId = activeReport?.id

    // Initialize a new draft report if this is the first expense for the allocation
    if (!targetReportId) {
      const newReport = await prisma.liquidationReport.create({
        data: {
          month: allocation!.month,
          year: allocation!.year,
          status: "DRAFT",
          allocationId: allocation!.id,
          disbursingOfficerId: userId,
        }
      })
      targetReportId = newReport.id
    }

    // Persist the expense record
    const newExpense = await prisma.expense.create({
      data: {
        reportId: targetReportId,
        category,
        amount,
        description,
        date,
      }
    })

    // Record the data entry event in the immutable system ledger
    await logSystemAction(
      userId,
      "CREATE",
      "Expense",
      newExpense.id,
      `Added ${category.replace("_", " ")} expense: ₱${amount.toLocaleString()} for Month ${allocation!.month}`
    )

    revalidatePath(`/dashboard/expenses/${allocationId}`)
  }

  // Finalize the draft report and escalate it to the Principal for approval
  async function submitReport() {
    'use server'
    
    if (!activeReport) return

    await prisma.liquidationReport.update({
      where: { id: activeReport.id },
      data: {
        status: "PENDING",
        submittedAt: new Date()
      }
    })

    // Record the formal submission in the audit trail
    await logSystemAction(
      userId,
      "SUBMIT",
      "LiquidationReport",
      activeReport.id,
      `Forwarded liquidation report for Month ${allocation!.month}, Year ${allocation!.year} to the Principal for review.`
    )

    revalidatePath(`/dashboard/expenses/${allocationId}`)
  }

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' })
  }

  // Process the deletion of a single expense entry during the draft phase
  async function deleteExpense(formData: FormData) {
    'use server'
    const expenseId = formData.get("expenseId") as string;
    
    await prisma.expense.delete({
      where: { id: expenseId }
    });

    await logSystemAction(
      session!.user.id,
      "DELETE",
      "Expense",
      expenseId,
      `Deleted an expense entry from a draft liquidation report`
    );

    revalidatePath(`/dashboard/expenses/${allocationId}`);
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <Link href="/dashboard/expenses" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Allocations
          </Link>
          <h2 className="text-2xl font-bold text-gray-800">
            Manage Expenses: {getMonthName(allocation.month)} {allocation.year}
          </h2>
        </div>
        <div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border ${isLocked ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
            Status: {activeReport?.status || 'DRAFT'}
          </span>
        </div>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Total Allocation</p>
          <p className="text-2xl font-black text-gray-800 mt-1">₱{allocation.totalAmount.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-yellow-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Total Disbursed</p>
          <p className="text-2xl font-black text-gray-800 mt-1">₱{totalSpent.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Remaining Balance</p>
          <p className="text-2xl font-black text-gray-800 mt-1">₱{remainingBalance.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Data Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Record Receipt</h3>
            
            {isLocked ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm font-medium border border-yellow-200">
                This report has been submitted to the Principal and is locked for editing.
              </div>
            ) : (
              <form action={addExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date on Receipt</label>
                  <input type="date" name="date" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select name="category" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="UTILITIES">Utilities</option>
                    <option value="SUPPLIES">Supplies & Materials</option>
                    <option value="MINOR_REPAIRS">Minor Repairs</option>
                    <option value="TRAVEL">Travel Expenses</option>
                    <option value="TRAINING">Training & Seminars</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description / Payee</label>
                  <input type="text" name="description" placeholder="e.g. Meralco Bill" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₱)</label>
                  <input type="number" name="amount" step="0.01" max={remainingBalance} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-500 mt-1">Maximum allowed: ₱{remainingBalance.toLocaleString()}</p>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors mt-2">
                  + Add Expense
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Itemized Expenses Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Itemized Breakdown</h3>
              
              <div className="flex gap-2">
                <Link 
                  href={`/dashboard/expenses/${allocationId}/print`}
                  target="_blank"
                  className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold rounded shadow-sm transition-colors"
                >
                  🖨️ Print PDF
                </Link>

                {!isLocked && activeReport && (
                  <form action={submitReport}>
                    <button type="submit" className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow-sm transition-colors">
                      Submit to Principal &rarr;
                    </button>
                  </form>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500 bg-white">
                    <th className="px-6 py-3 font-bold">Date</th>
                    <th className="px-6 py-3 font-bold">Category</th>
                    <th className="px-6 py-3 font-bold">Description</th>
                    <th className="px-6 py-3 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {currentExpenses?.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{exp.date.toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold text-gray-700">{exp.category.replace("_", " ")}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{exp.description}</td>
                      <td className="px-6 py-4 text-right text-red-600 font-bold">
                        ₱{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      {!isLocked && (
                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                          <Link 
                            href={`/dashboard/expenses/${allocationId}/edit/${exp.id}`}
                            className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded transition-colors" 
                            title="Edit Expense"
                          >
                            ✏️
                          </Link>
                          <form action={deleteExpense}>
                            <input type="hidden" name="expenseId" value={exp.id} />
                            <button type="submit" className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors" title="Delete Expense">
                              🗑️
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-5 text-right font-bold text-gray-800 uppercase tracking-wide">Total Disbursed:</td>
                    <td className="px-6 py-5 text-right font-black text-xl text-gray-800 border-t-2 border-gray-200">
                      ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    {!isLocked && <td className="bg-gray-50 border-t-2 border-gray-200"></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}