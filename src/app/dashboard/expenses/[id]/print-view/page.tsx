// import prisma from "@/lib/prisma";
// import { notFound } from "next/navigation";
// import Link from "next/link";

// export const dynamic = "force-dynamic";

// export default async function PrintReportPage({ 
//   params 
// }: { 
//   params: Promise<{ id: string }> 
// }) {
//   const resolvedParams = await params;
//   const allocationId = resolvedParams.id;

//   const allocation = await prisma.monthlyAllocation.findUnique({
//     where: { id: allocationId },
//     include: {
//       reports: {
//         include: {
//           expenses: { orderBy: { date: 'asc' } }
//         }
//       }
//     }
//   });

//   if (!allocation || allocation.reports.length === 0) notFound();

//   const report = allocation.reports[0];
//   const expenses = report.expenses;
//   const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
//   const birTax = report.birDeduction || 0;
//   const netAmount = totalAmount - birTax;

//   // --- OIC & SIGNATORIES FALLBACK LOGIC ---
//   const allSignatories = await prisma.signatory.findMany({
//     where: { isActive: true }
//   });

//   const regularPrincipal = allSignatories.find(s => s.position.toLowerCase().includes('principal') && !s.position.toLowerCase().includes('oic') && !s.position.toLowerCase().includes('teacher-in-charge'));
//   const regularSds = allSignatories.find(s => (s.position.toLowerCase().includes('schools division superintendent') || s.position.toLowerCase().includes('sds')) && !s.position.toLowerCase().includes('oic') && !s.position.toLowerCase().includes('assistant'));
//   const regularAccountant = allSignatories.find(s => s.position.toLowerCase().includes('accountant') && !s.position.toLowerCase().includes('oic'));

//   const oicPrincipal = allSignatories.find(s => s.position.toLowerCase().includes('oic') && (s.position.toLowerCase().includes('principal') || s.position.toLowerCase().includes('teacher-in-charge')));
//   const oicSds = allSignatories.find(s => s.position.toLowerCase().includes('oic') && (s.position.toLowerCase().includes('sds') || s.position.toLowerCase().includes('superintendent')));
//   const oicAccountant = allSignatories.find(s => s.position.toLowerCase().includes('oic') && s.position.toLowerCase().includes('accountant'));

//   const activePrincipal = (regularPrincipal && regularPrincipal.name) ? regularPrincipal : oicPrincipal;
//   const activeSds = (regularSds && regularSds.name) ? regularSds : oicSds;
//   const activeAccountant = (regularAccountant && regularAccountant.name) ? regularAccountant : oicAccountant;
//   // ----------------------------------------

//   const getMonthName = (monthNum: number) => {
//     const d = new Date(); d.setMonth(monthNum - 1);
//     return d.toLocaleString('default', { month: 'long' });
//   };

//   const reportPeriod = `${getMonthName(report.month)} ${report.year}`;

//   return (
//     <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white text-black">
      
//       {/* Non-printable Action Bar */}
//       <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
//         <Link 
//           href={`/dashboard/expenses/${allocationId}`} 
//           className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2"
//         >
//           &larr; Back to Expenses
//         </Link>
        
//         <div className="print:hidden">
//           <button 
//             onClick={() => typeof window !== 'undefined' && window.print()}
//             className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition-colors cursor-pointer"
//           >
//             Print Appendix 44
//           </button>
//         </div>
//       </div>

//       {/* A4 Print Container */}
//       <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:m-0 box-border overflow-hidden" 
//            style={{ minHeight: '297mm', padding: '10mm 15mm' }}>
        
//         {/* Header Section */}
//         <div className="text-right text-[10px] font-bold italic mb-4">
//           Appendix 44
//         </div>
        
//         <div className="text-center font-bold text-sm uppercase mb-6 tracking-wide">
//           Liquidation Report
//         </div>

//         {/* Master Border Container */}
//         <div className="border-2 border-black">
          
