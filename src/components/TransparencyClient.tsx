"use client";

import { useState, useMemo } from "react";

interface TransparencyClientProps {
  allocations: any[];
  expenses: any[];
  aipSettings: any[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TransparencyClient({ allocations, expenses, aipSettings }: TransparencyClientProps) {
  // Extract all available years from the database
  const availableYears = Array.from(new Set(allocations.map(a => a.year))).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] || currentYear);

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  // Filter data based on the selected year
  const yearlyAllocations = useMemo(() => allocations.filter(a => a.year === selectedYear), [allocations, selectedYear]);
  
  const yearlyExpenses = useMemo(() => expenses.filter(exp => 
    exp.report?.allocation?.year === selectedYear
  ), [expenses, selectedYear]);

  // Calculate totals (Security Fix: Removed remainingFunds to protect school personnel)
  const totalBudget = yearlyAllocations.reduce((sum, alloc) => sum + alloc.totalAmount, 0);
  const totalSpent = yearlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const grouped = yearlyExpenses.reduce((acc, curr) => {
      const category = curr.category.replace("_", " ");
      acc[category] = (acc[category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Cast the entire entries array to [string, number][] before sorting
    const entries = Object.entries(grouped) as [string, number][];
    
    return entries.sort((a, b) => b[1] - a[1]);
  }, [yearlyExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  // Generate monthly breakdown for the progress bar
  const getProgressSegments = () => {
    const monthlyTotals = yearlyAllocations.map(alloc => {
      const monthExpenses = yearlyExpenses.filter(e => e.report?.allocation?.month === alloc.month);
      const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const percentage = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
      
      return {
        id: alloc.id,
        monthName: MONTHS[alloc.month - 1],
        spent,
        percentage
      };
    });

    return monthlyTotals.filter(m => m.spent > 0);
  };

  const segments = getProgressSegments();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <p className="text-sm font-bold tracking-widest text-blue-600 uppercase">Department of Education</p>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Public Transparency Board</h1>
          <p className="text-gray-600 font-medium max-w-2xl mx-auto">
            An open record of the school's Maintenance and Other Operating Expenses (MOOE). 
            We believe that every parent and stakeholder has the right to know how school funds are utilized.
          </p>
        </div>

        {/* User-Friendly Year Selector */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <label htmlFor="yearSelect" className="text-sm font-bold text-gray-700">Select School Year:</label>
            <select 
              id="yearSelect"
              className="text-lg font-black text-blue-700 border-none bg-transparent focus:ring-0 cursor-pointer outline-none"
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
        </div>

        {/* Simplified Financial Summary Cards (Changed to 2 columns for security focus) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 border-t-4 border-t-blue-500 hover:-translate-y-1 transition-transform duration-300">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Budget for {selectedYear}</h2>
            <p className="text-4xl font-black text-gray-900 mt-2">{formatCurrency(totalBudget)}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">The total allocated funds for the entire year.</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 border-t-4 border-t-yellow-500 hover:-translate-y-1 transition-transform duration-300">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Amount Spent</h2>
            <p className="text-4xl font-black text-gray-900 mt-2">{formatCurrency(totalSpent)}</p>
            
            {/* Visual Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 mt-4 mb-2 flex overflow-hidden border border-gray-200">
              {segments.map((seg, idx) => (
                <div 
                  key={idx}
                  className="h-3 bg-yellow-400 hover:bg-yellow-300 transition-colors cursor-help border-r border-white last:border-r-0"
                  style={{ width: `${seg.percentage}%` }}
                  title={`${seg.monthName}: ₱${seg.spent.toLocaleString()} spent`}
                ></div>
              ))}
            </div>
            <p className="text-sm text-gray-500 font-bold">{utilizationRate.toFixed(1)}% of the budget has been utilized.</p>
          </div>
        </div>

        {/* Clear Expense Breakdown Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Where did the funds go?</h3>
            <p className="text-gray-600 text-sm mt-1">A simple breakdown of school expenses by category.</p>
          </div>
          
          <div className="p-8">
            {expensesByCategory.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-5xl mb-4 block opacity-50">📊</span>
                <p className="text-lg font-bold text-gray-700">No expenses recorded yet.</p>
                <p className="text-gray-500">Check back later once the school submits their reports.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {expensesByCategory.map(([category, amount], index) => {
                  const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-800 uppercase text-sm tracking-wide">{category}</span>
                        <span className="font-black text-gray-900">{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-auto">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 font-bold text-right">{percentage.toFixed(1)}% of total expenses</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Community Footer */}
        <div className="text-center pt-8 pb-12 text-sm text-gray-500 font-medium">
          <p>Data is automatically updated when the School Principal approves a liquidation report.</p>
          <p className="mt-1">For questions or clarifications, please contact the School Administration Office.</p>
        </div>

      </div>
    </div>
  );
}