import prisma from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"

export const revalidate = 60 // Auto-refresh cache

export default async function PublicReportDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params
  const reportId = resolvedParams.id

  // Fetch detailed approved report with strict data sanitization to prevent PII leakage (R.A. 10173)
  const report = await prisma.liquidationReport.findFirst({
    where: { 
      id: reportId,
      status: "APPROVED" 
    },
    include: {
      allocation: {
        select: { id: true, totalAmount: true, month: true, year: true }
      },
      expenses: { 
        orderBy: { date: 'asc' },
        select: { id: true, category: true, description: true, amount: true, taxAmount: true, date: true }
      },
      // Restrict relational data fetching to names only; exclude emails, password hashes, and signature URLs
      disbursingOfficer: { select: { name: true } },
      createdBy: { select: { name: true } }
    }
  })

  if (!report) notFound()

  const expenses = report.expenses
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  
  // FIX: Accurately calculate the sum of taxes from itemized expenses if birDeduction is out of sync
  const computedTaxFromExpenses = expenses.reduce((sum, exp) => sum + (exp.taxAmount || 0), 0)
  const birTax = report.birDeduction > 0 ? report.birDeduction : computedTaxFromExpenses
  
  const netAmount = totalAmount - birTax

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); 
    return d.toLocaleString('default', { month: 'long' })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      
      {/* Header */}
      <header className="bg-blue-900 text-white py-6 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-blue-200 hover:text-white font-semibold text-sm flex items-center gap-2 mb-4 transition-colors">
            &larr; Back to Transparency Board
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Detailed MOOE Liquidation
          </h1>
          {/* FIX: Inayos ang spacing at formatting ng text */}
          <p className="text-blue-200 mt-1 font-medium">
            {getMonthName(report.month)} {report.year} | {report.entityName}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* Verification Badge & Metadata */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Report Status</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-200"></span>
              <span className="font-black text-green-700 text-lg tracking-tight">VERIFIED & APPROVED</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              Approved on: {report.approvedAt?.toLocaleDateString()}
            </p>
          </div>

          {/* Inject native tooltips for technical terms to assist non-tech stakeholders */}
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase flex items-center justify-end gap-1">
                Fund Purpose
                <span className="cursor-help text-blue-400 hover:text-blue-600 transition-colors" title="The specific category or program where the budget is allocated (e.g., MOOE - Maintenance and Other Operating Expenses).">ⓘ</span>
              </p>
              <p className="font-bold text-gray-900">{report.fundPurpose}</p>
            </div>
            {report.dvNumber && (
              <div className="pl-6 border-l border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase flex items-center justify-end gap-1">
                  DV Number
                  <span className="cursor-help text-blue-400 hover:text-blue-600 transition-colors" title="Disbursement Voucher Number - the official tracking document code used by the accounting unit.">ⓘ</span>
                </p>
                <p className="font-bold text-gray-900">{report.dvNumber}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary Cards - FIX: Ginawang 4 columns para isama ang Allocation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Monthly Allocation</p>
            <p className="text-2xl font-black text-gray-700 mt-1">₱{report.allocation.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-b-4 border-b-yellow-500">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Gross Amount Spent</p>
            <p className="text-2xl font-black text-gray-900 mt-1">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">BIR Tax Withheld</p>
            <p className="text-2xl font-black text-red-600 mt-1">₱{birTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-b-4 border-b-blue-600">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Net Amount</p>
            <p className="text-2xl font-black text-blue-700 mt-1">₱{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Itemized Expenses Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-900 text-lg">Itemized Disbursement Register</h3>
          </div>
          
          {/* Add full width and horizontal scroll wrapper for mobile screens */}
          <div className="overflow-x-auto w-full">
            {/* Enforce minimum width to prevent column squeezing */}
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 bg-white uppercase tracking-wide">
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Category</th>
                  <th className="px-6 py-4 font-bold">Particulars / Description</th>
                  <th className="px-6 py-4 font-bold text-right">Amount (₱)</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No expenses recorded for this period.</td>
                  </tr>
                ) : (
                  expenses.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {/* Prevent date from wrapping */}
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {exp.date.toLocaleDateString()}
                      </td>
                      
                      {/* Prevent category from wrapping */}
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                        {exp.category.replace("_", " ")}
                      </td>
                      
                      {/* Truncate excessively long descriptions and show full text on hover */}
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-[250px] truncate cursor-help" title={exp.description}>
                        {exp.description}
                        {exp.taxAmount > 0 && (
                          <span className="block text-xs text-red-500 mt-1 font-medium truncate">
                            Includes ₱{exp.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Tax
                          </span>
                        )}
                      </td>
                      
                      {/* Prevent amounts from wrapping */}
                      <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
                        {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-6 py-5 text-right font-black text-gray-700 uppercase tracking-wide">Total:</td>
                  <td className="px-6 py-5 text-right font-black text-xl text-gray-900 border-t-2 border-gray-300 whitespace-nowrap">
                    ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Digital Signatories / Accountability Section */}
        <div className="mt-8 bg-blue-50 rounded-xl border border-blue-100 p-6">
          <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-4">Official Signatories (Appendix 44)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-blue-700 font-semibold mb-1">Prepared & Certified Correct by:</p>
              <p className="font-bold text-gray-900 uppercase">{report.principalName}</p>
              <p className="text-gray-600">
                {report.principalPosition?.includes("||") 
                  ? report.principalPosition.split("||")[0] + " (Officer-in-Charge)" 
                  : report.principalPosition}
              </p>
            </div>
            <div>
              <p className="text-blue-700 font-semibold mb-1">Approved by:</p>
              <p className="font-bold text-gray-900 uppercase">{report.sdsName}</p>
              <p className="text-gray-600">
                {report.sdsPosition?.includes("||") 
                  ? report.sdsPosition.split("||")[0] + " (Officer-in-Charge)" 
                  : report.sdsPosition}
              </p>
            </div>
            <div>
              <p className="text-blue-700 font-semibold mb-1">Verified by Accounting:</p>
              <p className="font-bold text-gray-900 uppercase">{report.accountantName}</p>
              <p className="text-gray-600">
                {report.accountantPosition?.includes("||") 
                  ? report.accountantPosition.split("||")[0] + " (Officer-in-Charge)" 
                  : report.accountantPosition}
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}