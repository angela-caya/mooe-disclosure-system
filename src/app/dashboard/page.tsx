import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Calculate the Total MOOE Budget allocated
  const budgetAggregation = await prisma.mooeAllocation.aggregate({
    _sum: { totalAmount: true }
  })
  const totalBudget = budgetAggregation._sum.totalAmount || 0

  // Calculate the Total Expenses (Liquidation Reports)
  const expenseAggregation = await prisma.liquidationReport.aggregate({
    _sum: { amountSpent: true }
  })
  const totalExpenses = expenseAggregation._sum.amountSpent || 0

  // Compute Remaining Balance
  const remainingBalance = totalBudget - totalExpenses

  // Helper function to format numbers as Philippine Peso
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount)
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Welcome back, {session.user?.name}!
      </h2>
      
      <div className="mb-6">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Role: {(session.user as any)?.role}
        </span>
      </div>

      <p className="text-gray-600">
        This is your central hub for managing the school's Maintenance and Other Operating Expenses (MOOE). 
        Use the sidebar to navigate through budget allocations, track expenses, and generate liquidation reports.
      </p>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(totalBudget)}
          </p>
        </div>
        
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-500">Remaining Balance</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatCurrency(remainingBalance)}
          </p>
        </div>
      </div>
    </div>
  )
}