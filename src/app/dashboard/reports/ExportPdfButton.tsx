'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Define the shape of the data we will receive from the main page
interface ReportData {
  id: string
  expenseType: string
  description: string | null
  amountSpent: number
  allocation: {
    month: string
  }
}

export default function ExportPdfButton({ reports }: { reports: ReportData[] }) {
  const generatePDF = () => {
    // Initialize standard A4 page
    const doc = new jsPDF()

    // Add Report Header
    doc.setFontSize(16)
    doc.text('MOOE Liquidation Report', 14, 20)
    
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28)

    // Prepare table columns and rows
    const tableColumn = ["Budget Month", "Category", "Description", "Amount (PHP)"]
    const tableRows = reports.map(report => [
      report.allocation.month,
      report.expenseType,
      report.description || "N/A",
      report.amountSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ])

    // Generate the table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }, // Blue header matching our theme
      styles: { fontSize: 10 },
    })

    // Calculate total expenses for the footer
    const totalAmount = reports.reduce((sum, report) => sum + report.amountSpent, 0)
    const finalY = (doc as any).lastAutoTable.finalY || 40

    // Add Total Amount below the table
    doc.setFontSize(12)
    doc.setTextColor(200, 0, 0) // Red text for expenses
    doc.text(
      `Total Expenses: PHP ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      14, 
      finalY + 10
    )

    // Trigger PDF download
    doc.save('MOOE_Liquidation_Report.pdf')
  }

  return (
    <button 
      onClick={generatePDF}
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download PDF
    </button>
  )
}