//           {/* Top Info Grid */}
//           <div className="grid grid-cols-3 border-b-2 border-black text-xs">
//             <div className="col-span-2 border-r-2 border-black p-2 flex flex-col justify-between">
//               <div className="flex gap-2">
//                 <span className="font-semibold w-16">Period:</span>
//                 <span className="border-b border-black flex-1 text-center font-bold uppercase">{reportPeriod}</span>
//               </div>
//               <div className="flex gap-2 mt-2">
//                 <span className="font-semibold w-16">Entity Name:</span>
//                 <span className="border-b border-black flex-1 text-center font-bold">{report.entityName}</span>
//               </div>
//               <div className="flex gap-2 mt-2">
//                 <span className="font-semibold w-16">Fund Cluster:</span>
//                 <span className="border-b border-black flex-1 text-center font-bold">{report.fundCluster}</span>
//               </div>
//             </div>
            
//             <div className="col-span-1 p-2 flex flex-col justify-between">
//               <div className="flex gap-2">
//                 <span className="font-semibold">Serial No.:</span>
//                 <span className="border-b border-black flex-1 text-center"></span>
//               </div>
//               <div className="flex gap-2 mt-2">
//                 <span className="font-semibold">Date:</span>
//                 <span className="border-b border-black flex-1 text-center"></span>
//               </div>
//               <div className="flex gap-2 mt-2">
//                 <span className="font-semibold">Responsibility Center Code:</span>
//                 <span className="border-b border-black flex-1 text-center text-[10px] font-bold leading-tight">{report.centerCode}</span>
//               </div>
//             </div>
//           </div>

//           {/* Table Headers */}
//           <div className="grid grid-cols-12 border-b-2 border-black text-[11px] font-bold text-center bg-gray-50 print:bg-white divide-x-2 divide-black">
//             <div className="col-span-2 p-1.5 flex items-center justify-center">PARTICULARS</div>
//             <div className="col-span-4 p-1.5 flex items-center justify-center">DETAILS</div>
//             <div className="col-span-2 p-1.5 flex items-center justify-center">AMOUNT</div>
//             <div className="col-span-4 p-0 flex flex-col">
//               <div className="border-b-2 border-black p-1">JEV Details</div>
//               <div className="grid grid-cols-2 h-full divide-x-2 divide-black">
//                 <div className="p-1 flex items-center justify-center">Account Code</div>
//                 <div className="p-1 flex items-center justify-center">Amount</div>
//               </div>
//             </div>
//           </div>

//           {/* Table Body (Expenses) */}
//           <div className="min-h-[140mm] flex flex-col">
            
//             {/* Fund Purpose Header */}
//             <div className="grid grid-cols-12 text-xs font-bold divide-x-2 divide-black">
//               <div className="col-span-2 p-1.5"></div>
//               <div className="col-span-4 p-1.5 text-center">{report.fundPurpose}</div>
//               <div className="col-span-2 p-1.5"></div>
//               <div className="col-span-4 p-0 grid grid-cols-2 divide-x-2 divide-black">
//                 <div className="p-1.5"></div>
//                 <div className="p-1.5"></div>
//               </div>
//             </div>

//             {/* Individual Expense Rows */}
//             {expenses.map((exp: any) => (
//               <div key={exp.id} className="grid grid-cols-12 text-xs divide-x-2 divide-black">
//                 <div className="col-span-2 p-1.5 text-center">{new Date(exp.date).toLocaleDateString()}</div>
//                 <div className="col-span-4 p-1.5 break-words">
//                   {exp.description}
//                   {exp.taxAmount > 0 && <span className="text-[10px] block mt-0.5 italic">(Incl. Tax: ₱{exp.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>}
//                 </div>
//                 <div className="col-span-2 p-1.5 text-right font-medium">
//                   {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//                 </div>
//                 <div className="col-span-4 p-0 grid grid-cols-2 divide-x-2 divide-black">
//                   <div className="p-1.5"></div>
//                   <div className="p-1.5"></div>
//                 </div>
//               </div>
//             ))}

