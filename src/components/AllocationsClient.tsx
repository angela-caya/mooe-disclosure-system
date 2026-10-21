"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface AllocationsClientProps {
  allocations: any[];
  createDraft: (formData: FormData) => Promise<void>;
}

const MONTHS = [
  { val: 1, label: "January" }, { val: 2, label: "February" }, { val: 3, label: "March" },
  { val: 4, label: "April" }, { val: 5, label: "May" }, { val: 6, label: "June" },
  { val: 7, label: "July" }, { val: 8, label: "August" }, { val: 9, label: "September" },
  { val: 10, label: "October" }, { val: 11, label: "November" }, { val: 12, label: "December" }
];

export default function AllocationsClient({ allocations, createDraft }: AllocationsClientProps) {
  const availableYears = Array.from(new Set(allocations.map(a => a.year))).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] || currentYear);

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    "DRAFT": true,
    "PENDING": true,
    "APPROVED": true
  });

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFilterToggle = (status: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const getMonthName = (monthNum: number) => {
    return MONTHS.find(m => m.val === monthNum)?.label || "Unknown";
  };

  const filteredAllocations = useMemo(() => {
    return allocations.filter(alloc => {
      const status = alloc.reports[0]?.status || "DRAFT";
      const matchesYear = alloc.year === selectedYear;
      const matchesStatus = filters[status as keyof typeof filters];
      return matchesYear && matchesStatus;
    });
  }, [allocations, selectedYear, filters]);

  const handleCreateDraft = async (formData: FormData) => {
    await createDraft(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Manage Allocations</h1>
          <p className="text-gray-600 mt-1 text-sm">Select a fiscal month to record or review liquidation expenses.</p>
        </div>

        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3">
            {/* UX: Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm hover:border-blue-400 transition-colors cursor-pointer">
              <label htmlFor="yearFilter" className="text-sm font-semibold text-gray-500 uppercase cursor-pointer">Fiscal Year:</label>
              <select 
                id="yearFilter"
                className="text-sm font-bold border-none bg-transparent focus:ring-0 cursor-pointer text-gray-900 outline-none"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.length > 0 ? (
                  availableYears.map(year => <option key={year} value={year}>{year}</option>)
                ) : (
                  <option value={currentYear}>{currentYear}</option>
                )}
              </select>
            </div>
            
            {/* UX: Subtle Lift Animation on Button */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              + New Draft
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(filters) as Array<keyof typeof filters>).map((status) => (
              <label 
                key={status} 
                className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 hover:-translate-y-0.5 ${
                  filters[status] 
                    ? 'bg-gray-800 text-white border-gray-800 shadow-sm' 
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={filters[status]} 
                  onChange={() => handleFilterToggle(status)} 
                />
                {status}
              </label>
            ))}
          </div>
        </div>
      </div>

      {filteredAllocations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-500 flex flex-col items-center">
          <span className="text-4xl mb-3">📭</span>
          <p className="font-semibold text-lg text-gray-700">No allocations found</p>
          <p className="text-sm mt-1">Try adjusting your year/status filters or create a new draft.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAllocations.map(alloc => {
            const activeReport = alloc.reports[0];
            const status = activeReport?.status || 'DRAFT';
            const expenses = activeReport?.expenses || [];
            const totalDisbursed = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
            const isExpanded = expandedCards[alloc.id];
            
            return (
              // UX: Card lift effect
              <div key={alloc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{getMonthName(alloc.month)} {alloc.year}</h2>
                    <p className="text-sm text-gray-600 font-medium mt-1">Budget: ₱{alloc.totalAmount.toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                    status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    status === 'DRAFT' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {status}
                  </span>
                </div>
                
                <div className="mb-4">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((totalDisbursed / alloc.totalAmount) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-600 font-medium">₱{totalDisbursed.toLocaleString()} utilized</p>
                    {expenses.length > 0 && (
                      <button 
                        onClick={() => toggleExpand(alloc.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 focus:outline-none transition-colors cursor-pointer"
                      >
                        {isExpanded ? 'Hide items ▲' : 'View items ▼'}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && expenses.length > 0 && (
                  <div className="mb-5 bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2 max-h-48 overflow-y-auto shadow-inner">
                    {expenses.map((exp: any) => (
                      <div key={exp.id} className="flex justify-between items-start text-sm border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                        <div className="pr-2">
                          <p className="font-semibold text-gray-800 truncate">{exp.category.replace("_", " ")}</p>
                          <p className="text-xs text-gray-500 truncate">{exp.description}</p>
                        </div>
                        <span className="font-bold text-red-600 shrink-0">₱{exp.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <Link 
                    href={`/dashboard/expenses/${alloc.id}`}
                    className={`block w-full text-center font-semibold py-2.5 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                      status === 'DRAFT' 
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:shadow-sm' 
                        : status === 'PENDING'
                        ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 hover:shadow-sm'
                        : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:shadow-sm'
                    }`}
                  >
                    {status === 'DRAFT' ? 'Continue Draft →' : 
                     status === 'PENDING' ? 'View Pending Report →' : 
                     'View Approved Record →'}
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* UX: Modal form fields with explicit ids, htmlFors, and text-gray-900 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-transform">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg tracking-tight">Initialize New Draft</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 font-bold text-2xl leading-none cursor-pointer transition-colors">&times;</button>
            </div>
            
            <form action={handleCreateDraft} className="p-6 space-y-5">
              <div>
                <label htmlFor="modalYear" className="block text-sm font-semibold text-gray-700 mb-1">Fiscal Year</label>
                <input 
                  id="modalYear"
                  type="number" 
                  name="year" 
                  defaultValue={currentYear} 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="modalMonth" className="block text-sm font-semibold text-gray-700 mb-1">Target Month</label>
                <select 
                  id="modalMonth"
                  name="month" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer transition-shadow"
                >
                  {MONTHS.map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="modalAmount" className="block text-sm font-semibold text-gray-700 mb-1">Budget Allocation (₱)</label>
                <input 
                  id="modalAmount"
                  type="number" 
                  name="totalAmount" 
                  step="0.01" 
                  placeholder="e.g. 50000"
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  Create Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}