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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PRINCIPAL") {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = resolvedSearchParams.year ? parseInt(resolvedSearchParams.year, 10) : currentYear;

  const dbYears = await prisma.monthlyAllocation.findMany({
    distinct: ['year'],
    select: { year: true },
    orderBy: { year: 'desc' }
  });
  
  const availableYears = dbYears.map(d => d.year);
  if (!availableYears.includes(currentYear)) availableYears.push(currentYear);
  availableYears.sort((a, b) => b - a);

  const allocations = await prisma.monthlyAllocation.findMany({
    where: { year: selectedYear }
  });
  const totalBudget = allocations.reduce((sum, alloc) => sum + alloc.totalAmount, 0);

  const allApprovedReports = await prisma.liquidationReport.findMany({
    where: { year: selectedYear, status: "APPROVED" },
    include: { 
      allocation: true,
      disbursingOfficer: { select: { name: true, email: true } },
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

  const pendingReports = await prisma.liquidationReport.findMany({
    where: { status: "PENDING" },
    include: {
      allocation: true,
      disbursingOfficer: { select: { name: true, email: true } },
      expenses: true
    },
    orderBy: { submittedAt: 'asc' }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Principal Dashboard</h1>
          <p className="text-gray-600">Executive Overview and Approvals</p>
        </div>
        <div className="flex gap-3">
          <Link href="/transparency" target="_blank" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
            🌐 Public Board
          </Link>
          <Link href="/dashboard/principal/logs" className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors">
            📜 Audit Logs
          </Link>
        </div>
      </div>

      <YearFilter availableYears={availableYears} currentYear={currentYear} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Annual Budget ({selectedYear})</p>
          <p className="text-3xl font-black text-gray-800 mt-2">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-yellow-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Total Liquidated</p>
          <p className="text-3xl font-black text-gray-800 mt-2">{formatCurrency(totalDisbursed)}</p>
          
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
          <p className="text-xs text-gray-500 font-medium">Hover colored segments to view monthly breakdown</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Remaining Balance</p>
          <p className="text-3xl font-black text-gray-800 mt-2">{formatCurrency(remainingBalance)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden shadow-red-100/50">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-red-900">Action Required: Pending Approvals</h3>
          <span className="bg-red-200 text-red-800 py-1 px-3 rounded-full text-xs font-bold">{pendingReports.length} Pending</span>
        </div>
        <div className="p-0">
          {pendingReports.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <span className="text-4xl block mb-2">🎉</span>
              All caught up! There are no pending reports requiring your approval.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-6 py-4 font-bold">Report Period</th>
                    <th className="px-6 py-4 font-bold">Submitted By</th>
                    <th className="px-6 py-4 font-bold">Expense Breakdown</th>
                    <th className="px-6 py-4 font-bold text-right">Action</th>
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
                      <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-5 font-bold text-gray-800 align-top">
                          {getMonthName(report.allocation.month)} {report.allocation.year}
                        </td>
                        <td className="px-6 py-5 text-gray-600 align-top">
                          <p className="font-medium text-gray-800">{report.disbursingOfficer.name || report.disbursingOfficer.email}</p>
                          <p className="text-xs text-gray-400 mt-1">Submitted: {report.submittedAt?.toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="font-bold text-red-600 mb-2 text-lg">
                            Total: {formatCurrency(totalSpent)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(groupedExpenses).map(([cat, amt]) => (
                              <span key={cat} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md border border-gray-200">
                                {cat.replace("_", " ")}: ₱{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right align-middle">
                          <Link href={`/dashboard/principal/report/${report.id}`} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-sm transition-all text-sm">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Recently Approved Liquidations ({selectedYear})</h3>
          <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-xs font-bold">{approvedCount} Total Approved</span>
        </div>
        <div className="p-0">
          {recentApprovedReports.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No approved liquidation reports for this fiscal year yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-6 py-4 font-bold">Report Period</th>
                    <th className="px-6 py-4 font-bold">Approved On</th>
                    <th className="px-6 py-4 font-bold">Total Disbursed</th>
                    <th className="px-6 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApprovedReports.map((report) => {
                    const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);

                    return (
                      <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800 align-middle">
                          {getMonthName(report.allocation.month)} {report.allocation.year}
                        </td>
                        <td className="px-6 py-4 text-gray-600 align-middle">
                          {report.approvedAt?.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 align-middle font-bold text-gray-800">
                          {formatCurrency(totalSpent)}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          <Link href={`/dashboard/principal/report/${report.id}`} className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg shadow-sm transition-all text-sm">
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