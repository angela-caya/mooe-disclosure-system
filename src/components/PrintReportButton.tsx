// "use client";

// import { useState } from "react";

// interface PrintReportButtonProps {
//   reportId: string;
// }

// export default function PrintReportButton({ reportId }: PrintReportButtonProps) {
//   const [isPrinting, setIsPrinting] = useState(false);

//   const handlePrint = async () => {
//     setIsPrinting(true);
    
//     // Gagawa tayo ng hidden iframe na naka-point sa ating /print/ api route o hidden page
//     const printFrame = document.createElement("iframe");
//     printFrame.style.position = "fixed";
//     printFrame.style.right = "0";
//     printFrame.style.bottom = "0";
//     printFrame.style.width = "0";
//     printFrame.style.height = "0";
//     printFrame.style.border = "0";
    
//     // Naka-point sa pahinang dinisenyo para iprinta (na hindi na pupuntahan ng user manually)
//     printFrame.src = `/dashboard/expenses/${reportId}/print-view`; 
    
//     printFrame.onload = () => {
//       // Kapag nag-load na ang iframe, i-trigger natin ang browser print dialog
//       setTimeout(() => {
//         printFrame.contentWindow?.print();
//         setIsPrinting(false);
//         // Tanggalin ang iframe pagkatapos mag-print o i-cancel
//         setTimeout(() => {
//           document.body.removeChild(printFrame);
//         }, 1000);
//       }, 500); 
//     };

//     document.body.appendChild(printFrame);
//   };

//   return (
//     <button 
//       onClick={handlePrint}
//       disabled={isPrinting}
//       className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
//     >
//       <span>🖨️</span>
//       {isPrinting ? 'Preparing PDF...' : 'Print PDF'}
//     </button>
//   );
// }

"use client";

import { useState } from "react";

interface PrintReportButtonProps {
  reportId: string;
}

export default function PrintReportButton({ reportId }: PrintReportButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    
    // FIX: Nagdagdag tayo ng `?t=${Date.now()}` para hindi gamitin ng browser ang lumang naka-cache na design!
    printFrame.src = `/dashboard/expenses/${reportId}/print-view?t=${Date.now()}`; 
    
    printFrame.onload = () => {
      setTimeout(() => {
        printFrame.contentWindow?.print();
        setIsPrinting(false);
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500); 
    };

    document.body.appendChild(printFrame);
  };

  return (
    <button 
      onClick={handlePrint}
      disabled={isPrinting}
      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
    >
      <span>🖨️</span>
      {/* Pinalitan din natin ang text para hindi isipin na 'Save' lang ito */}
      {isPrinting ? 'Preparing Document...' : 'Print Report'}
    </button>
  );
}