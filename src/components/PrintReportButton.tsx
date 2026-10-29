"use client";

import { useState } from "react";

interface PrintReportButtonProps {
  allocationId: string;
  monthName: string;
  year: number;
}

export default function PrintReportButton({ allocationId, monthName, year }: PrintReportButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0); // Tracking progress for UX feedback

  const handlePrint = async () => {
    if (!allocationId) {
      alert("Allocation ID is missing.");
      return;
    }

    setIsPrinting(true);
    const cleanId = String(allocationId).replace(/[{}]/g, "").trim();

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    
    printFrame.src = `/dashboard/print-report/${cleanId}?t=${Date.now()}`; 
    
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

  // Implement asynchronous report generation to prevent UI blocking on large datasets (ISO 25010: Performance Efficiency 2.3)
  const handleExportWord = async () => {
    setIsExporting(true);
    setProgress(10);
    
    try {
      const cleanId = String(allocationId).replace(/[{}]/g, "").trim();
      
      // Fetch raw HTML payload
      const response = await fetch(`/dashboard/print-report/${cleanId}`);
      const htmlText = await response.text();
      setProgress(40);

      // Yield execution to the browser to prevent main thread blocking during massive string parsing
      await new Promise(resolve => setTimeout(resolve, 50));

      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(htmlText, 'text/html');
      setProgress(60);

      // 1. Find Appendix 44 and align right
      const allDivs = htmlDoc.querySelectorAll('div');
      allDivs.forEach(div => {
        if (div.textContent && div.textContent.trim() === 'Appendix 44') {
          div.style.textAlign = 'right';
          div.style.display = 'block';
          div.style.width = '100%';
        }
      });

      // Yield execution again before heavy DOM manipulation
      await new Promise(resolve => setTimeout(resolve, 50));
      setProgress(80);

      // 2. Wrap main container in Master Table
      const borderDiv = htmlDoc.querySelector('.border-2.border-black');
      if (borderDiv) {
        const innerContent = borderDiv.innerHTML;
        borderDiv.outerHTML = `
          <table style="border: 2px solid black; width: 100%; border-collapse: collapse; box-sizing: border-box;">
            <tbody>
              <tr><td style="padding: 0;">${innerContent}</td></tr>
            </tbody>
          </table>
        `;
      }

      const reportElement = htmlDoc.querySelector('.report-page')?.innerHTML || htmlText;
      const defaultFileName = `Liquidation-Report-${monthName}-${year}.doc`;

      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Liquidation Report</title>
          <style>
            @page WordSection1 {
              size: 8.27in 11.69in;
              margin: 0.3in 0.3in 0.3in 0.3in;
              mso-header-margin: 0.2in;
              mso-footer-margin: 0.2in;
              mso-paper-source: 0;
            }
            div.WordSection1 { page: WordSection1; }
          </style>
        </head>
        <body>
          <div class="WordSection1">
      `;
      
      const footer = "</div></body></html>";
      const sourceHTML = header + reportElement + footer;
      
      // Final yield before Blob generation
      await new Promise(resolve => setTimeout(resolve, 50));
      setProgress(100);

      const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = defaultFileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export Word document.");
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handlePrint}
        disabled={isPrinting || isExporting}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-2 disabled:opacity-50"
      >
        <span>🖨️</span>
        {isPrinting ? 'Preparing...' : 'Print Report'}
      </button>

      <button 
        onClick={handleExportWord}
        disabled={isExporting || isPrinting}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-2 disabled:opacity-50 relative overflow-hidden"
      >
        {isExporting && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-blue-800 transition-all duration-300"
            style={{ width: `${progress}%`, zIndex: 0 }}
          />
        )}
        <span className="relative z-10">📄</span>
        <span className="relative z-10">{isExporting ? `Generating (${progress}%)...` : 'Export to Word'}</span>
      </button>
    </div>
  );
}