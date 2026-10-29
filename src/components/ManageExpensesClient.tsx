"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import PrintReportButton from "@/src/components/PrintReportButton"

interface ManageExpensesClientProps {
  allocation: any
  activeReport: any
  currentExpenses: any[]
  monthlyRemainingBalance: number
  totalSpent: number
  categoryBalances: any[]
  isLocked: boolean
  canEdit: boolean
  addOrUpdateExpense: (formData: FormData) => Promise<void>
  submitReport: () => Promise<void>
  deleteExpense: (formData: FormData) => Promise<void>
}

export default function ManageExpensesClient({
  allocation, activeReport, currentExpenses, monthlyRemainingBalance, totalSpent,
  categoryBalances, isLocked, canEdit, addOrUpdateExpense, submitReport, deleteExpense
}: ManageExpensesClientProps) {
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [expenseDate, setExpenseDate] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [taxAmount, setTaxAmount] = useState("") // Added Tax State

  const formRef = useRef<HTMLFormElement>(null)

  const getMonthName = (monthNum: number) => {
    const d = new Date(); d.setMonth(monthNum - 1); return d.toLocaleString('default', { month: 'long' })
  }

  const activeCategoryData = categoryBalances.find(c => c.category === selectedCategory)

  const handleEditClick = (exp: any) => {
    setEditingId(exp.id)
    setSelectedCategory(exp.category)
    setDescription(exp.description)
    setAmount(exp.amount.toString())
    setTaxAmount(exp.taxAmount?.toString() || "0") // Populate Tax
    setExpenseDate(new Date(exp.date).toISOString().split('T')[0])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setSelectedCategory("")
    setDescription("")
    setAmount("")
    setTaxAmount("") // Clear Tax
    setExpenseDate("")
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header Area */}
      <div className="flex justify-between items-center">
        <div>
          <Link href="/dashboard/expenses" className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline mb-2 inline-block transition-colors">
            &larr; Back to Allocations
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Manage Expenses: {getMonthName(allocation.month)} {allocation.year}
          </h2>
        </div>
        <div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border shadow-sm ${isLocked ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            Status: {activeReport?.status || 'DRAFT'}
          </span>
        </div>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Monthly Allocation</p>
          <p className="text-2xl font-black text-gray-900 mt-1">₱{allocation.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-yellow-500">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Disbursed</p>
          <p className="text-2xl font-black text-gray-900 mt-1">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Remaining Cash</p>
          <p className="text-2xl font-black text-gray-900 mt-1">₱{monthlyRemainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Universal Add & Edit Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">
              {editingId ? 'Edit Receipt' : 'Record Receipt'}
            </h3>

            {isLocked ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm font-medium border border-yellow-200">
                This report has been submitted and is locked for editing.
              </div>
            ) : (
              <form ref={formRef} action={addOrUpdateExpense} className="space-y-4" onSubmit={() => {
                setTimeout(() => handleCancelEdit(), 150)
              }}>
                {editingId && <input type="hidden" name="expenseId" value={editingId} />}

                <div>
                  <label htmlFor="expenseDate" className="block text-sm font-semibold text-gray-700 mb-1">Date on Receipt</label>
                  <input id="expenseDate" type="date" name="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none" />
                </div>
                
                <div>
                  <label htmlFor="expenseCategory" className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select 
                    id="expenseCategory" name="category" required 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- Select a category --</option>
                    {categoryBalances.map(cat => (
                      <option key={cat.category} value={cat.category}>{cat.category.replace("_", " ")}</option>
                    ))}
                  </select>
                  
                  {activeCategoryData && (
                    <p className={`text-xs font-semibold mt-1.5 ${activeCategoryData.remaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      Annual Remaining Balance: ₱{activeCategoryData.remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="expenseDesc" className="block text-sm font-semibold text-gray-700 mb-1">Description / Payee</label>
                  <input id="expenseDesc" type="text" name="description" placeholder="e.g. Meralco Bill" required value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="expenseAmount" className="block text-sm font-semibold text-gray-700 mb-1">Amount (₱)</label>
                    {/* Prevent negative and zero values on client-side input (ISO 25010: Functional Suitability 1.3) */}
                    <input id="expenseAmount" type="number" name="amount" step="0.01" min="0.01" placeholder="0.00" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none" />
                  </div>
                  <div>
                    <label htmlFor="expenseTax" className="block text-sm font-semibold text-gray-700 mb-1">Tax (₱)</label>
                    {/* Prevent negative values on client-side input (ISO 25010: Functional Suitability 1.3) */}
                    <input id="expenseTax" type="number" name="taxAmount" step="0.01" min="0" placeholder="0.00" value={taxAmount} onChange={e => setTaxAmount(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white outline-none" />
                  </div>
                </div>
                
                <p className="text-xs text-gray-500 mt-1.5 font-medium">
                  Monthly cash remaining: ₱{monthlyRemainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>

                {canEdit && (
                  <div className="flex gap-2 mt-4">
                    {editingId && (
                      <button type="button" onClick={handleCancelEdit} className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-lg transition-colors cursor-pointer">
                        Cancel
                      </button>
                    )}
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-sm cursor-pointer transition-colors">
                      {editingId ? 'Update Expense' : '+ Add Expense'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Itemized Expenses Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-gray-900 text-lg">Itemized Breakdown</h3>
              <div className="flex gap-2">
                <PrintReportButton 
                  allocationId={allocation.id} 
                  monthName={getMonthName(allocation.month)} 
                  year={allocation.year} 
                />
                {canEdit && !isLocked && activeReport && (
                  <form action={submitReport}>
                    <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer transition-colors">
                      Submit to Principal &rarr;
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500 bg-white">
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Category & Desc.</th>
                    <th className="px-6 py-3 font-semibold text-right">Tax</th>
                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                    {canEdit && !isLocked && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentExpenses?.map((exp: any) => (
                    <tr key={exp.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${editingId === exp.id ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{exp.category.replace("_", " ")}</p>
                        <p className="text-xs text-gray-500">{exp.description}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {exp.taxAmount > 0 ? `₱${exp.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-red-600 font-bold whitespace-nowrap">
                        ₱{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      {canEdit && !isLocked && (
                        <td className="px-6 py-4 flex justify-end gap-1">
                          <button onClick={() => handleEditClick(exp)} type="button" className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors" title="Edit Expense">✏️</button>
                          <form action={deleteExpense}>
                            <input type="hidden" name="expenseId" value={exp.id} />
                            <button type="submit" className="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 rounded-lg cursor-pointer transition-colors" title="Delete Expense">🗑️</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-5 text-right font-bold text-gray-700 uppercase tracking-wide">Total Disbursed:</td>
                    <td className="px-6 py-5 text-right font-black text-xl text-gray-900 border-t-2 border-gray-300">
                      ₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    {canEdit && !isLocked && <td className="bg-gray-50 border-t-2 border-gray-300"></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}