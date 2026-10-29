import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userRole = session.user.role
  const currentYear = new Date().getFullYear()

  // 1. Kumuha ng mabilisang stats para sa buong taon
  const annualAllocations = await prisma.monthlyAllocation.findMany({
    where: { year: currentYear },
    include: {
      reports: { include: { expenses: true } }
    }
  })

  const totalAnnualBudget = annualAllocations.reduce((sum, a) => sum + a.totalAmount, 0)
  const totalAnnualSpent = annualAllocations.reduce((sum, a) => {
    const report = a.reports[0]
    if (!report) return sum
    return sum + report.expenses.reduce((eSum, exp) => eSum + exp.amount, 0)
  }, 0)
  
  const remainingAnnualBudget = totalAnnualBudget - totalAnnualSpent
  const utilizationRate = totalAnnualBudget > 0 ? ((totalAnnualSpent / totalAnnualBudget) * 100).toFixed(1) : "0"

  // 2. Kumuha ng Pending tasks (Para sa Principal)
  const pendingReportsCount = await prisma.liquidationReport.count({ where: { status: "PENDING" } })
  const pendingAdjustmentsCount = await prisma.budgetAdjustment.count({ where: { status: "PENDING" } })

  // 3. Kunin ang latest na draft/pending ng Disbursing Officer
  const activeReports = await prisma.liquidationReport.findMany({
    where: { status: { in: ["DRAFT", "PENDING"] } },
    include: { allocation: true },
    orderBy: { month: 'asc' },
    take: 1
  })
  const currentActiveReport = activeReports[0]

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); 
    return d.toLocaleString('default', { month: 'long' })
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="bg-blue-900 text-white rounded-2xl p-8 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {session.user.name}!</h2>
          <p className="text-blue-200 mt-2 font-medium">
            {userRole === 'PRINCIPAL' 
              ? 'Here is the fiscal overview and your pending approval tasks.' 
              : 'Manage your monthly MOOE expenses and liquidation reports here.'}
          </p>
        </div>
        <div className="bg-blue-800 p-4 rounded-xl text-center min-w-[200px] border border-blue-700">
          <p className="text-xs text-blue-300 font-bold uppercase tracking-wider">FY {currentYear} Utilization</p>
          <p className="text-3xl font-black mt-1">{utilizationRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Downloaded Funds</h3>
          <p className="text-2xl font-black text-gray-900 mt-2">₱{totalAnnualBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-yellow-500">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Disbursed</h3>
          <p className="text-2xl font-black text-gray-900 mt-2">₱{totalAnnualSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 ${remainingAnnualBudget < 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Remaining Balance</h3>
          <p className={`text-2xl font-black mt-2 ${remainingAnnualBudget < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ₱{remainingAnnualBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* WIDGET PARA SA PRINCIPAL */}
        {userRole === 'PRINCIPAL' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900">Pending Approvals</h3>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <p className="font-bold text-blue-900">Liquidation Reports</p>
                  <p className="text-xs text-blue-700">Awaiting your review and signature.</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-blue-700">{pendingReportsCount}</span>
                  <Link href="/dashboard/approvals" className="text-sm bg-white text-blue-700 font-bold px-4 py-2 rounded shadow-sm border border-blue-200 hover:bg-blue-100 transition-colors">
                    Review
                  </Link>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div>
                  <p className="font-bold text-yellow-900">Budget Adjustments</p>
                  <p className="text-xs text-yellow-700">Requests for fund realignments.</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-yellow-700">{pendingAdjustmentsCount}</span>
                  <Link href="/dashboard/approvals" className="text-sm bg-white text-yellow-700 font-bold px-4 py-2 rounded shadow-sm border border-yellow-200 hover:bg-yellow-100 transition-colors">
                    Review
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET PARA SA DISBURSING OFFICER */}
        {userRole === 'DISBURSING_OFFICER' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900">Current Task</h3>
            </div>
            <div className="p-6">
              {currentActiveReport ? (
                <div className="p-5 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="font-bold text-gray-900 mb-1">
                    {getMonthName(currentActiveReport.month)} {currentActiveReport.year} Report
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Status: <span className="font-bold">{currentActiveReport.status}</span>
                  </p>
                  <Link 
                    href={`/dashboard/expenses/${currentActiveReport.allocationId}`} 
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm"
                  >
                    Continue Encoding &rarr;
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>All current reports have been approved or submitted.</p>
                  <Link href="/dashboard/expenses" className="text-blue-600 font-bold text-sm hover:underline mt-2 inline-block">
                    View all months
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* COMMON WIDGET: Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <Link href="/dashboard/expenses" className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-colors group">
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">💸</span>
              <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">Manage Expenses</span>
            </Link>
            
            <Link href="/" target="_blank" className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-colors group">
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌐</span>
              <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">View Public Board</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}