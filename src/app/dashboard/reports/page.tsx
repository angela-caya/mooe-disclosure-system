import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import ExportPdfButton from "./ExportPdfButton"

export default async function ReportsPage() {
  // Validate session for route protection
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    redirect('/login')
  }

  const currentUserId = session.user.id;

  // Fetch available budgets from the updated MonthlyAllocation model
  const allocations = await prisma.monthlyAllocation.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  })

  // Fetch itemized expenses and their parent relations
  const rawExpenses = await prisma.expense.findMany({
    include: { 
      report: { 
        include: { allocation: true } 
      } 
    },
    orderBy: { date: 'desc' }
  })

  // Data Transformation: Map the new relational data back into the flat format 
  // expected by your existing ExportPdfButton component.
  const formattedReports = rawExpenses.map((exp) => ({
    id: exp.id,
    expenseType: exp.category,
    description: exp.description,
    amountSpent: exp.amount,
    allocation: {
      month: `${exp.report.month}/${exp.report.year}`, // Fallback string representation
      totalAmount: exp.report.allocation.totalAmount
    }
  }))

  // Server Action: Save the new expense into the relational database architecture
  async function createExpense(formData: FormData) {
    'use server'
    
    const allocationId = formData.get('allocationId') as string
    const expenseType = formData.get('expenseType') as "UTILITIES" | "SUPPLIES" | "MINOR_REPAIRS" | "TRAVEL" | "TRAINING" | "OTHERS"
    const amountSpent = parseFloat(formData.get('amountSpent') as string)
    const description = formData.get('description') as string

    if (allocationId && expenseType && amountSpent) {
      
      // Retrieve the parent allocation context
      const allocation = await prisma.monthlyAllocation.findUnique({
        where: { id: allocationId }
      });

      if (!allocation) return;

      // Locate an existing report container for this allocation, or initialize a new draft
      let report = await prisma.liquidationReport.findFirst({
        where: { allocationId }
      });

      if (!report) {
        report = await prisma.liquidationReport.create({
          data: {
            month: allocation.month,
            year: allocation.year,
            allocationId,
            status: "DRAFT",
            disbursingOfficerId: currentUserId,
          }
        });
      }

      // Record the specific itemized expense mapped to the report
      await prisma.expense.create({
        data: {
          reportId: report.id,
          category: expenseType,
          amount: amountSpent,
          description: description || "Unspecified",
          date: new Date()
        }
      });
      
      // Invalidate cache to refresh the UI immediately
      revalidatePath('/dashboard/reports')
      revalidatePath('/dashboard')
    }
  }

  // Helper for displaying human-readable months in the dropdown
  const getMonthName = (monthNum: number) => {
    const d = new Date();
    d.setMonth(monthNum - 1);
    return d.toLocaleString('default', { month: 'long' });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Liquidation Reports</h2>
        {/* Pass the transformed data that satisfies the component's strict typing */}
        <ExportPdfButton reports={formattedReports as any} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form to Record New Expense */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Record Expense</h3>
            
            {allocations.length === 0 ? (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                Please add a Budget Allocation first before recording an expense.
              </p>
            ) : (
              <form action={createExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Budget Month</label>
                  <select 
                    name="allocationId" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">-- Choose Allocation --</option>
                    {allocations.map(a => (
                      <option key={a.id} value={a.id}>
                        {getMonthName(a.month)} {a.year} (Budget: ₱{a.totalAmount})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category</label>
                  <select 
                    name="expenseType" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">-- Choose Category --</option>
                    <option value="UTILITIES">Utilities (Water, Light, etc.)</option>
                    <option value="SUPPLIES">Office/School Supplies</option>
                    <option value="TRAVEL">Travel Expenses</option>
                    <option value="MINOR_REPAIRS">Repairs & Maintenance</option>
                    <option value="TRAINING">Training & Seminars</option>
                    <option value="OTHERS">Other Operating Expenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Spent (₱)</label>
                  <input 
                    type="number" 
                    name="amountSpent"
                    step="0.01"
                    placeholder="0.00" 
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea 
                    name="description"
                    rows={2}
                    placeholder="e.g., Meralco Bill, Bond paper..." 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Save Liquidation
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Table displaying itemized liquidations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Recent Expenses</h3>
            </div>
            <div className="p-0">
              {rawExpenses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No expenses recorded yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-600">
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Budget Month</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawExpenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {exp.category.replace("_", " ")}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {exp.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {getMonthName(exp.report.month)} {exp.report.year}
                        </td>
                        <td className="px-6 py-4 text-red-600 font-semibold">
                          ₱{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}