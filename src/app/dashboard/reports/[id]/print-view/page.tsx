// import prisma from "@/lib/prisma";
// import { notFound } from "next/navigation";
// // UX FIX: Tinanggal na natin ang import ng PrintButton dahil iframe na ang nagti-trigger ng print

// interface PrintReportPageProps {
//   params: Promise<{
//     id: string;
//   }>;
// }

// export default async function PrintReportPage({ params }: PrintReportPageProps) {
//   const resolvedParams = await params;
//   const reportId = resolvedParams.id;

//   const report = await prisma.liquidationReport.findUnique({
//     where: { id: reportId },
//     include: {
//       allocation: true,
//       disbursingOfficer: { select: { name: true, email: true } },
//       principal: { select: { name: true, email: true } },
//       expenses: { orderBy: { date: 'asc' } }
//     }
//   });

//   if (!report) {
//     notFound();
//   }

//   const totalSpent = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
//   const balance = report.allocation.totalAmount - totalSpent;

//   const reportDate = new Date();
//   reportDate.setMonth(report.month - 1);
//   const monthName = reportDate.toLocaleString('default', { month: 'long' });

//   return (
//     <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white flex justify-center">
//       <div className="bg-white w-[210mm] min-h-[297mm] p-12 shadow-lg print:shadow-none print:w-full print:min-h-0 print:p-0">
        
//         {/* UX FIX: Tinanggal ang <PrintButton /> block dito dahil programmatic na ang printing */}

//         {/* Formal Document Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-xl font-bold uppercase">Department of Education</h1>
//           <h2 className="text-lg font-semibold mt-1">Maintenance and Other Operating Expenses (MOOE)</h2>
//           <h3 className="text-md font-medium mt-1">Itemized Liquidation Report</h3>
//           <p className="mt-4 text-sm font-bold text-gray-700">
//             For the Month of {monthName} {report.year}
//           </p>
//         </div>

//         {/* Budget Summary Section */}
//         <div className="mb-6 border border-gray-800 p-4">
//           <div className="grid grid-cols-2 gap-4 text-sm">
//             <div>
//               <p><span className="font-bold">Status:</span> {report.status}</p>
//               <p><span className="font-bold">Total Allocation:</span> ₱{report.allocation.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
//             </div>
//             <div className="text-right">
//               <p><span className="font-bold">Total Disbursed:</span> ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
//               <p><span className="font-bold">Remaining Balance:</span> ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
//             </div>
//           </div>
//         </div>

//         {/* Itemized Expenses Table */}
//         <table className="w-full text-left border-collapse border border-gray-800 text-sm mb-12">
//           <thead>
//             <tr className="bg-gray-100 print:bg-transparent">
//               <th className="border border-gray-800 px-4 py-2 w-24">Date</th>
//               <th className="border border-gray-800 px-4 py-2">Description / Particulars</th>
//               <th className="border border-gray-800 px-4 py-2 w-36">Category</th>
//               <th className="border border-gray-800 px-4 py-2 w-32 text-right">Amount (₱)</th>
//             </tr>
//           </thead>
//           <tbody>
//             {report.expenses.map((expense) => (
//               <tr key={expense.id}>
//                 <td className="border border-gray-800 px-4 py-2">
//                   {expense.date.toLocaleDateString()}
//                 </td>
//                 <td className="border border-gray-800 px-4 py-2">
//                   {expense.description}
//                 </td>
//                 <td className="border border-gray-800 px-4 py-2">
//                   {expense.category.replace("_", " ")}
//                 </td>
//                 <td className="border border-gray-800 px-4 py-2 text-right font-medium">
//                   {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                 </td>
//               </tr>
//             ))}
//             {/* Grand Total Row */}
//             <tr className="font-bold">
//               <td colSpan={3} className="border border-gray-800 px-4 py-2 text-right uppercase">
//                 Grand Total
//               </td>
//               <td className="border border-gray-800 px-4 py-2 text-right">
//                 ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//               </td>
//             </tr>
//           </tbody>
//         </table>

//         {/* Signature Blocks */}
//         <div className="grid grid-cols-2 gap-16 mt-16 pt-8 text-sm">
//           <div>
//             <p className="mb-8">Prepared and Certified Correct by:</p>
//             <div className="border-b border-gray-800 font-bold text-center pb-1 uppercase">
//               {report.disbursingOfficer?.name || report.disbursingOfficer?.email || "_________________________"}
//             </div>
//             <p className="text-center mt-1">Disbursing Officer</p>
//             <p className="text-center mt-4 text-xs text-gray-500">
//               Date Submitted: {report.submittedAt ? report.submittedAt.toLocaleDateString() : "N/A"}
//             </p>
//           </div>

