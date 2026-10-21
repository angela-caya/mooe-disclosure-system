import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

// This page serves exclusively as a document template for hidden iframe printing.
// It contains no interactive UI elements; the browser's print dialog is triggered programmatically by the parent window.

export default async function HiddenPrintTemplate({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  const allocationId = resolvedParams.id;

  const allocation = await prisma.monthlyAllocation.findUnique({
    where: { id: allocationId },
    include: {
      reports: {
        include: { 
          expenses: { orderBy: { date: 'asc' } },
          disbursingOfficer: true,
          principal: true
        }
      }
    }
  });

  if (!allocation || !allocation.reports[0]) notFound();

  const report = allocation.reports[0];
  const expenses = report.expenses;
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="bg-white text-black p-8 font-serif max-w-4xl mx-auto">
      {/* Official DepEd Document Header */}
      <div className="text-center mb-8">
        <p className="text-sm">Republic of the Philippines</p>
        <p className="text-sm font-bold uppercase tracking-wide">Department of Education</p>
        <p className="text-sm">Region IV-A CALABARZON</p>
        <p className="text-sm">Division of Biñan City</p>
        <h1 className="text-2xl font-black uppercase mt-6 tracking-tight">Liquidation Report</h1>
        <p className="text-md font-semibold mt-1">Maintenance and Other Operating Expenses (MOOE)</p>
        <p className="text-sm mt-1">For the Month of {getMonthName(allocation.month)} {allocation.year}</p>
      </div>

      {/* Itemized Expenses Ledger */}
      <table className="w-full border-collapse border border-black mb-10 text-sm">
        <thead>
          <tr>
            <th className="border border-black px-4 py-2 w-28 text-center font-bold">Date</th>
            <th className="border border-black px-4 py-2 w-40 text-left font-bold">Category</th>
            <th className="border border-black px-4 py-2 text-left font-bold">Particulars / Payee</th>
            <th className="border border-black px-4 py-2 w-36 text-right font-bold">Amount (₱)</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id}>
              <td className="border border-black px-4 py-2 text-center">{exp.date.toLocaleDateString()}</td>
              <td className="border border-black px-4 py-2 font-medium">{exp.category.replace("_", " ")}</td>
              <td className="border border-black px-4 py-2">{exp.description}</td>
              <td className="border border-black px-4 py-2 text-right font-semibold">
                {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
          
          {/* Pad the ledger with empty rows to maintain professional form height */}
          {expenses.length < 5 && Array.from({ length: 5 - expenses.length }).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black px-4 py-4"></td>
              <td className="border border-black px-4 py-4"></td>
              <td className="border border-black px-4 py-4"></td>
              <td className="border border-black px-4 py-4"></td>
            </tr>
          ))}
          
          <tr>
            <td colSpan={3} className="border border-black px-4 py-3 font-bold text-right uppercase tracking-wider">
              Total Amount Disbursed:
            </td>
            <td className="border border-black px-4 py-3 font-bold text-right text-base underline underline-offset-4 decoration-2">
              ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Formal Signatories Section */}
      <div className="grid grid-cols-2 gap-20 mt-16 text-sm px-8">
        <div>
          <p className="mb-10 text-gray-700">Prepared by:</p>
          <div className="border-b border-black text-center font-bold uppercase pb-1 tracking-wide">
            {report.disbursingOfficer?.name || "Cris Vincent Castro"}
          </div>
          <p className="text-center mt-1 text-gray-700">Disbursing Officer</p>
        </div>
        <div>
          <p className="mb-10 text-gray-700">Certified Correct & Approved by:</p>
          <div className="border-b border-black text-center font-bold uppercase pb-1 tracking-wide">
            {report.principal?.name || "Angela Marie Caya"}
          </div>
          <p className="text-center mt-1 text-gray-700">School Principal</p>
        </div>
      </div>
      
    </div>
  );
}