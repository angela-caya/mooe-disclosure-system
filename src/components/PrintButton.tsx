"use client";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="bg-blue-600 text-white px-6 py-2 rounded font-bold shadow-md hover:bg-blue-700"
    >
      🖨️ Print / Save as PDF
    </button>
  );
}