import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import YearFilter from "@/src/components/YearFilter";

export const dynamic = "force-dynamic";

export default async function PrincipalDashboard({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>
}) {
  // Authenticate user session and enforce administrative access control
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PRINCIPAL") {
    redirect("/login");
  }

  // Resolve asynchronous search parameters to determine the selected fiscal year
  const resolvedSearchParams = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = resolvedSearchParams.year ? parseInt(resolvedSearchParams.year, 10) : currentYear;

  // Retrieve distinct fiscal years from the database to populate the filter dropdown
  const dbYears = await prisma.monthlyAllocation.findMany({
    distinct: ['year'],
    select: { year: true },
    orderBy: { year: 'desc' }
  });
  
  const availableYears = dbYears.map(d => d.year);
  if (!availableYears.includes(currentYear)) availableYears.push(currentYear);
  availableYears.sort((a, b) => b - a);

  // Calculate the total budget allocation for the selected fiscal year
  const allocations = await prisma.monthlyAllocation.findMany({
    where: { year: selectedYear }
  });
  const totalBudget = allocations.reduce((sum, alloc) => sum + alloc.totalAmount, 0);

  // Fetch approved liquidation reports and calculate total disbursed funds
  const allApprovedReports = await prisma.liquidationReport.findMany({
    where: { year: selectedYear, status: "APPROVED" },
    include: { 
      allocation: true,
      disbursingOfficer: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true }, },
      expenses: true 
    },
    orderBy: { approvedAt: 'desc' }
  });

  const totalDisbursed = allApprovedReports.reduce((sum, report) => {
    return sum + report.expenses.reduce((s, exp) => s + exp.amount, 0);
  }, 0);

  const remainingBalance = totalBudget - totalDisbursed;
  const utilizationRate = totalBudget > 0 ? (totalDisbursed / totalBudget) * 100 : 0;
  const approvedCount = allApprovedReports.length;
  
  const recentApprovedReports = allApprovedReports.slice(0, 5);

  // Fetch pending liquidation reports requiring administrative review
  const pendingReports = await prisma.liquidationReport.findMany({
    where: { status: "PENDING" },
    include: {
      allocation: true,
      disbursingOfficer: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      expenses: true
    },
    orderBy: { submittedAt: 'asc' }
  });

  // Format numeric values into standard Philippine Peso currency strings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  // Convert numeric month representation into a localized string
  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' });
  };

  // UX FIX: Monochromatic Chopped Line (UX nung una)
  const getProgressSegments = () => {
    const sortedReports = [...allApprovedReports].sort((a, b) => a.allocation.month - b.allocation.month);

    return sortedReports.map((report) => {
      const reportTotal = report.expenses.reduce((s, exp) => s + exp.amount, 0);
      const percentage = totalBudget > 0 ? (reportTotal / totalBudget) * 100 : 0;
      return {
        id: report.id,
        month: getMonthName(report.allocation.month),
        year: report.allocation.year,
        amount: reportTotal,
        percentage,
        color: 'bg-yellow-500' // Single uniform color
      };
    });
  };
  
  const segments = getProgressSegments();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Principal Dashboard</h1>
          <p className="text-gray-600 mt-1 text-sm">Executive Overview and Approvals</p>
        </div>
        <div className="flex gap-3">
          {/* UX: Added lift animation and pointer to primary top actions */}
          <Link 
            href="/transparency" 
            target="_blank" 
            className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm flex items-center"
          >
            🌐 Public Board
          </Link>
          <Link 
            href="/dashboard/audit/" 
            className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm flex items-center"
          >
            📜 Audit Logs
          </Link>
        </div>
      </div>

      <YearFilter availableYears={availableYears} currentYear={currentYear} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow duration-300">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Annual Budget ({selectedYear})</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow duration-300">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Liquidated</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{formatCurrency(totalDisbursed)}</p>
          
          <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3 mb-1 flex overflow-hidden border border-gray-200">
            {segments.map(seg => (
              <div 
                key={seg.id}
                className={`h-2.5 ${seg.color} hover:opacity-75 transition-opacity cursor-help border-r border-white last:border-r-0`}
                style={{ width: `${seg.percentage}%` }}
                title={`${seg.month} ${seg.year}: ₱${seg.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${seg.percentage.toFixed(1)}%)`}
              ></div>
            ))}
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">Hover colored segments to view monthly breakdown</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500 hover:shadow-md transition-shadow duration-300">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Remaining Balance</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{formatCurrency(remainingBalance)}</p>
        </div>
      </div>

      {/* UX: Added subtle hover lift to the main actionable panels */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-red-900 tracking-tight">Action Required: Pending Approvals</h3>
          <span className="bg-red-200 text-red-800 py-1 px-3 rounded-full text-xs font-bold shadow-sm">{pendingReports.length} Pending</span>
        </div>
        <div className="p-0">
          {pendingReports.length === 0 ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center">
              <span className="text-4xl block mb-2">🎉</span>
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">There are no pending reports requiring your approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Report Period</th>
                    <th className="px-6 py-4 font-semibold">Submitted By</th>
                    <th className="px-6 py-4 font-semibold">Expense Breakdown</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReports.map((report) => {
                    const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
                    const groupedExpenses = report.expenses.reduce((acc, curr) => {
                      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                      return acc;
                    }, {} as Record<string, number>);

                    return (
                      <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-5 font-bold text-gray-900 align-top">
                          {getMonthName(report.allocation.month)} {report.allocation.year}
                        </td>
                        <td className="px-6 py-5 text-gray-600 align-top">
                          <p className="font-semibold text-gray-900">{
                            report.createdBy?.name ||
                            report.disbursingOfficer?.name ||
                            report.createdBy?.email ||
                            report.disbursingOfficer?.email ||
                            "Not specified"
                          }</p>
                          <p className="text-xs text-gray-400 mt-1">Submitted: {report.submittedAt?.toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="font-black text-red-600 mb-2 text-lg">
                            Total: {formatCurrency(totalSpent)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(groupedExpenses).map(([cat, amt]) => (
                              <span key={cat} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 font-medium rounded-md border border-gray-200">
                                {cat.replace("_", " ")}: ₱{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right align-middle">
                          {/* UX: Action button lift and pointer */}
                          <Link 
                            href={`/dashboard/principal/report/${report.id}`} 
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm"
                          >
                            Review Details &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 tracking-tight">Recently Approved Liquidations ({selectedYear})</h3>
          <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-xs font-bold shadow-sm">{approvedCount} Total Approved</span>
        </div>
        <div className="p-0">
          {recentApprovedReports.length === 0 ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center">
              <span className="text-3xl mb-2 text-gray-300">📊</span>
              <p>No approved liquidation reports for this fiscal year yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Report Period</th>
                    <th className="px-6 py-4 font-semibold">Approved On</th>
                    <th className="px-6 py-4 font-semibold">Total Disbursed</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApprovedReports.map((report) => {
                    const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);

                    return (
                      <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 align-middle">
                          {getMonthName(report.allocation.month)} {report.allocation.year}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm align-middle">
                          {report.approvedAt?.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 align-middle font-bold text-gray-900">
                          {formatCurrency(totalSpent)}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          {/* UX: Action button lift and pointer */}
                          <Link 
                            href={`/dashboard/principal/report/${report.id}`} 
                            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm border border-gray-200"
                          >
                            View Report &rarr;
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}