//             {/* Empty space filler */}
//             <div className="flex-1 grid grid-cols-12 divide-x-2 divide-black">
//               <div className="col-span-2"></div>
//               <div className="col-span-4"></div>
//               <div className="col-span-2"></div>
//               <div className="col-span-4 grid grid-cols-2 divide-x-2 divide-black">
//                 <div></div><div></div>
//               </div>
//             </div>

//             {/* Gross Total Row */}
//             <div className="grid grid-cols-12 border-t border-black text-xs font-bold divide-x-2 divide-black">
//               <div className="col-span-6 p-1.5 text-right uppercase">TOTAL AMOUNT SPENT</div>
//               <div className="col-span-2 p-1.5 text-right">
//                 {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//               </div>
//               <div className="col-span-4 p-0 grid grid-cols-2 divide-x-2 divide-black">
//                 <div className="p-1.5"></div>
//                 <div className="p-1.5"></div>
//               </div>
//             </div>

//             {/* BIR Deduction Row */}
//             <div className="grid grid-cols-12 border-t border-black text-xs font-bold divide-x-2 divide-black">
//               <div className="col-span-6 p-1.5 text-right uppercase">LESS: BIR TAX DEDUCTION</div>
//               <div className="col-span-2 p-1.5 text-right text-red-700">
//                 ({birTax.toLocaleString(undefined, { minimumFractionDigits: 2 })})
//               </div>
//               <div className="col-span-4 p-0 grid grid-cols-2 divide-x-2 divide-black">
//                 <div className="p-1.5"></div>
//                 <div className="p-1.5"></div>
//               </div>
//             </div>

//             {/* Net Amount / Amount Refunded Row */}
//             <div className="grid grid-cols-12 border-t-2 border-black text-xs font-bold divide-x-2 divide-black">
//               <div className="col-span-6 p-1.5 text-right uppercase">NET AMOUNT CLAIMED</div>
//               <div className="col-span-2 p-1.5 text-right">
//                 {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
//               </div>
//               <div className="col-span-4 p-0 grid grid-cols-2 divide-x-2 divide-black">
//                 <div className="p-1.5"></div>
//                 <div className="p-1.5"></div>
//               </div>
//             </div>
//           </div>

//           {/* Certification Boxes (A, B, C) */}
//           <div className="flex border-t-2 border-black h-[45mm]">
            
//             {/* Box A - Principal */}
//             <div className="w-1/3 border-r-2 border-black p-2 flex flex-col justify-between text-xs">
//               <div>
//                 <div className="flex gap-1 items-start">
//                   <div className="border border-black px-1 font-bold">A</div>
//                   <div className="leading-tight">Certified: Correctness of the above data</div>
//                 </div>
//               </div>
//               <div className="text-center mt-auto mb-2">
//                 <div className="font-bold uppercase underline underline-offset-4 decoration-[1.5px] text-[11px]">
//                   {activePrincipal?.name || report.principalName || "__________________________"}
//                 </div>
//                 <div className="text-[10px] mt-0.5">Signature over Printed Name</div>
//                 <div className="text-[10px] font-medium mt-0.5">
//                   {activePrincipal?.position || report.principalPosition || "Principal II"}
//                 </div>
//               </div>
//             </div>