//           <div>
//             <p className="mb-8">Reviewed and Approved by:</p>
//             <div className="border-b border-gray-800 font-bold text-center pb-1 uppercase">
//               {report.principal?.name || report.principal?.email || "_________________________"}
//             </div>
//             <p className="text-center mt-1">School Principal</p>
//             <p className="text-center mt-4 text-xs text-gray-500">
//               Date Approved: {report.approvedAt ? report.approvedAt.toLocaleDateString() : "N/A"}
//             </p>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

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
  
  // Dynamic fields with fallbacks based on the reference format
  const entityName = report.entityName || "BINAN CITY SENIOR HIGH SCHOOL-WEST CAMPUS";
  const fundCluster = report.fundCluster || "01";
  const responsibilityCenterCode = report.centerCode || "070010804019";
  const fundPurpose = report.fundPurpose || "MOOE";
  const yearlySequence = (report as any).yearlySequence || 1;
  const birDeduction = (report as any).birDeduction || 0;
  const dvNumber = (report as any).dvNumber || "___________";

  // Signatory Snapshots
  const principalName = report.principalName || "________________________";
  const asdsName = report.asdsName || "________________________";
  const sdsName = report.sdsName || "________________________";
  const accountantName = report.accountantName || "________________________";

  const formatDate = (dateString?: Date | null) => {
    if (!dateString) return "___________";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  const dvDate = formatDate((report as any).dvDate);
  const reportDate = formatDate(report.submittedAt || new Date());
  const preparedDate = formatDate(report.submittedAt || new Date()); // Date for Box A

  const reportMonth = new Date();
  reportMonth.setMonth(report.month - 1);
  const monthName = reportMonth.toLocaleString('en-US', { month: 'long' });

  // Serial No format: <year>-<month>-<number of liquidation this YEAR>
  const serialNo = `${report.year}-${report.month.toString().padStart(2, '0')}-${yearlySequence.toString().padStart(3, '0')}`;

  const grossTotal = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalAmountSpent = grossTotal - birDeduction;

  return (
    <div className="bg-white text-black p-8 font-serif max-w-4xl mx-auto text-[10pt] leading-tight print:p-0 print:m-0">
      
      {/* Appendix Header (Outside the border) */}
      <div className="text-right text-sm font-bold mb-2 italic pr-4">
        Appendix 44
      </div>

      {/* Main Bordered Container (Everything inside here is boxed) */}
      <div className="w-full border-2 border-black flex flex-col">
        
        {/* Header Row 1: Title & Serial */}
        <div className="flex w-full border-b-2 border-black">
          <div className="w-[65%] border-r-2 border-black p-3 text-center flex flex-col justify-center">
            <h1 className="text-lg font-bold tracking-wide">LIQUIDATION REPORT</h1>
            <p className="text-sm">Period Covered: <span className="font-bold uppercase">{monthName} {report.year}</span></p>
          </div>
          <div className="w-[35%] p-3 text-sm flex flex-col justify-center">
            <p>Serial No.: <span className="font-bold underline underline-offset-2">{serialNo}</span></p>
            <p className="mt-1">Date: <span className="font-bold underline underline-offset-2">{reportDate}</span></p>
          </div>
        </div>

        {/* Header Row 2: Entity & Responsibility Code */}
        <div className="flex w-full border-b-2 border-black text-sm">
          <div className="w-[65%] border-r-2 border-black p-3 flex flex-col justify-center">
            <p className="font-bold">Entity Name : <span className="font-normal">{entityName}</span></p>
            <p className="font-bold mt-1">Fund Cluster : <span className="font-normal underline underline-offset-2">&nbsp;&nbsp;{fundCluster}&nbsp;&nbsp;</span></p>
          </div>
          <div className="w-[35%] p-3 flex flex-col items-center justify-center">
            <p>Responsibility Center Code:</p>
            <p className="font-bold underline underline-offset-2 mt-1">{responsibilityCenterCode}</p>
          </div>
        </div>

        {/* Main Table Section (Particulars & Amount) */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="border-r-2 border-black p-2 text-center w-[75%] font-bold">PARTICULARS</th>
              <th className="p-2 text-center w-[25%] font-bold">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {/* Introductory Text */}
            <tr>
              <td className="border-r-2 border-black p-3 text-justify align-top leading-snug">
                To liquidate the cash advance for {fundPurpose} of {entityName} as per supporting documents attached in the amount of ....
              </td>
              <td className="p-3"></td>
            </tr>
            
            {/* Blank Spacing Before Expenses */}
            <tr>
              <td className="border-r-2 border-black py-2"></td>
              <td></td>
            </tr>

            {/* Itemized Expenses */}
            {report.expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="border-r-2 border-black px-4 py-1">
                  {expense.category.replace(/_/g, " ")} {expense.description ? `- ${expense.description}` : ""}
                </td>
                <td className="px-4 py-1 text-right">
                  {expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            
            {/* Pad with empty space to push BIR to the bottom if list is short */}
            <tr>
              <td className="border-r-2 border-black py-4"></td>
              <td></td>
            </tr>

            {/* DUE TO B.I.R. */}
            <tr>
              <td className="border-r-2 border-black px-4 py-3 font-medium text-red-600">
                DUE TO B.I.R.
              </td>
              <td className="px-4 py-3 text-right text-red-600">
                {birDeduction > 0 ? birDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
              </td>
            </tr>

            {/* TOTAL AMOUNT SPENT */}
            <tr className="border-t-2 border-black">
              <td className="border-r-2 border-black px-2 py-1 font-bold uppercase">
                TOTAL AMOUNT SPENT
              </td>
              <td className="px-4 py-1 text-right font-bold">
                {totalAmountSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>

            {/* AMOUNT OF CASH ADVANCE */}
            <tr className="border-t-2 border-black">
              <td className="border-r-2 border-black px-2 py-1 uppercase">
                AMOUNT OF CASH ADVANCE PER DV NO. <span className="font-bold underline underline-offset-2">{dvNumber}</span> DTD. <span className="font-bold underline underline-offset-2">{dvDate}</span>
              </td>
              <td className="px-4 py-1 text-right font-bold">
                {totalAmountSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>

            {/* AMOUNT REFUNDED */}
            <tr className="border-t-2 border-black">
              <td className="border-r-2 border-black px-2 py-1 uppercase flex gap-1">
                <span>AMOUNT REFUNDED PER OR NO.</span>
                <span className="inline-block w-24 border-b border-black"></span>
                <span>DTD.</span>
                <span className="inline-block w-24 border-b border-black"></span>
              </td>
              <td className="px-4 py-1 text-right"></td>
            </tr>

            {/* AMOUNT TO BE REIMBURSED */}
            <tr className="border-t-2 border-black">
              <td className="border-r-2 border-black px-2 py-1 font-bold uppercase">
                AMOUNT TO BE REIMBURSED
              </td>
              <td className="px-4 py-1 text-right text-lg font-bold">
                -
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signatures Section (Box A, B, C) */}
        <div className="w-full flex border-t-2 border-black text-xs h-[180px]">
          
          {/* Box A */}
          <div className="w-1/3 border-r-2 border-black p-2 flex flex-col relative">
            <div className="flex gap-1">
              <div className="border border-black px-1 font-bold h-fit">A</div>
              <div>Certified: Correctness of the<br/>above data</div>
            </div>
            
            <div className="mt-4 text-center flex-grow flex flex-col justify-end text-[11px]">
              <div className="font-bold uppercase underline underline-offset-4 decoration-[1.5px]">
                {principalName}
              </div>
              <div className="mt-1">Signature over Printed Name</div>
              <div>School Principal II</div>
            </div>
            
            <div>Date: <span className="font-bold">{preparedDate}</span></div>
          </div>

          {/* Box B */}
          <div className="w-1/3 border-r-2 border-black p-2 flex flex-col relative">
            <div className="flex gap-1">
              <div className="border border-black px-1 font-bold h-fit">B</div>
              <div>Certified: Purpose of travel /<br/>cash advance duly accomplished</div>
            </div>
            
            <div className="mt-4 text-center flex-grow flex flex-col justify-end text-[11px]">
              <div className="font-bold uppercase underline underline-offset-4 decoration-[1.5px]">
                {asdsName}I
              </div>
              <div className="mt-1">Signature over Printed Name</div>
              <div>Assistant Schools Division Superintendent</div>
              <div className="mt-1">Officer-in-Charge</div>
              <div>Schools Division Superintendent</div>
            </div>
            
            <div className="mt-auto">Date: ________________________</div>
          </div>

          {/* Box C */}
          <div className="w-1/3 p-2 flex flex-col relative">
            <div className="flex gap-1">
              <div className="border border-black px-1 font-bold h-fit">C</div>
              <div>Certified: Supporting documents<br/>complete and proper</div>
            </div>
            
            <div className="mt-8 text-center flex-grow flex flex-col justify-end text-[11px]">
              <div className="font-bold uppercase underline underline-offset-4 decoration-[1.5px]">
                {accountantName}
              </div>
              <div className="mt-1">Signature over Printed Name</div>
              <div>Head, Accounting Division Unit</div>
            </div>
            
            <div className="mt-auto flex flex-col gap-1">
              <div>JEV No.: ________________________</div>
              <div>Date: ________________________</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}