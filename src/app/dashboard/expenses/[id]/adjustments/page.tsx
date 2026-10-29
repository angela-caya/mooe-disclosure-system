import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../api/auth/[...nextauth]/route"
import { redirect, notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"
import Link from "next/link"

export default async function BudgetAdjustmentsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = session.user.id
  const userRole = session.user.role
  const resolvedParams = await params
  const allocationId = resolvedParams.id

  const allocation = await prisma.monthlyAllocation.findUnique({
    where: { id: allocationId },
  })

  if (!allocation) notFound()

  // Kunin ang mga budget lines para sa buwan na ito
  const monthlyBudgetLines = await prisma.monthlyBudgetLine.findMany({
    where: { month: allocation.month, year: allocation.year },
    include: { aipBudgetLine: true }
  })

  const lineIds = monthlyBudgetLines.map(line => line.id)

  // Kunin ang mga existing adjustment requests
  const adjustments = await prisma.budgetAdjustment.findMany({
    where: {
      OR: [
        { sourceLineId: { in: lineIds } },
        { destinationLineId: { in: lineIds } }
      ]
    },
    include: {
      sourceLine: { include: { aipBudgetLine: true } },
      destinationLine: { include: { aipBudgetLine: true } },
      requestedBy: true,
      approvedBy: true
    },
    orderBy: { createdAt: 'desc' }
  })

  // SERVER-SIDE SECURITY & RELIABILITY: Request Budget Adjustment (IDOR & Transaction Protection)
  async function requestAdjustment(formData: FormData) {
    'use server'
    
    // Re-authenticate inside the Server Action (IDOR protection)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'DISBURSING_OFFICER') {
      throw new Error("Unauthorized: Only Disbursing Officers can request adjustments.")
    }
    const currentUserId = session.user.id

    const sourceLineId = formData.get("sourceLineId") as string
    const destinationLineId = formData.get("destinationLineId") as string
    const amount = parseFloat(formData.get("amount") as string)
    const reason = formData.get("reason") as string

    // ISO 1.3: Validate incorrect data inputs (negative amounts)
    if (amount <= 0) {
      throw new Error("Amounts must be greater than zero.")
    }

    if (!sourceLineId || !destinationLineId || amount <= 0 || !reason) return

    // Execute database operations within a transaction to ensure all-or-nothing execution
    await prisma.$transaction(async (tx) => {
      const adjustment = await tx.budgetAdjustment.create({
        data: {
          adjustmentType: "REALLOCATION",
          sourceLineId,
          destinationLineId,
          amount,
          reason,
          requestedById: currentUserId,
          status: "PENDING"
        }
      })

      // Direct audit log creation within the transaction to guarantee consistency
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: "CREATE",
          entity: "BudgetAdjustment",
          entityId: adjustment.id,
          details: `Requested budget reallocation of ₱${amount} for Month ${allocation!.month}`
        }
      })
    })

    revalidatePath(`/dashboard/expenses/${allocationId}/adjustments`)
    revalidatePath(`/dashboard/expenses/${allocationId}`)
  }

  // SERVER-SIDE SECURITY & RELIABILITY: Process Budget Adjustment (IDOR & Transaction Protection)
  async function processAdjustment(formData: FormData) {
    'use server'
    
    // Re-authenticate inside the Server Action (IDOR protection)
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PRINCIPAL') {
      throw new Error("Unauthorized: Only Principals can approve or reject adjustments.")
    }
    const currentUserId = session.user.id

    const adjustmentId = formData.get("adjustmentId") as string
    const action = formData.get("action") as "APPROVED" | "REJECTED"

    // Execute database operations within a transaction to ensure all-or-nothing execution
    await prisma.$transaction(async (tx) => {
      await tx.budgetAdjustment.update({
        where: { id: adjustmentId },
        data: {
          status: action,
          approvedById: currentUserId
        }
      })

      // Direct audit log creation within the transaction to guarantee consistency
      await tx.auditLog.create({
        data: {
          userId: currentUserId,
          action: action === "APPROVED" ? "APPROVE" : "REJECT",
          entity: "BudgetAdjustment",
          entityId: adjustmentId,
          details: `${action} budget adjustment request for Month ${allocation!.month}`
        }
      })
    })

    revalidatePath(`/dashboard/expenses/${allocationId}/adjustments`)
    revalidatePath(`/dashboard/expenses/${allocationId}`)
  }

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' })
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href={`/dashboard/expenses/${allocationId}`} className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline mb-2 inline-block transition-colors">
            &larr; Back to Expenses
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Budget Adjustments: {getMonthName(allocation.month)} {allocation.year}
          </h2>
          <p className="text-sm text-gray-600 mt-1">Request and manage fund reallocations (e.g., pulling funds from Supplies to cover Utilities).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Adjustment Request Form */}
        {userRole === 'DISBURSING_OFFICER' && (
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">New Request</h3>
              
              <form action={requestAdjustment} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Source (Deduct From)</label>
                  <select name="sourceLineId" required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none cursor-pointer">
                    <option value="" disabled defaultValue="">-- Select Category --</option>
                    {monthlyBudgetLines.map(line => (
                      <option key={`src-${line.id}`} value={line.id}>
                        {line.aipBudgetLine.category.replace("_", " ")} (₱{Number(line.plannedAmount).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Destination (Add To)</label>
                  <select name="destinationLineId" required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none cursor-pointer">
                    <option value="" disabled defaultValue="">-- Select Category --</option>
                    {monthlyBudgetLines.map(line => (
                      <option key={`dst-${line.id}`} value={line.id}>
                        {line.aipBudgetLine.category.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount to Transfer (₱)</label>
                  <input type="number" name="amount" step="0.01" min="1" placeholder="0.00" required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reason / Justification</label>
                  <textarea name="reason" rows={3} placeholder="e.g. Higher utility bills due to intense summer heat..." required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 outline-none resize-none"></textarea>
                </div>
                
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-sm transition-all mt-4">
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Adjustments History Ledger */}
        <div className={`lg:col-span-${userRole === 'DISBURSING_OFFICER' ? '2' : '3'}`}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">Adjustment Ledger</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500 bg-white">
                    <th className="px-6 py-3 font-semibold">Date Requested</th>
                    <th className="px-6 py-3 font-semibold">Transfer Details</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    {userRole === 'PRINCIPAL' && <th className="px-6 py-3 font-semibold text-right">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 font-medium">No adjustments requested for this month.</td>
                    </tr>
                  ) : (
                    adjustments.map(adj => (
                      <tr key={adj.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {adj.createdAt.toLocaleDateString()}
                          <div className="text-xs text-gray-400 mt-0.5">by {adj.requestedBy.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">{adj.sourceLine?.aipBudgetLine.category.replace("_", " ")}</span>
                            <span className="text-gray-400">&rarr;</span>
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">{adj.destinationLine?.aipBudgetLine.category.replace("_", " ")}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2" title={adj.reason}>&quot;{adj.reason}&quot;</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          ₱{Number(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            adj.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                            adj.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}>
                            {adj.status}
                          </span>
                        </td>
                        {userRole === 'PRINCIPAL' && (
                          <td className="px-6 py-4 text-right">
                            {adj.status === 'PENDING' && (
                              <div className="flex justify-end gap-2">
                                <form action={processAdjustment}>
                                  <input type="hidden" name="adjustmentId" value={adj.id} />
                                  <input type="hidden" name="action" value="APPROVED" />
                                  <button type="submit" className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded transition-colors shadow-sm">
                                    Approve
                                  </button>
                                </form>
                                <form action={processAdjustment}>
                                  <input type="hidden" name="adjustmentId" value={adj.id} />
                                  <input type="hidden" name="action" value="REJECTED" />
                                  <button type="submit" className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1.5 rounded transition-colors shadow-sm">
                                    Reject
                                  </button>
                                </form>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}