//             {/* Box B - ASDS & SDS */}
//             <div className="w-1/3 border-r-2 border-black p-2 flex flex-col justify-between text-xs">
//               <div>
//                 <div className="flex gap-1 items-start">
//                   <div className="border border-black px-1 font-bold">B</div>
//                   <div className="leading-tight">Certified: Purpose of travel /<br/>cash advance duly accomplished</div>
//                 </div>
//               </div>
//               <div className="text-center my-auto">
//                 <div className="font-bold uppercase underline underline-offset-4 decoration-[1.5px] text-[11px]">
//                   {activeSds?.name || report.asdsName || "ARLENE S. RICASATA, CESO VI"}
//                 </div>
//                 <div className="text-[10px] mt-0.5">Signature over Printed Name</div>
//                 <div className="text-[10px] font-medium leading-tight mt-1 space-y-0.5">
//                   <div>Assistant Schools Division Superintendent</div>
//                   {(activeSds?.position?.toLowerCase().includes("oic") || activeSds?.position?.toLowerCase().includes("officer-in-charge")) ? (
//                     <>
//                       <div>Officer-in-Charge</div>
//                       <div>Schools Division Superintendent</div>
//                     </>
//                   ) : (
//                     <div>Schools Division Superintendent</div>
//                   )}
//                 </div>
//               </div>
//               <div className="text-left text-[11px] mt-1">
//                 Date: ____________________
//               </div>
//             </div>

//             {/* Box C - Accountant */}
//             <div className="w-1/3 p-2 flex flex-col justify-between text-xs">
//               <div>
//                 <div className="flex gap-1 items-start">
//                   <div className="border border-black px-1 font-bold">C</div>
//                   <div className="leading-tight">Certified: Supporting documents<br/>complete and proper</div>
//                 </div>
//               </div>
//               <div className="text-center mt-auto mb-2">
//                 <div className="font-bold uppercase underline underline-offset-4 decoration-[1.5px] text-[11px]">
//                   {activeAccountant?.name || report.accountantName || "JUAN DELA CRUZ, CPA"}
//                 </div>
//                 <div className="text-[10px] mt-0.5">Signature over Printed Name</div>
//                 <div className="text-[10px] font-medium mt-0.5">
//                   {activeAccountant?.position || report.accountantPosition || "Head, Accounting Division Unit"}
//                 </div>
//               </div>
//               <div className="text-left text-[11px] mt-1">
//                 JEV No.: _________________
//               </div>
//             </div>

//           </div>
//         </div>
//       </div>
      
//       <style dangerouslySetInnerHTML={{__html: `
//         @media print {
//           @page { size: A4; margin: 0; }
//           body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
//         }
//       `}} />
//     </div>
//   );
// }

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintPageButton from "@/src/components/PrintPageButton";

export const dynamic = "force-dynamic";

