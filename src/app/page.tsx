import prisma from "@/lib/prisma"
import Link from "next/link"
import YearFilter from "@/src/components/YearFilter"

export const dynamic = "force-dynamic"

export default async function PublicTransparencyBoard({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const resolvedSearchParams = await searchParams

  const dbYears = await prisma.liquidationReport.findMany({
    where: { status: "APPROVED" },
    distinct: ['year'],
    select: { year: true },
    orderBy: { year: 'desc' }
  })
  
  const availableYears = dbYears.map(d => d.year)
  const currentRealYear = new Date().getFullYear()
  
  if (!availableYears.includes(currentRealYear)) availableYears.push(currentRealYear)
  availableYears.sort((a, b) => b - a)

  const defaultYear = availableYears.length > 0 ? availableYears[0] : currentRealYear
  const displayYear = resolvedSearchParams.year ? parseInt(resolvedSearchParams.year, 10) : defaultYear

  const yearlyAllocations = await prisma.monthlyAllocation.findMany({
    where: { year: displayYear }
  })
  const totalAnnualAllocation = yearlyAllocations.reduce((sum, alloc) => sum + alloc.totalAmount, 0)

  const activeYearReports = await prisma.liquidationReport.findMany({
    where: { 
      status: "APPROVED",
      year: displayYear 
    },
    include: {
      allocation: true,
      expenses: true,
      disbursingOfficer: { select: { name: true } }
    },
    orderBy: [
      { month: 'desc' }
    ]
  })

  const totalAnnualSpent = activeYearReports.reduce((sum, r) => 
    sum + r.expenses.reduce((eSum, e) => eSum + e.amount, 0)
  , 0)
  
  const annualUtilizationRate = totalAnnualAllocation > 0 
    ? ((totalAnnualSpent / totalAnnualAllocation) * 100).toFixed(1) 
    : 0

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); 
    return d.toLocaleString('default', { month: 'long' })
  }

  const annualCategoryBreakdown = activeYearReports.reduce((acc: any, report) => {
    report.expenses.forEach(exp => {
      const cat = exp.category.replace("_", " ");
      acc[cat] = (acc[cat] || 0) + exp.amount;
    });
    return acc;
  }, {});

  const chartData = Object.entries(annualCategoryBreakdown)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

  const chartColors = ['bg-blue-600', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      
      <header className="bg-blue-900 text-white py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-xl">
              BC
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Biñan City Senior High School - West Campus</h1>
              <p className="text-blue-200 text-sm font-medium">Digital MOOE Transparency Board</p>
            </div>
          </div>
          <Link href="/login" className="text-sm font-bold bg-white text-blue-900 px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition-colors">
            Admin Login
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-200 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Transparency Dashboard</h2>
            <p className="text-xs text-gray-500 font-medium">Select a fiscal year to view public financial records</p>
          </div>
          <div className="w-full sm:w-auto">
            <YearFilter availableYears={availableYears} currentYear={displayYear} />
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
          
          <div className="flex flex-col justify-center lg:col-span-1 border-b lg:border-b-0 lg:border-r border-gray-100 pb-6 lg:pb-0 lg:pr-6">
            <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">Fiscal Year {displayYear} Summary</h2>
            <p className="text-4xl font-black text-gray-900">₱{totalAnnualSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-gray-500 font-medium mt-1 mb-6">Total MOOE Funds Disbursed & Liquidated</p>
            
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-gray-700">Utilization Rate</span>
                <span className="text-xl font-black text-blue-700">{annualUtilizationRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${annualUtilizationRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Based on ₱{totalAnnualAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })} Released Allocation</p>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-center">
            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Annual Expense Breakdown</h3>
            
            {chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 font-medium py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                No expense data available for visualization.
              </div>
            ) : (
              <div className="space-y-4">
                {chartData.map((item, index) => {
                  const percentage = totalAnnualSpent > 0 ? (item.value / totalAnnualSpent) * 100 : 0;
                  const barColor = chartColors[index % chartColors.length];
                  
                  return (
                    <div key={item.name} className="flex flex-col group cursor-default">
                      <div className="flex justify-between text-sm mb-1.5 items-end">
                        <span className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">{item.name}</span>
                        <div className="text-right">
                          <span className="font-black text-gray-900">₱{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 text-xs font-semibold ml-2 inline-block w-10">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                        <div 
                          className={`h-2.5 rounded-full ${barColor} transition-all duration-1000 ease-out group-hover:opacity-80`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-6 mt-8 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Approved Liquidation Reports</h2>
              <p className="text-gray-600 text-sm mt-1">Publicly disclosed financial records as mandated by DepEd Order No. 008, s. 2019.</p>
            </div>
          </div>

          {activeYearReports.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <span className="text-4xl mb-3 block">📄</span>
              <p className="font-bold text-gray-700 text-lg">No approved reports published for {displayYear}.</p>
              <p className="text-gray-500 text-sm mt-1">Check back later once the Principal approves the monthly liquidations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeYearReports.map((report) => {
                const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0)
                const monthlyAllocation = report.allocation.totalAmount 
                
                const expensesByCategory = report.expenses.reduce((acc: any, exp) => {
                  const cat = exp.category.replace("_", " ")
                  acc[cat] = (acc[cat] || 0) + exp.amount
                  return acc
                }, {})

                return (
                  <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{getMonthName(report.month)} {report.year}</h3>
                        <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 block"></span>
                          VERIFIED & POSTED
                        </p>
                      </div>
                      <span className="text-xs font-bold text-gray-500 border border-gray-300 px-2 py-1 rounded bg-white">
                        {report.fundPurpose}
                      </span>
                    </div>

                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Monthly Allocation</p>
                          <p className="text-lg font-bold text-gray-600">₱{monthlyAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Amount Spent</p>
                          <p className="text-2xl font-black text-gray-900">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Expense Breakdown</p>
                        {Object.entries(expensesByCategory).sort(([,a]: any, [,b]: any) => b - a).slice(0, 3).map(([cat, amount]: any) => (
                          <div key={cat} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 truncate pr-2 font-medium">{cat}</span>
                            <span className="font-bold text-gray-900 shrink-0">₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        {Object.keys(expensesByCategory).length > 3 && (
                          <p className="text-xs text-blue-600 font-bold italic pt-1">+ {Object.keys(expensesByCategory).length - 3} more categories</p>
                        )}
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          <span className="block font-bold">Approved on:</span>
                          {report.approvedAt ? report.approvedAt.toLocaleDateString() : 'N/A'}
                        </div>
                        <Link href={`/transparency/${report.id}`} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                          View Full Details &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </main>

      <footer className="bg-gray-100 border-t border-gray-200 mt-12 py-8 text-center px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-gray-500 leading-relaxed font-medium">
            <strong>Transparency & Legal Compliance:</strong> This Public Transparency Board strictly complies with DepEd Order No. 008, s. 2019 and Freedom of Information (FOI) mandates. Only official public expenditures and government official signatories are displayed. No sensitive personal information is processed or disclosed, ensuring full compliance with the Data Privacy Act of 2012 (R.A. 10173).
          </p>
          <p className="text-xs text-gray-400 mt-4">
            &copy; {currentRealYear} Biñan City Senior High School - West Campus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}