// "use client"

// import { useState, useRef } from "react"
// import { useRouter } from "next/navigation"

// interface AIPClientProps {
//   aipPlan: any
//   selectedYear: number
//   availableYears: number[]
//   canEdit: boolean
//   saveBudgetLine: (formData: FormData) => Promise<void>
//   deleteBudgetLine: (formData: FormData) => Promise<void>
// }

// export default function AIPClient({ 
//   aipPlan, selectedYear, availableYears, canEdit, saveBudgetLine, deleteBudgetLine 
// }: AIPClientProps) {
//   const router = useRouter()
//   const formRef = useRef<HTMLFormElement>(null)

//   const [editingId, setEditingId] = useState<string | null>(null)
//   const [category, setCategory] = useState("")
//   const [description, setDescription] = useState("")
//   const [remarks, setRemarks] = useState("")
//   const [plannedAmount, setPlannedAmount] = useState("")

//   const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     router.push(`/dashboard/aip?year=${e.target.value}`)
//   }

//   const handleEditClick = (line: any) => {
//     setEditingId(line.id)
//     setCategory(line.category)
//     setDescription(line.description)
//     setRemarks(line.remarks || "")
//     setPlannedAmount(line.plannedAmount.toString())
//     window.scrollTo({ top: 0, behavior: 'smooth' })
//   }

//   const handleCancelEdit = () => {
//     setEditingId(null); setCategory(""); setDescription(""); setRemarks(""); setPlannedAmount("")
//   }

//   const totalBudget = aipPlan?.budgetLines.reduce((sum: number, line: any) => sum + line.plannedAmount, 0) || 0

//   return (
//     <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
//       <div className="flex justify-between items-center border-b border-gray-200 pb-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Annual Improvement Plan (AIP)</h1>
//           <p className="text-gray-600 mt-1 text-sm">Manage annual budget allocations per category for FY {selectedYear}.</p>
//         </div>
//         <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm">
//           <label className="text-sm font-semibold text-gray-500 uppercase">Fiscal Year:</label>
//           <select value={selectedYear} onChange={handleYearChange} className="font-bold border-none bg-transparent outline-none">
//             {availableYears.map((year: number) => <option key={year} value={year}>{year}</option>)}
//           </select>
//         </div>
//       </div>

//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center border-l-4 border-l-indigo-500">
//         <div>
//           <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total AIP Budget ({selectedYear})</p>
//           <p className="text-3xl font-black text-gray-900 mt-1">₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
//         </div>
//         <span className="px-4 py-2 rounded-full text-sm font-bold border shadow-sm bg-gray-100 text-gray-800 border-gray-200">
//           Status: {aipPlan?.status || "NO PLAN FOUND"}
//         </span>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         {/* CRUD Form (1 Column) */}
//         {canEdit && (
//           <div className="lg:col-span-1">
//             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-24">
//               <h3 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Edit Category Budget' : 'Add Category Budget'}</h3>
//               <form ref={formRef} action={saveBudgetLine} className="space-y-4" onSubmit={() => setTimeout(() => handleCancelEdit(), 150)}>
//                 {editingId && <input type="hidden" name="lineId" value={editingId} />}
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
//                   <select name="category" required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none cursor-pointer">
//                     <option value="" disabled>-- Select --</option>
//                     <option value="UTILITIES">Utilities</option>
//                     <option value="SUPPLIES">Supplies & Materials</option>
//                     <option value="MINOR_REPAIRS">Minor Repairs</option>
//                     <option value="TRAVEL">Travel</option>
//                     <option value="TRAINING">Training</option>
//                     <option value="OTHERS">Others</option>
//                   </select>
//                 </div>
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
//                   <input type="text" name="description" required value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
//                   <input type="text" name="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none" />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-semibold text-gray-700 mb-1">Annual Amount (₱)</label>
//                   <input type="number" name="plannedAmount" step="0.01" required value={plannedAmount} onChange={e => setPlannedAmount(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none" />
//                 </div>
//                 <div className="flex gap-2 mt-4">
//                   {editingId && <button type="button" onClick={handleCancelEdit} className="w-1/3 bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold cursor-pointer">Cancel</button>}
//                   <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg shadow-sm cursor-pointer">
//                     {editingId ? 'Update' : 'Save Budget'}
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}

//         {/* Budget Breakdown Table (Mas pinalawak para hindi mukhang masikip) */}
//         <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
//               <h3 className="font-bold text-gray-900 text-lg">Budget Breakdown</h3>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="w-full text-left border-collapse">
//                 <thead>
//                   <tr className="border-b border-gray-200 text-sm text-gray-500 bg-white">
//                     <th className="px-6 py-3 font-semibold">Category</th>
//                     <th className="px-6 py-3 font-semibold">Description / Remarks</th>
//                     <th className="px-6 py-3 font-semibold text-right">Annual Allocation</th>
//                     {canEdit && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {aipPlan?.budgetLines.map((line: any) => (
//                     <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
//                       <td className="px-6 py-4 font-bold text-gray-900">{line.category.replace("_", " ")}</td>
//                       <td className="px-6 py-4">
//                         <p className="text-sm font-semibold text-gray-900">{line.description}</p>
//                         <p className="text-xs text-gray-500">{line.remarks}</p>
//                       </td>
//                       <td className="px-6 py-4 text-right font-bold text-indigo-600">₱{line.plannedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
//                       {canEdit && (
//                         <td className="px-6 py-4 flex justify-end gap-1">
//                           <button onClick={() => handleEditClick(line)} className="text-blue-500 hover:bg-blue-100 p-2 rounded-lg cursor-pointer" title="Edit">✏️</button>
//                           <form action={deleteBudgetLine}>
//                             <input type="hidden" name="lineId" value={line.id}/>
//                             <button type="submit" className="text-red-500 hover:bg-red-100 p-2 rounded-lg cursor-pointer" title="Delete">🗑️</button>
//                           </form>
//                         </td>
//                       )}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface AIPClientProps {
  aipPlan: any
  selectedYear: number
  availableYears: number[]
  canEdit: boolean
  saveBudgetLine: (formData: FormData) => Promise<void>
  deleteBudgetLine: (formData: FormData) => Promise<void>
  approveAIP: (formData: FormData) => Promise<void>;
}