export default async function PrintReportPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = await params;
  const targetId = resolvedParams.id?.replace(/[{}]/g, "").trim();

  if (!targetId) notFound();

  let report: any = null;
  let allocation: any = null;

  try {
    report = await prisma.liquidationReport.findUnique({
      where: { id: targetId },
      include: {
        allocation: true,
        expenses: { orderBy: { date: 'asc' } }
      }
    });

    if (report) {
      allocation = report.allocation;
    } else {
      allocation = await prisma.monthlyAllocation.findUnique({
        where: { id: targetId },
        include: {
          reports: {
            include: {
              expenses: { orderBy: { date: 'asc' } }
            }
          }
        }
      });
      if (allocation && allocation.reports.length > 0) {
        report = allocation.reports[0];
      }
    }
  } catch (error) {
    console.error("Error fetching print report data:", error);
  }

  if (!allocation || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Report Not Found</h2>
          <p className="text-sm text-gray-600 mb-6">
            The liquidation report for this month has not been initialized or contains no valid data yet.
          </p>
          <Link 
            href="/dashboard/expenses" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            &larr; Return to Allocations
          </Link>
        </div>
      </div>
    );
  }

  const expenses = report.expenses || [];
  
  const entityName = report.entityName || "BINAN CITY SENIOR HIGH SCHOOL-WEST CAMPUS";
  const fundCluster = report.fundCluster || "01";
  const responsibilityCenterCode = report.centerCode || "070010804019";
  const fundPurpose = report.fundPurpose || "MOOE";
  const yearlySequence = report.yearlySequence || 1;
  const birDeduction = report.birDeduction || 0;
  const dvNumber = report.dvNumber || "___________";

  const formatDate = (dateString?: Date | null) => {
    if (!dateString) return "___________";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatDateOrBlank = (dateString?: Date | null, status?: string) => {
    if (!dateString || status !== 'APPROVED') return "______________";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  
  const dvDate = formatDate(report.dvDate);
  const reportDate = formatDateOrBlank(report.submittedAt, report.status);
  const preparedDate = formatDateOrBlank(report.submittedAt, report.status);

  const reportMonth = new Date();
  reportMonth.setMonth(report.month - 1);
  const monthName = reportMonth.toLocaleString('en-US', { month: 'long' });

  const serialNo = `${report.year}-${report.month.toString().padStart(2, '0')}-${yearlySequence.toString().padStart(3, '0')}`;

  const grossTotal = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
  const totalAmountSpent = grossTotal - birDeduction;

  // Signatories lookup with strict position checking
  const allSignatories = await prisma.signatory.findMany({ where: { isActive: true } });
  
  const regularPrincipal = allSignatories.find(s => s.position.toLowerCase().includes('principal') && !s.position.toLowerCase().includes('oic') && !s.position.toLowerCase().includes('teacher-in-charge'));
  const regularSds = allSignatories.find(s => (s.position.toLowerCase().includes('schools division superintendent') || s.position.toLowerCase().includes('sds')) && !s.position.toLowerCase().includes('oic') && !s.position.toLowerCase().includes('assistant'));
  const regularAccountant = allSignatories.find(s => s.position.toLowerCase().includes('accountant') && !s.position.toLowerCase().includes('oic'));

  const oicPrincipal = allSignatories.find(s => s.position.toLowerCase().includes('oic') && (s.position.toLowerCase().includes('principal') || s.position.toLowerCase().includes('teacher-in-charge')));
  const oicSds = allSignatories.find(s => s.position.toLowerCase().includes('oic') && (s.position.toLowerCase().includes('sds') || s.position.toLowerCase().includes('superintendent')));
  const oicAccountant = allSignatories.find(s => s.position.toLowerCase().includes('oic') && s.position.toLowerCase().includes('accountant'));

  const activePrincipal = (regularPrincipal && regularPrincipal.name) ? regularPrincipal : oicPrincipal;
  const activeSds = (regularSds && regularSds.name) ? regularSds : oicSds;
  const activeAccountant = (regularAccountant && regularAccountant.name) ? regularAccountant : oicAccountant;

  const principalName = activePrincipal?.name || report.principalName || "________________________";
  // const principalPosition = activePrincipal?.position || report.principalPosition || "School Principal II";
  
  const sdsName = activeSds?.name || report.asdsName || "ARLENE S.RICAISATA, CESO VI";
  const sdsPositionStr = activeSds?.position || "";
  // const isSdsOic = sdsPositionStr.toLowerCase().includes('oic') || sdsPositionStr.toLowerCase().includes('officer-in-charge');

  const accountantName = activeAccountant?.name || report.accountantName || "________________________";
  // const accountantPosition = activeAccountant?.position || report.accountantPosition || "Head, Accounting Division Unit";

  const cleanPos = (rawPosition: string) => {
    return rawPosition
      .replace(/officer-in-charge|oic/gi, '')
      .replace(/^[\s,\-\/]+|[\s,\-\/]+$/g, '')
      .trim();
  };

  const principalPositionRaw = activePrincipal?.position || report.principalPosition || "School Principal II";
  const isPrincipalOic = principalPositionRaw.toLowerCase().includes('oic') || principalPositionRaw.toLowerCase().includes('officer-in-charge');
  const principalPosition = cleanPos(principalPositionRaw) || "School Principal II";

  const sdsPositionRaw = activeSds?.position || report.asdsName || "Schools Division Superintendent";
  const isSdsOic = sdsPositionRaw.toLowerCase().includes('oic') || sdsPositionRaw.toLowerCase().includes('officer-in-charge');
  const sdsPosition = cleanPos(sdsPositionRaw) || "Schools Division Superintendent";

  const accountantPositionRaw = activeAccountant?.position || report.accountantPosition || "Head, Accounting Division Unit";
  const isAccountantOic = accountantPositionRaw.toLowerCase().includes('oic') || accountantPositionRaw.toLowerCase().includes('officer-in-charge');
  const accountantPosition = cleanPos(accountantPositionRaw) || "Head, Accounting Division Unit";

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white text-black">
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link 
          href={`/dashboard/expenses/${allocation.id}`} 
          className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2"
        >
          &larr; Back to Expenses
        </Link>
        <div className="print:hidden">
          <PrintPageButton />
        </div>
      </div>

      {/* A4 Print Container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:m-0 box-border overflow-hidden report-page" 
           style={{ minHeight: '297mm', padding: '10mm 15mm' }}>
        
        {/* Appendix 44 */}
        <div style={{ textAlign: 'right', fontSize: '10pt', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '8px', paddingRight: '8px', width: '100%' }}>
          Appendix 44
        </div>

        {/* MASTER TABLE: Perfect for both PDF and MS Word (No Gaps) */}
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ border: '2px solid black', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }} className="font-serif text-[10pt] leading-tight text-black">
          <tbody>
            <tr>
              <td style={{ padding: 0, margin: 0, verticalAlign: 'top' }}>
                
                {/* TABLE 1: Headers & Expenses (70% / 30%) */}
                <table width="100%" cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse', margin: 0, tableLayout: 'fixed' }}>
                  <tbody>
                    {/* Header Row 1 */}
                    <tr>
                      <td style={{ width: '70%', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', letterSpacing: '0.025em', margin: 0 }}>LIQUIDATION REPORT</h1>
                        <p style={{ fontSize: '0.875rem', margin: '4px 0 0 0' }}>Period Covered: <strong style={{ textTransform: 'uppercase' }}>{monthName} {report.year}</strong></p>
                      </td>
                      <td style={{ width: '30%', borderBottom: '1px solid black', padding: '12px', fontSize: '0.875rem', verticalAlign: 'middle' }}>
                        <p style={{ margin: 0 }}>Serial No.: <strong><u style={{ textUnderlineOffset: '2px' }}>{serialNo}</u></strong></p>
                        <p style={{ margin: '4px 0 0 0' }}>Date: <strong><u style={{ textUnderlineOffset: '2px' }}>{reportDate}</u></strong></p>
                      </td>
                    </tr>

                    {/* Header Row 2 */}
                    <tr>
                      <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '12px', verticalAlign: 'middle' }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>Entity Name : <span style={{ fontWeight: 'normal' }}>{entityName}</span></p>
                        <p style={{ fontWeight: 'bold', margin: '4px 0 0 0' }}>Fund Cluster : <span style={{ fontWeight: 'normal', textDecoration: 'underline', textUnderlineOffset: '2px' }}>&nbsp;&nbsp;{fundCluster}&nbsp;&nbsp;</span></p>
                      </td>
                      <td style={{ borderBottom: '1px solid black', padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <p style={{ margin: 0 }}>Responsibility Center Code:</p>
                        <p style={{ fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '2px', margin: '4px 0 0 0' }}>{responsibilityCenterCode}</p>
                      </td>
                    </tr>

                    {/* Table Headers */}
                    <tr>
                      <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>PARTICULARS</td>
                      <td style={{ borderBottom: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>AMOUNT</td>
                    </tr>

                    {/* Body Intro */}
                    <tr>
                      <td style={{ borderRight: '1px solid black', padding: '12px', textAlign: 'justify', verticalAlign: 'top' }}>
                        To liquidate the cash advance for {fundPurpose} of {entityName} as per supporting documents attached in the amount of ....
                      </td>
                      <td style={{ borderBottom: 'none', padding: '12px' }}></td>
                    </tr>

                    {/* Expenses Mapping */}
                    {expenses.map((expense: any) => (
                      <tr key={expense.id}>
                        <td style={{ borderRight: '1px solid black', padding: '4px 16px', fontSize: '0.75rem', wordBreak: 'break-word' }}>
                          {expense.category.replace(/_/g, " ")} {expense.description ? `- ${expense.description}` : ""}
                        </td>
                        <td style={{ padding: '4px 16px', textAlign: 'right', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    {/* Spacer */}
                    <tr>
                      <td style={{ borderRight: '1px solid black', padding: '24px 0' }}></td>
                      <td></td>
                    </tr>

                    {/* BIR Deduction */}
                    {birDeduction > 0 && (
                      <tr>
                        <td style={{ borderRight: '1px solid black', padding: '8px 16px', fontWeight: '500', color: '#dc2626', fontSize: '0.75rem' }}>DUE TO B.I.R.</td>
                        <td style={{ padding: '8px 16px', textAlign: 'right', color: '#dc2626', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {birDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}

                    {/* TOTAL AMOUNT SPENT - (With Inner Table for Arrow alignment) */}
                    <tr>
                      <td style={{ borderTop: '1px solid black', borderRight: '1px solid black', padding: '6px 8px' }}>
                        <table width="100%" cellPadding={0} cellSpacing={0} border={0}>
                          <tbody><tr>
                            <td align="left" style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>TOTAL AMOUNT SPENT</td>
                            <td align="right" style={{ fontWeight: 'bold' }}>&rarr;</td>
                          </tr></tbody>
                        </table>
                      </td>
                      <td style={{ borderTop: '1px solid black', padding: '6px 16px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {totalAmountSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* AMOUNT OF CASH ADVANCE */}
                    <tr>
                      <td style={{ borderTop: '1px solid black', borderRight: '1px solid black', padding: '6px 8px' }}>
                        <table width="100%" cellPadding={0} cellSpacing={0} border={0}>
                          <tbody><tr>
                            <td align="left" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                              AMOUNT OF CASH ADVANCE PER DV NO. <strong><u style={{ textUnderlineOffset: '2px' }}>{dvNumber}</u></strong> DTD. <strong><u style={{ textUnderlineOffset: '2px' }}>________</u></strong>
                            </td>
                            <td align="right" style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>&rarr;</td>
                          </tr></tbody>
                        </table>
                      </td>
                      <td style={{ borderTop: '1px solid black', padding: '6px 16px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {totalAmountSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* AMOUNT REFUNDED */}
                    <tr>
                      <td style={{ borderTop: '1px solid black', borderRight: '1px solid black', padding: '6px 8px' }}>
                        <table width="100%" cellPadding={0} cellSpacing={0} border={0}>
                          <tbody><tr>
                            <td align="left" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                              AMOUNT REFUNDED PER OR NO. <span style={{ display: 'inline-block', width: '64px', borderBottom: '1px solid black' }}></span> DTD. <span style={{ display: 'inline-block', width: '64px', borderBottom: '1px solid black' }}></span>
                            </td>
                            <td align="right" style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>&rarr;</td>
                          </tr></tbody>
                        </table>
                      </td>
                      <td style={{ borderTop: '1px solid black', padding: '6px 16px', textAlign: 'right', fontSize: '0.75rem' }}></td>
                    </tr>

                    {/* AMOUNT TO BE REIMBURSED */}
                    <tr>
                      <td style={{ borderTop: '1px solid black', borderRight: '1px solid black', padding: '6px 8px' }}>
                        <table width="100%" cellPadding={0} cellSpacing={0} border={0}>
                          <tbody><tr>
                            <td align="left" style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem' }}>AMOUNT TO BE REIMBURSED</td>
                            <td align="right" style={{ fontWeight: 'bold' }}>&rarr;</td>
                          </tr></tbody>
                        </table>
                      </td>
                      <td style={{ borderTop: '1px solid black', padding: '6px 16px', textAlign: 'right', fontSize: '1rem', fontWeight: 'bold' }}>
                        -
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* TABLE 2: Signatures (31% / 39% / 30%) */}
                <table width="100%" cellPadding={0} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse', margin: 0, tableLayout: 'fixed', borderTop: '1px solid black' }}>
                  <tbody>
                    <tr style={{ height: '145px' }}>
                      
                      {/* Box A */}
                      <td style={{ width: '31%', borderRight: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '11px', marginBottom: '16px', lineHeight: '1.2' }}>
                          <span style={{ border: '1px solid black', padding: '0 4px', fontWeight: 'bold', marginRight: '6px' }}>A</span>
                          Certified: Correctness of the above data
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                          <div style={{ fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: '4px', fontSize: '11px' }}>
                            {principalName}
                          </div>
                          <div style={{ fontSize: '10px', marginTop: '2px' }}>Signature over Printed Name</div>
                          <div style={{ fontSize: '10px', fontWeight: '500', marginTop: '2px', lineHeight: '1.2' }}>
                            {isPrincipalOic && <div>Officer-in-Charge</div>}
                            <div>{principalPosition}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', fontSize: '11px', marginTop: '16px' }}>
                          Date: <strong>{preparedDate}</strong>
                        </div>
                      </td>

                      {/* Box B */}
                      <td style={{ width: '39%', borderRight: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '11px', marginBottom: '16px', lineHeight: '1.2' }}>
                          <span style={{ border: '1px solid black', padding: '0 4px', fontWeight: 'bold', marginRight: '6px' }}>B</span>
                          Certified: Purpose of travel /<br/>cash advance duly accomplished
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                          <div style={{ fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: '4px', fontSize: '11px' }}>
                            {sdsName}
                          </div>
                          <div style={{ fontSize: '10px', marginTop: '2px' }}>Signature over Printed Name</div>
                          <div style={{ fontSize: '10px', fontWeight: '500', lineHeight: '1.2', marginTop: '4px' }}>
                            {isSdsOic && <div>Officer-in-Charge</div>}
                            <div>{sdsPosition}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', fontSize: '11px', marginTop: '16px' }}>
                          Date: ______________
                        </div>
                      </td>

                      {/* Box C */}
                      <td style={{ width: '30%', padding: '8px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '11px', marginBottom: '16px', lineHeight: '1.2' }}>
                          <span style={{ border: '1px solid black', padding: '0 4px', fontWeight: 'bold', marginRight: '6px' }}>C</span>
                          Certified: Supporting documents<br/>complete and proper
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                          <div style={{ fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: '4px', fontSize: '11px' }}>
                            {accountantName}
                          </div>
                          <div style={{ fontSize: '10px', marginTop: '2px' }}>Signature over Printed Name</div>
                          <div style={{ fontSize: '10px', fontWeight: '500', marginTop: '2px', lineHeight: '1.2' }}>
                            {isAccountantOic && <div>Officer-in-Charge</div>}
                            <div>{accountantPosition}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'left', fontSize: '11px', marginTop: '16px', lineHeight: '1.4' }}>
                          <div>JEV No.: ______________</div>
                          <div>Date: ______________</div>
                        </div>
                      </td>

                    </tr>
                  </tbody>
                </table>

              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          aside, nav, header, footer, .sidebar, [class*="sidebar"], [class*="nav"] {
            display: none !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            height: 100% !important;
            overflow: hidden !important;
          }

          .report-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            padding: 10mm 15mm !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
          }
        }

        .report-page {
          box-sizing: border-box;
          font-family: 'Times New Roman', Times, serif;
          color: #000;
        }
      `}</style>
    </div>
  );
}