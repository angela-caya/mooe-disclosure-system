import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
// UX FIX: Tinanggal na natin ang import ng PrintButton dahil iframe na ang nagti-trigger ng print

interface PrintReportPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PrintReportPage({ params }: PrintReportPageProps) {
  const resolvedParams = await params;
  const reportId = resolvedParams.id;

  const report = await prisma.liquidationReport.findUnique({
    where: { id: reportId },
    include: {
      allocation: true,
      disbursingOfficer: { select: { name: true, email: true } },
      principal: { select: { name: true, email: true } },
      expenses: { orderBy: { date: 'asc' } }
    }
  });

  if (!report) {
    notFound();
  }

  const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const balance = report.allocation.totalAmount - totalSpent;

  const reportDate = new Date();
  reportDate.setMonth(report.month - 1);
  const monthName = reportDate.toLocaleString('default', { month: 'long' });

  return (
    <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white flex justify-center">
      <div className="bg-white w-[210mm] min-h-[297mm] p-12 shadow-lg print:shadow-none print:w-full print:min-h-0 print:p-0">
        
        {/* UX FIX: Tinanggal ang <PrintButton /> block dito dahil programmatic na ang printing */}

        {/* Formal Document Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold uppercase">Department of Education</h1>
          <h2 className="text-lg font-semibold mt-1">Maintenance and Other Operating Expenses (MOOE)</h2>
          <h3 className="text-md font-medium mt-1">Itemized Liquidation Report</h3>
          <p className="mt-4 text-sm font-bold text-gray-700">
            For the Month of {monthName} {report.year}
          </p>
        </div>

        {/* Budget Summary Section */}
        <div className="mb-6 border border-gray-800 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="font-bold">Status:</span> {report.status}</p>
              <p><span className="font-bold">Total Allocation:</span> ₱{report.allocation.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">Total Disbursed:</span> ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p><span className="font-bold">Remaining Balance:</span> ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Itemized Expenses Table */}
        <table className="w-full text-left border-collapse border border-gray-800 text-sm mb-12">
          <thead>
            <tr className="bg-gray-100 print:bg-transparent">
              <th className="border border-gray-800 px-4 py-2 w-24">Date</th>
              <th className="border border-gray-800 px-4 py-2">Description / Particulars</th>
              <th className="border border-gray-800 px-4 py-2 w-36">Category</th>
              <th className="border border-gray-800 px-4 py-2 w-32 text-right">Amount (₱)</th>
            </tr>
          </thead>
          <tbody>
            {report.expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="border border-gray-800 px-4 py-2">
                  {expense.date.toLocaleDateString()}
                </td>
                <td className="border border-gray-800 px-4 py-2">
                  {expense.description}
                </td>
                <td className="border border-gray-800 px-4 py-2">
                  {expense.category.replace("_", " ")}
                </td>
                <td className="border border-gray-800 px-4 py-2 text-right font-medium">
                  {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {/* Grand Total Row */}
            <tr className="font-bold">
              <td colSpan={3} className="border border-gray-800 px-4 py-2 text-right uppercase">
                Grand Total
              </td>
              <td className="border border-gray-800 px-4 py-2 text-right">
                ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature Blocks */}
        <div className="grid grid-cols-2 gap-16 mt-16 pt-8 text-sm">
          <div>
            <p className="mb-8">Prepared and Certified Correct by:</p>
            <div className="border-b border-gray-800 font-bold text-center pb-1 uppercase">
              {report.disbursingOfficer?.name || report.disbursingOfficer?.email || "_________________________"}
            </div>
            <p className="text-center mt-1">Disbursing Officer</p>
            <p className="text-center mt-4 text-xs text-gray-500">
              Date Submitted: {report.submittedAt ? report.submittedAt.toLocaleDateString() : "N/A"}
            </p>
          </div>

          <div>
            <p className="mb-8">Reviewed and Approved by:</p>
            <div className="border-b border-gray-800 font-bold text-center pb-1 uppercase">
              {report.principal?.name || report.principal?.email || "_________________________"}
            </div>
            <p className="text-center mt-1">School Principal</p>
            <p className="text-center mt-4 text-xs text-gray-500">
              Date Approved: {report.approvedAt ? report.approvedAt.toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}