import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logSystemAction } from "@/lib/auditLogger";
import Link from "next/link";

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
        principalId: principalId,
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

    revalidatePath(`/dashboard/principal`);
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
          <Link href="/dashboard/principal" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            Liquidation Review: {getMonthName(report.allocation.month)} {report.allocation.year}
          </h1>
          <p className="text-gray-600 mt-1">
            Submitted by: {report.disbursingOfficer.name || report.disbursingOfficer.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${isPending ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
            Status: {report.status}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Itemized Expense Breakdown</h3>
          <Link 
            href={`/dashboard/expenses/${report.allocationId}/print`}
            target="_blank"
            className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold rounded shadow-sm transition-colors"
          >
            🖨️ Print PDF
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-sm text-gray-500 border-b border-gray-200">
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Description</th>
                <th className="px-6 py-4 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.expenses.map(exp => (
                <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{exp.date.toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-gray-700">{exp.category.replace("_", " ")}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exp.description}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-bold">
                    ₱{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td colSpan={3} className="px-6 py-5 text-right font-bold text-gray-800 uppercase tracking-wide">Total Disbursed:</td>
                <td className="px-6 py-5 text-right font-black text-xl text-gray-800 border-t-2 border-gray-200">
                  ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {isPending && (
        <div className="flex flex-col md:flex-row justify-end gap-4 mt-6">
          <form action={rejectReport} className="flex w-full md:w-auto gap-2">
            <input 
              type="text" 
              name="remarks" 
              required 
              placeholder="State reason for rejection..." 
              className="flex-1 md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
            />
            <button type="submit" className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-3 px-6 rounded-lg shadow-sm transition-all whitespace-nowrap">
              ❌ Return for Revision
            </button>
          </form>
          
          <form action={approveReport} className="w-full md:w-auto">
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-lg">
              ✅ Certify & Approve
            </button>
          </form>
        </div>
      )}
    </div>
  );
}