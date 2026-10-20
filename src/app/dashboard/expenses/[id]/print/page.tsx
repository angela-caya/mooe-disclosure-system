import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../api/auth/[...nextauth]/route"
import { redirect, notFound } from "next/navigation"
import PrintButton from "@/src/components/PrintButton"

export default async function PrintLiquidationReport({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await params
  const allocationId = resolvedParams.id

  const allocation = await prisma.monthlyAllocation.findUnique({
    where: { id: allocationId },
    include: {
      reports: {
        include: { expenses: { orderBy: { date: 'asc' } } }
      }
    }
  })

  if (!allocation || !allocation.reports[0]) notFound()

  const report = allocation.reports[0]
  const expenses = report.expenses
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' })
  }

  return (
    <div className="bg-white min-h-screen text-black p-8 font-serif max-w-4xl mx-auto">
      {/* Interactive Client Component for Printing */}
      <div className="print:hidden flex justify-end mb-6">
        <PrintButton />
      </div>

      <div className="text-center mb-8">
        <p className="text-sm">Republic of the Philippines</p>
        <p className="text-sm font-bold uppercase">Department of Education</p>
        <p className="text-sm">Region IV-A CALABARZON</p>
        <p className="text-sm">Division of Biñan City</p>
        <h1 className="text-xl font-black uppercase mt-4">Liquidation Report</h1>
        <p className="text-md font-semibold">Maintenance and Other Operating Expenses (MOOE)</p>
        <p className="text-sm mt-1">For the Month of {getMonthName(allocation.month)} {allocation.year}</p>
      </div>

      <table className="w-full border-collapse border border-black mb-8 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-4 py-2 w-24">Date</th>
            <th className="border border-black px-4 py-2 w-32">Category</th>
            <th className="border border-black px-4 py-2">Particulars / Payee</th>
            <th className="border border-black px-4 py-2 w-32 text-right">Amount (₱)</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id}>
              <td className="border border-black px-4 py-2">{exp.date.toLocaleDateString()}</td>
              <td className="border border-black px-4 py-2 font-medium">{exp.category.replace("_", " ")}</td>
              <td className="border border-black px-4 py-2">{exp.description}</td>
              <td className="border border-black px-4 py-2 text-right">{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Fill empty space for shorter reports */}
          {expenses.length < 5 && Array.from({ length: 5 - expenses.length }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black px-4 py-4"></td>
              <td className="border border-black px-4 py-4"></td>
              <td className="border border-black px-4 py-4"></td>
              <td className="border border-black px-4 py-4"></td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="border border-black px-4 py-2 font-bold text-right">Total Amount Disbursed:</td>
            <td className="border border-black px-4 py-2 font-bold text-right underline underline-offset-4">
              ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-16 mt-16 text-sm">
        <div>
          <p className="mb-8">Prepared by:</p>
          <div className="border-b border-black text-center font-bold uppercase pb-1">
            Cris Vincent Castro
          </div>
          <p className="text-center mt-1">Disbursing Officer</p>
        </div>
        <div>
          <p className="mb-8">Certified Correct & Approved by:</p>
          <div className="border-b border-black text-center font-bold uppercase pb-1">
            Angela Marie Caya
          </div>
          <p className="text-center mt-1">School Principal</p>
        </div>
      </div>
    </div>
  )
}