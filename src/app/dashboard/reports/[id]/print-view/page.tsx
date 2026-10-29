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