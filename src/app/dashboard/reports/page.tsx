import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import ExportPdfButton from "./ExportPdfButton"

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  // Fetch available budgets for the dropdown menu
  const allocations = await prisma.mooeAllocation.findMany({
    orderBy: { createdAt: 'desc' }
  })

  // Fetch existing liquidation reports to display in the table
  const reports = await prisma.liquidationReport.findMany({
    include: { allocation: true }, // Includes the parent budget data
    orderBy: { dateIncurred: 'desc' }
  })

  // Server Action: Save the new expense to the database
  async function createExpense(formData: FormData) {
    'use server'
    
    const allocationId = formData.get('allocationId') as string
    const expenseType = formData.get('expenseType') as string
    const amountSpent = parseFloat(formData.get('amountSpent') as string)
    const description = formData.get('description') as string

    if (allocationId && expenseType && amountSpent) {
      await prisma.liquidationReport.create({
        data: {
          allocationId,
          expenseType,
          amountSpent,
          description,
        }
      })
      
      // Refresh both the reports page and the dashboard totals
      revalidatePath('/dashboard/reports')
      revalidatePath('/dashboard')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Liquidation Reports</h2>
        {/* Render the export button and pass the reports data to it */}
        <ExportPdfButton reports={reports} />
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
                        {a.month} (Balance: ₱{a.totalAmount})
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
                    <option value="Utilities">Utilities (Water, Light, etc.)</option>
                    <option value="Supplies">Office/School Supplies</option>
                    <option value="Travel">Travel Expenses</option>
                    <option value="Repairs">Repairs & Maintenance</option>
                    <option value="Other">Other Operating Expenses</option>
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

        {/* Right Column: Table displaying recent liquidations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Recent Expenses</h3>
            </div>
            <div className="p-0">
              {reports.length === 0 ? (
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
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {report.expenseType}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {report.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {report.allocation.month}
                        </td>
                        <td className="px-6 py-4 text-red-600 font-semibold">
                          ₱{report.amountSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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