export default function AIPClient({ 
  aipPlan, selectedYear, availableYears, canEdit, saveBudgetLine, deleteBudgetLine, approveAIP
}: AIPClientProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [remarks, setRemarks] = useState("")
  const [plannedAmount, setPlannedAmount] = useState("")

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/dashboard/aip?year=${e.target.value}`)
  }

  const handleEditClick = (line: any) => {
    setEditingId(line.id)
    setCategory(line.category)
    setDescription(line.description)
    setRemarks(line.remarks || "")
    setPlannedAmount(line.plannedAmount.toString())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setCategory("")
    setDescription("")
    setRemarks("")
    setPlannedAmount("")
  }

  const handleSaveBudgetLine = async (formData: FormData) => {
    toast.promise(saveBudgetLine(formData), {
      loading: 'Saving budget allocation...',
      success: 'Budget saved successfully!',
      error: 'Failed to save budget.',
    }).then(() => {
      handleCancelEdit()
    })
  }

  const handleDeleteBudgetLine = async (formData: FormData) => {
    if (!window.confirm("Delete this budget line? This affects monthly allocations.")) return

    toast.promise(deleteBudgetLine(formData), {
      loading: 'Deleting category budget...',
      success: 'Budget line deleted successfully!',
      error: 'Failed to delete budget line.',
    })
  }

  const totalBudget = aipPlan?.budgetLines.reduce((sum: number, line: any) => sum + line.plannedAmount, 0) || 0

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Annual Improvement Plan (AIP)</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage annual budget allocations per category for FY {selectedYear}.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm">
          <label className="text-sm font-semibold text-gray-500 uppercase">Fiscal Year:</label>
          <select value={selectedYear} onChange={handleYearChange} className="font-bold border-none bg-transparent outline-none text-gray-900 cursor-pointer">
            {availableYears.map((year: number) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          {/* Left: Total budget */}
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Total AIP Budget ({selectedYear})
            </p>
            <p className="text-3xl font-black text-gray-900 mt-1">
              ₱{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Right: Status and approval */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-4 py-2 rounded-full text-sm font-bold border shadow-sm bg-gray-100 text-gray-800 border-gray-200">
              Status: {aipPlan?.status || "NO PLAN FOUND"}
            </span>

            {canEdit && aipPlan && aipPlan.status !== "APPROVED" && (
              <form action={approveAIP}>
                <input type="hidden" name="year" value={selectedYear} />
                <button
                  type="submit"
                  disabled={aipPlan.budgetLines.length === 0}
                  className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve AIP/APP
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {canEdit && (
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-24">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Edit Category Budget' : 'Add Category Budget'}</h3>
              
              <form ref={formRef} action={handleSaveBudgetLine} className="space-y-4">
                {/* Hidden inputs to pass required data to server action */}
                <input type="hidden" name="year" value={selectedYear} />
                {editingId && <input type="hidden" name="lineId" value={editingId} />}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select name="category" required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none cursor-pointer">
                    <option value="" disabled>-- Select --</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="SUPPLIES">Supplies & Materials</option>
                    <option value="MINOR_REPAIRS">Minor Repairs</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="TRAINING">Training</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <input type="text" name="description" required value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                  <input type="text" name="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Annual Amount (₱)</label>
                  <input type="number" name="plannedAmount" step="0.01"  min="0" required value={plannedAmount} onChange={e => setPlannedAmount(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none" />
                </div>
                <div className="flex gap-2 mt-4">
                  {editingId && <button type="button" onClick={handleCancelEdit} className="w-1/3 bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold cursor-pointer">Cancel</button>}
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg shadow-sm cursor-pointer">
                    {editingId ? 'Update' : 'Save Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">Budget Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500 bg-white">
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Description / Remarks</th>
                    <th className="px-6 py-3 font-semibold text-right">Annual Allocation</th>
                    {canEdit && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {aipPlan?.budgetLines.map((line: any) => (
                    <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-gray-900">{line.category.replace("_", " ")}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">{line.description}</p>
                        <p className="text-xs text-gray-500">{line.remarks}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600">₱{line.plannedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      {canEdit && (
                        <td className="px-6 py-4 flex justify-end gap-1">
                          <button onClick={() => handleEditClick(line)} className="text-blue-500 hover:bg-blue-100 p-2 rounded-lg cursor-pointer" title="Edit">✏️</button>
                          
                          <form action={handleDeleteBudgetLine}>
                            <input type="hidden" name="lineId" value={line.id}/>
                            {/* Hidden input to pass the year to server action */}
                            <input type="hidden" name="year" value={selectedYear} />
                            <button type="submit" className="text-red-500 hover:bg-red-100 p-2 rounded-lg cursor-pointer" title="Delete">🗑️</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}