"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface TransparencyClientProps {
  allocations: any[];
  expenses: any[];
  aipSettings: any[];
}

const MONTHS = [
  { val: 1, label: "January" }, { val: 2, label: "February" }, { val: 3, label: "March" },
  { val: 4, label: "April" }, { val: 5, label: "May" }, { val: 6, label: "June" },
  { val: 7, label: "July" }, { val: 8, label: "August" }, { val: 9, label: "September" },
  { val: 10, label: "October" }, { val: 11, label: "November" }, { val: 12, label: "December" }
];

export default function TransparencyClient({ allocations, expenses, aipSettings }: TransparencyClientProps) {
  const availableYears = Array.from(new Set(allocations.map(a => a.year))).sort((a, b) => b - a);
  const defaultYear = availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
  
  const [selectedYears, setSelectedYears] = useState<number[]>([defaultYear]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(MONTHS.map(m => m.val));

  // Process addition and removal of years for comparative filtering
  const addYear = (year: number) => {
    if (!selectedYears.includes(year)) setSelectedYears(prev => [...prev, year]);
  };
  const removeYear = (year: number) => {
    if (selectedYears.length > 1) setSelectedYears(prev => prev.filter(y => y !== year));
  };

  // Process addition and removal of months for comparative filtering
  const addMonth = (month: number) => {
    if (!selectedMonths.includes(month)) setSelectedMonths(prev => [...prev, month]);
  };
  const removeMonth = (month: number) => {
    if (selectedMonths.length > 1) setSelectedMonths(prev => prev.filter(m => m !== month));
  };

  const selectAllMonths = () => setSelectedMonths(MONTHS.map(m => m.val));

  // Aggregate financial metrics based on the dynamically selected temporal filters
  const { filteredAllocations, filteredExpenses, totalBudget, totalSpent, comparisonData, segments, activeAip } = useMemo(() => {
    const fallocs = allocations.filter(a => selectedYears.includes(a.year) && selectedMonths.includes(a.month));
    const fexps = expenses.filter(e => selectedYears.includes(e.report.year) && selectedMonths.includes(e.report.month));

    const tBudget = fallocs.reduce((sum, a) => sum + a.totalAmount, 0);
    const tSpent = fexps.reduce((sum, e) => sum + e.amount, 0);

    const compData: any[] = [];
    const segmentsTemp: any[] = [];
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-rose-500', 'bg-lime-500'];

    // Enforce ascending chronological order for visualizations
    const sortedYears = [...selectedYears].sort((a, b) => a - b);
    const sortedMonths = [...selectedMonths].sort((a, b) => a - b);

    sortedYears.forEach(year => {
      sortedMonths.forEach(month => {
        const alloc = fallocs.find(a => a.year === year && a.month === month);
        const expsForPeriod = fexps.filter(e => e.report.year === year && e.report.month === month);
        const spent = expsForPeriod.reduce((sum, e) => sum + e.amount, 0);
        
        if (alloc || spent > 0) {
          const monthLabel = MONTHS.find(m => m.val === month)?.label || "";

          compData.push({
            name: `${monthLabel.substring(0,3)} ${year}`,
            Allocation: alloc ? alloc.totalAmount : 0,
            Disbursed: spent
          });

          segmentsTemp.push({
            id: `${year}-${month}`,
            month: monthLabel,
            year: year,
            amount: spent,
            percentage: tBudget > 0 ? (spent / tBudget) * 100 : 0,
            color: colors[month - 1] 
          });
        }
      });
    });

    const latestSelectedYear = Math.max(...selectedYears);
    const aip = aipSettings.find(a => a.year === latestSelectedYear) || {
      utilitiesPercent: 0.30, suppliesPercent: 0.30, repairsPercent: 0.20,
      travelPercent: 0.05, trainingPercent: 0.05, othersPercent: 0.10,
    };

    return { 
      filteredAllocations: fallocs, 
      filteredExpenses: fexps, 
      totalBudget: tBudget, 
      totalSpent: tSpent, 
      comparisonData: compData, 
      segments: segmentsTemp,
      activeAip: aip 
    };
  }, [allocations, expenses, aipSettings, selectedYears, selectedMonths]);

  const overallUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const formatCurrency = (val: any) => `₱${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Calculate detailed category breakdown with segmented chronological tooltips
  const categoryData = [
    { id: "UTILITIES", label: "Utilities", targetPct: activeAip.utilitiesPercent, color: "bg-blue-500" },
    { id: "SUPPLIES", label: "Supplies", targetPct: activeAip.suppliesPercent, color: "bg-green-500" },
    { id: "MINOR_REPAIRS", label: "Repairs", targetPct: activeAip.repairsPercent, color: "bg-yellow-500" },
    { id: "TRAVEL", label: "Travel", targetPct: activeAip.travelPercent, color: "bg-purple-500" },
    { id: "TRAINING", label: "Training", targetPct: activeAip.trainingPercent, color: "bg-pink-500" },
    { id: "OTHERS", label: "Others", targetPct: activeAip.othersPercent, color: "bg-gray-500" },
  ].map(cat => {
    const catExpenses = filteredExpenses.filter(e => e.category === cat.id);
    const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
    const allocated = totalBudget * cat.targetPct;
    const utilizationPct = allocated > 0 ? (spent / allocated) * 100 : 0;

    // Group expenses chronologically for the segmented category progress bar
    const segmentMap = new Map<string, { month: number, year: number, amount: number }>();
    
    catExpenses.forEach(exp => {
      const m = exp.report.month;
      const y = exp.report.year;
      const key = `${y}-${m}`;
      if (!segmentMap.has(key)) {
        segmentMap.set(key, { month: m, year: y, amount: 0 });
      }
      segmentMap.get(key)!.amount += exp.amount;
    });

    const sortedSegments = Array.from(segmentMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const segments = sortedSegments.map(seg => {
      const monthLabel = MONTHS.find(m => m.val === seg.month)?.label || "";
      const widthPct = allocated > 0 ? (seg.amount / allocated) * 100 : 0;
      return { ...seg, monthLabel, widthPct };
    });

    return { ...cat, spent, utilizationPct, segments };
  });

  // Render a visual filter tag component
  const Tag = ({ label, onRemove }: { label: string, onRemove: () => void }) => (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full border border-blue-200">
      {label}
      <button onClick={onRemove} className="text-blue-500 hover:text-blue-900 rounded-full p-0.5 focus:outline-none">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 bg-blue-900 text-white p-8 rounded-xl shadow-lg">
          <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-wide">Public Transparency Board</h1>
          <p className="text-blue-200 mt-2 text-lg">MOOE Utilization & Analytics</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b pb-4">
            <h2 className="text-lg font-bold text-gray-800">Data Controls</h2>
            <button onClick={selectAllMonths} className="text-sm text-blue-600 font-bold hover:underline mt-2 md:mt-0">
              Reset to Full Year
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-500 uppercase">Active Years</span>
                <select 
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  onChange={(e) => {
                    if (e.target.value) addYear(Number(e.target.value));
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Compare Year</option>
                  {availableYears.filter(y => !selectedYears.includes(y)).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {[...selectedYears].sort((a, b) => a - b).map(year => <Tag key={year} label={String(year)} onRemove={() => removeYear(year)} />)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-500 uppercase">Active Months</span>
                <select 
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  onChange={(e) => {
                    if (e.target.value) addMonth(Number(e.target.value));
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Add Month</option>
                  {MONTHS.filter(m => !selectedMonths.includes(m.val)).map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {selectedMonths.length === 12 ? (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-bold rounded-full border border-gray-200">All Months (Full Year)</span>
                ) : (
                  [...selectedMonths].sort((a, b) => a - b).map(val => <Tag key={val} label={MONTHS.find(m => m.val === val)!.label} onRemove={() => removeMonth(val)} />)
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-600">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Filtered Allocation</h3>
            <p className="text-3xl font-black text-gray-800 mt-2">{formatCurrency(totalBudget)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider">Filtered Disbursed</h3>
            <p className="text-3xl font-black text-gray-800 mt-2">{formatCurrency(totalSpent)}</p>
            
            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3 mb-1 flex overflow-hidden border border-gray-200">
              {segments.map((seg, index) => (
                <div 
                  key={index}
                  className={`h-2.5 ${seg.color} hover:opacity-75 transition-opacity cursor-help border-r border-white last:border-r-0`}
                  style={{ width: `${seg.percentage}%` }}
                  title={`${seg.month} ${seg.year}: ₱${seg.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${seg.percentage.toFixed(1)}%)`}
                ></div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1 font-medium">{overallUtilization.toFixed(1)}% Selected Utilization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Data Comparison</h2>
            {comparisonData.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No data found for selected filters.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `₱${val/1000}k`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={formatCurrency} cursor={{fill: '#f3f4f6'}} />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} />
                    <Bar dataKey="Allocation" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Disbursed" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Aggregated AIP Breakdown</h2>
            <div className="space-y-6">
              {categoryData.map((cat) => (
                <div key={cat.id} className="relative">
                  <div className="flex justify-between items-end mb-1">
                    <h4 className="font-bold text-gray-700 text-sm">{cat.label}</h4>
                    <div className="text-right">
                      <span className="font-bold text-gray-800 text-sm">₱{cat.spent.toLocaleString()}</span>
                      <span className="text-xs text-gray-500 ml-1">({cat.utilizationPct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  
                  {/* UX FIX: Segmented Category Progress Bar strictly colored by category with temporal tooltips */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden flex">
                    {cat.segments.map((seg, idx) => (
                      <div 
                        key={idx}
                        className={`${cat.color} h-2.5 shrink-0 hover:opacity-75 transition-opacity cursor-help border-r border-white last:border-r-0`}
                        style={{ width: `${seg.widthPct}%` }}
                        title={`${seg.monthLabel} ${seg.year}: ₱${seg.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}