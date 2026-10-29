import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logSystemAction } from "@/lib/auditLogger";
import Link from "next/link";
import PrintReportButton from "@/src/components/PrintReportButton";

export default async function PrincipalReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "PRINCIPAL") {
    redirect('/dashboard');
  }

  const resolvedParams = await params;
  const reportId = resolvedParams.id;

  if (!reportId) notFound();

  const report = await prisma.liquidationReport.findUnique({
    where: { id: reportId },
    include: {
      allocation: true,
      disbursingOfficer: true,
      createdBy: { select: { name: true, email: true } },
      expenses: { orderBy: { date: 'asc' } }
    }
  });

  if (!report) notFound();

  const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const isPending = report.status === "PENDING";
  const isApproved = report.status === "APPROVED";

  // Process formal certification and approval
  async function approveReport() {
    'use server'
    const principalId = session!.user.id;

    await prisma.liquidationReport.update({
      where: { id: report!.id },
      data: { 
        status: "APPROVED", 
        approvedAt: new Date(), 
        remarks: null 
      }
    });

    await logSystemAction(
      principalId,
      "APPROVE",
      "LiquidationReport",
      report!.id,
      `Certified and approved liquidation report for Month ${report!.allocation.month}`
    );

    // Trigger on-demand cache invalidation for the public transparency board to reflect immediate approval
    revalidatePath(`/dashboard/principal`);
    revalidatePath(`/transparency`, 'layout');
    redirect(`/dashboard/principal`);
  }

  // Process rejection workflow and capture administrative feedback
  async function rejectReport(formData: FormData) {
    'use server'
    const principalId = session!.user.id;
    const remarks = formData.get("remarks") as string;

    await prisma.liquidationReport.update({
      where: { id: report!.id },
      data: { 
        status: "DRAFT",
        remarks: remarks 
      }
    });

    await logSystemAction(
      principalId,
      "REJECT",
      "LiquidationReport",
      report!.id,
      `Returned liquidation report for Month ${report!.allocation.month}. Reason: ${remarks}`
    );

    revalidatePath(`/dashboard/principal`);
    redirect(`/dashboard/principal`);
  }

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          {/* UX: Improved back link with transition and pointer */}
          <Link 
            href="/dashboard/principal" 
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline mb-2 inline-flex items-center transition-colors cursor-pointer"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Liquidation Review: {getMonthName(report.allocation.month)} {report.allocation.year}
          </h1>
          <p className="text-gray-600 mt-1">
            Prepared by: <span className="font-semibold text-gray-800">
              {
                report.createdBy?.name ||
                report.disbursingOfficer?.name ||
                report.createdBy?.email ||
                report.disbursingOfficer?.email ||
                "Not specified"
              }
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* UX: Added subtle shadow to status badge */}
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${isPending ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
            Status: {report.status}
          </span>
        </div>
      </div>

      {/* UX: Added hover lift and shadow transition to the main card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 hover:shadow-md transition-shadow duration-300">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h3 className="font-bold text-gray-900 text-lg">Itemized Expense Breakdown</h3>
          
          {/* UX: Implemented the new One-Click Print Client Component */}
          {/* <PrintReportButton reportId={report.allocationId} /> */}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-sm text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.expenses.map(exp => (
                <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-700">{exp.date.toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{exp.category.replace("_", " ")}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{exp.description}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-bold">
                    ₱{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-6 py-5 text-right font-bold text-gray-700 uppercase tracking-wide">Total Disbursed:</td>
                <td className="px-6 py-5 text-right font-black text-xl text-gray-900 border-t-2 border-gray-300">
                  ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {isPending && (
        <div className="flex flex-col lg:flex-row justify-end gap-4 mt-6">
          <form action={rejectReport} className="flex flex-col sm:flex-row w-full lg:w-auto gap-2">
            {/* UX: Added hidden label for accessibility and fixed text color */}
            <label htmlFor="rejectionRemarks" className="sr-only">Reason for rejection</label>
            <input 
              id="rejectionRemarks"
              type="text" 
              name="remarks" 
              required 
              placeholder="State reason for revision..." 
              className="flex-1 sm:w-72 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow bg-white"
            />
            {/* UX: Added proper hover and lift effects to rejection button */}
            <button 
              type="submit" 
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-3 px-6 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap cursor-pointer"
            >
              ❌ Return for Revision
            </button>
          </form>
          
          <form action={approveReport} className="w-full lg:w-auto">
            {/* UX: Added lift effect to the primary approval button */}
            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-lg cursor-pointer"
            >
              ✅ Certify & Approve
            </button>
          </form>
        </div>
      )}
    </div>
  );
}