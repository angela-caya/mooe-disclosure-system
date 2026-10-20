import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import YearFilter from "@/src/components/YearFilter";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const userRole = session.user.role;
  if (userRole === "PRINCIPAL") {
    redirect('/dashboard/principal');
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
    where: { year: selectedYear },
    include: {
      reports: { include: { expenses: true } }
    }
  });

  const totalBudget = allocations.reduce((sum, alloc) => sum + alloc.totalAmount, 0);
  
  let totalDisbursed = 0;
  const allApprovedReports: any[] = [];
  
  allocations.forEach(alloc => {
    alloc.reports.forEach(report => {
      if (report.status === "APPROVED") {
        const reportTotal = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        totalDisbursed += reportTotal;
        allApprovedReports.push({ ...report, allocation: alloc, totalAmount: reportTotal });
      }
    });
  });

  const remainingBalance = totalBudget - totalDisbursed;
  const utilizationRate = totalBudget > 0 ? (totalDisbursed / totalBudget) * 100 : 0;

  const activeReports = await prisma.liquidationReport.findMany({
    where: { 
      disbursingOfficerId: session.user.id,
      status: { in: ["DRAFT", "PENDING"] }
    },
    include: { allocation: true, expenses: true },
    orderBy: { updatedAt: 'desc' }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' });
  };

  const getDeadlineStatus = (reportMonth: number, reportYear: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(reportYear, reportMonth, 10);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", color: "text-red-700 bg-red-100 border border-red-200" };
    if (diffDays === 0) return { text: "Due Today", color: "text-orange-700 bg-orange-100 border border-orange-200" };
    if (diffDays <= 3) return { text: `Due in ${diffDays} days`, color: "text-orange-700 bg-orange-100 border border-orange-200" };
    return { text: `Due: ${deadlineDate.toLocaleDateString()}`, color: "text-blue-700 bg-blue-50 border border-blue-200" };
  };

  // UX FIX: Monochromatic Chopped Line (UX nung una)
  const getProgressSegments = () => {
    const sortedReports = [...allApprovedReports].sort((a, b) => a.allocation.month - b.allocation.month);

    return sortedReports.map((report) => {
      const percentage = totalBudget > 0 ? (report.totalAmount / totalBudget) * 100 : 0;
      return {
        id: report.id,
        month: getMonthName(report.allocation.month),
        year: report.allocation.year,
        amount: report.totalAmount,
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
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome back, {session.user?.name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Financial Operations Overview
          </p>
        </div>
        <Link href="/dashboard/expenses" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors">
          + Manage Allocations
        </Link>
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
          <p className="text-sm text-gray-500 mt-1 font-medium">{utilizationRate.toFixed(1)}% Overall Utilization</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
          <p className="text-sm font-bold text-gray-500 uppercase">Remaining Usable Balance</p>
          <p className="text-3xl font-black text-gray-800 mt-2">{formatCurrency(remainingBalance)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Active Liquidation Workflows</h3>
        </div>
        <div className="p-0">
          {activeReports.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <span className="text-4xl block mb-3">📋</span>
              All workflows are complete. Click "Manage Allocations" to start a new month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-6 py-4 font-bold">Report Period</th>
                    <th className="px-6 py-4 font-bold">SDO Deadline</th>
                    <th className="px-6 py-4 font-bold">Draft Expenses</th>
                    <th className="px-6 py-4 font-bold">Current Status</th>
                    <th className="px-6 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReports.map((report) => {
                    const draftedAmount = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
                    const hasExpenses = report.expenses.length > 0;
                    const deadline = getDeadlineStatus(report.allocation.month, report.allocation.year);
                    const isRejected = report.status === 'DRAFT' && report.remarks;

                    return (
                      <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800">
                          {getMonthName(report.allocation.month)} {report.allocation.year}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${deadline.color}`}>
                            {deadline.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          {hasExpenses ? `₱${draftedAmount.toLocaleString()} (${report.expenses.length} items)` : "No expenses added"}
                        </td>
                        <td className="px-6 py-4">
                          {isRejected ? (
                             <div className="flex flex-col gap-1">
                               <span className="px-3 py-1 rounded-full text-xs font-bold border bg-red-100 text-red-800 border-red-200 w-fit">
                                 RETURNED FOR REVISION
                               </span>
                               <span className="text-xs text-red-600 font-medium">Reason: {report.remarks}</span>
                             </div>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${report.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                              {report.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href={`/dashboard/expenses/${report.allocationId}`} 
                            className={`inline-block font-bold text-sm px-4 py-2 rounded-lg transition-colors ${isRejected ? 'bg-red-600 text-white hover:bg-red-700' : (hasExpenses && report.status === 'DRAFT' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100')}`}
                          >
                            {report.status === 'PENDING' ? 'View Report →' : (isRejected ? 'Fix & Resubmit →' : (hasExpenses ? 'Review & Submit →' : '➕ Add Expenses'))}
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