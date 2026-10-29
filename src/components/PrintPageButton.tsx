"use client";

export default function PrintPageButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition-colors cursor-pointer"
    >
      Print Appendix 44
    </button>
  );
}