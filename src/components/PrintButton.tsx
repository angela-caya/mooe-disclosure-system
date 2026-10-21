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
    
    printFrame.src = `/dashboard/expenses/${reportId}/print-view`; 
    
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
      {isPrinting ? 'Preparing Document...' : 'Print Report'}
    </button>
  );
}