import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { logSystemAction } from "@/lib/auditLogger"
import Link from "next/link"

export default async function PrincipalApprovalInbox() {
  const session = await getServerSession(authOptions)
  
  // Mahigpit na security: PRINCIPAL role lang ang pwedeng makapasok dito
  if (!session || session.user.role !== 'PRINCIPAL') {
    redirect('/dashboard') 
  }

  const userId = session.user.id

  const pendingReports = await prisma.liquidationReport.findMany({
    where: { status: "PENDING" },
    include: {
      allocation: true,
      disbursingOfficer: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      expenses: true
    },
    orderBy: { submittedAt: 'desc' }
  })

  const pendingAdjustments = await prisma.budgetAdjustment.findMany({
    where: { status: "PENDING" },
    include: {
      sourceLine: { include: { aipBudgetLine: true } },
      destinationLine: { include: { aipBudgetLine: true } },
      requestedBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  // SERVER-SIDE SECURITY: Process Liquidation Report (IDOR & Transaction Protection)
  async function processReport(formData: FormData) {
    'use server'
    
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PRINCIPAL') {
      throw new Error("Unauthorized: Only Principals can approve reports.")
    }

    const userId = session.user.id
    const reportId = formData.get("reportId") as string
    const action = formData.get("action") as string

    if (action !== "APPROVED" && action !== "REJECTED") {
      throw new Error("Invalid action request.")
    }

    const report = await prisma.liquidationReport.findUnique({
      where: { id: reportId },
      include: { allocation: true }
    })

    if (!report || report.status !== "PENDING") {
      throw new Error("Report is no longer pending or does not exist.")
    }

    // Execute database operations within a transaction to ensure all-or-nothing execution
    await prisma.$transaction(async (tx) => {
      await tx.liquidationReport.update({
        where: { id: reportId },
        data: { 
          status: action, 
          approvedAt: action === "APPROVED" ? new Date() : null,
          ...(action === "REJECTED" && { status: "DRAFT", remarks: "Returned for revision by Principal" })
        }
      });

      // Direct audit log creation within the transaction to guarantee consistency
      await tx.auditLog.create({
        data: {
          userId: userId,
          action: action === "APPROVED" ? "APPROVE" : "REJECT",
          entity: `Liquidation Report (${report.allocation.month}-${report.allocation.year})`,
          entityId: reportId,
          details: `Principal ${action.toLowerCase()} the liquidation report.`
        }
      });
    });

    revalidatePath('/dashboard/approvals')
    revalidatePath('/dashboard/principal')
    if (action === "APPROVED") {
      revalidatePath('/', 'layout')
    }
  }

  // SERVER-SIDE SECURITY: Process Budget Adjustment (IDOR & Transaction Protection)
  async function processAdjustment(formData: FormData) {
    'use server'
    
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PRINCIPAL') {
      throw new Error("Unauthorized: Only Principals can approve adjustments.")
    }

    const userId = session.user.id
    const adjustmentId = formData.get("adjustmentId") as string
    const action = formData.get("action") as string

    if (action !== "APPROVED" && action !== "REJECTED") {
      throw new Error("Invalid action request.")
    }

    const adjustment = await prisma.budgetAdjustment.findUnique({
      where: { id: adjustmentId }
    })

    if (!adjustment || adjustment.status !== "PENDING") {
      throw new Error("Adjustment request is no longer pending or does not exist.")
    }

    // Execute database operations within a transaction to ensure all-or-nothing execution
    await prisma.$transaction(async (tx) => {
      await tx.budgetAdjustment.update({
        where: { id: adjustmentId },
        data: {
          status: action,
          approvedById: userId
        }
      });

      // Direct audit log creation within the transaction to guarantee consistency
      await tx.auditLog.create({
        data: {
          userId: userId,
          action: action === "APPROVED" ? "APPROVE" : "REJECT",
          entity: "BudgetAdjustment",
          entityId: adjustmentId,
          details: `Principal ${action.toLowerCase()} the budget adjustment request.`
        }
      });
    });

    revalidatePath('/dashboard/approvals')
    if (action === "APPROVED") {
      revalidatePath('/', 'layout')
    }
  }

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); 
    return d.toLocaleString('default', { month: 'long' })
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Principal's Approval Inbox</h2>
        <p className="text-sm text-gray-600 mt-1">Review and manage pending liquidation reports and budget adjustment requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PENDING LIQUIDATION REPORTS SECTION */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50 flex justify-between items-center">
            <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
              <span>📋</span> Pending Liquidation Reports
            </h3>
            <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
              {pendingReports.length}
            </span>
          </div>
          
          <div className="p-6 flex-1 bg-gray-50/50">
            {pendingReports.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium">
                No pending reports for review.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReports.map(report => {
                  const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0)
                  return (
                    <div key={report.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">
                            {getMonthName(report.month)} {report.year}
                          </h4>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Prepared by: {
                              report.createdBy?.name ||
                              report.disbursingOfficer?.name ||
                              report.createdBy?.email ||
                              report.disbursingOfficer?.email ||
                              "Not specified"
                            }
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-500 uppercase">Gross Amount</p>
                          <p className="font-black text-blue-700 text-lg">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        <Link href={`/dashboard/expenses/${report.allocationId}/print-view`} target="_blank" className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded transition-colors">
                          📄 Review Appendix 44
                        </Link>
                        
                        <form action={processReport} className="flex-1 flex gap-2">
                          <input type="hidden" name="reportId" value={report.id} />
                          <button type="submit" name="action" value="APPROVED" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded transition-colors cursor-pointer shadow-sm">
                            Approve
                          </button>
                          <button type="submit" name="action" value="REJECTED" className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-2 rounded transition-colors cursor-pointer">
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* PENDING BUDGET ADJUSTMENTS SECTION */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50 flex justify-between items-center">
            <h3 className="font-bold text-yellow-900 text-lg flex items-center gap-2">
              <span>⚖️</span> Pending Adjustments
            </h3>
            <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
              {pendingAdjustments.length}
            </span>
          </div>
          
          <div className="p-6 flex-1 bg-gray-50/50">
            {pendingAdjustments.length === 0 ? (
              <div className="text-center py-10 text-gray-500 font-medium">
                No budget adjustments pending.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAdjustments.map(adj => (
                  <div key={adj.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-yellow-400">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Request Type</span>
                        <span className="font-bold text-gray-800 text-sm">{adj.adjustmentType.replace("_", " ")}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Amount</span>
                        <p className="font-black text-gray-900 text-lg">₱{Number(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded border border-gray-100 mb-3 text-sm flex items-center gap-2">
                      <span className="text-red-600 font-semibold">{adj.sourceLine?.aipBudgetLine.category.replace("_", " ") || "External"}</span>
                      <span className="text-gray-400">&rarr;</span>
                      <span className="text-green-600 font-semibold">{adj.destinationLine?.aipBudgetLine.category.replace("_", " ")}</span>
                    </div>

                    <p className="text-xs text-gray-600 italic mb-4">
                      <span className="font-semibold not-italic">Justification:</span> "{adj.reason}"
                      <br/>
                      <span className="text-gray-400 text-[10px] not-italic mt-1 block">— Requested by {adj.requestedBy.name}</span>
                    </p>
                    
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <form action={processAdjustment} className="w-full flex gap-2">
                        <input type="hidden" name="adjustmentId" value={adj.id} />
                        <button type="submit" name="action" value="APPROVED" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded transition-colors cursor-pointer shadow-sm">
                          Approve Transfer
                        </button>
                        <button type="submit" name="action" value="REJECTED" className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-2 rounded transition-colors cursor-pointer">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}