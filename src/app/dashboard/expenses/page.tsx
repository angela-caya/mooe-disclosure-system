import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export default async function ExpensesPage() {
  // Verify user session
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  // Fetch existing MOOE allocations from the database
  const allocations = await prisma.mooeAllocation.findMany({
    orderBy: { createdAt: 'desc' }
  })

  // Server Action: Handle form submission to create a new budget
  async function createAllocation(formData: FormData) {
    'use server'
    
    const month = formData.get('month') as string
    const amount = parseFloat(formData.get('amount') as string)

    if (month && amount) {
      await prisma.mooeAllocation.create({
        data: {
          month: month,
          totalAmount: amount,
        }
      })
      // Refresh the page data after saving
      revalidatePath('/dashboard/expenses')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Budget & Expenses</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form to Add New MOOE Allocation */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Budget</h3>
            <form action={createAllocation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month / Period</label>
                <input 
                  type="text" 
                  name="month"
                  placeholder="e.g., January 2026" 
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₱)</label>
                <input 
                  type="number" 
                  name="amount"
                  step="0.01"
                  placeholder="0.00" 
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Save Allocation
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Table displaying saved allocations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Recent Allocations</h3>
            </div>
            <div className="p-0">
              {allocations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No budget allocations recorded yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-600">
                      <th className="px-6 py-3 font-medium">Month</th>
                      <th className="px-6 py-3 font-medium">Total Amount</th>
                      <th className="px-6 py-3 font-medium">Date Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((allocation) => (
                      <tr key={allocation.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {allocation.month}
                        </td>
                        <td className="px-6 py-4 text-green-600 font-semibold">
                          ₱{allocation.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {allocation.createdAt.toLocaleDateString()}
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