"use client"

import { useState } from "react"

interface AdjustmentsClientProps {
  adjustments: any[]
  categories: string[]
  canRequest: boolean
  canApprove: boolean
  submitAdjustment: (formData: FormData) => Promise<void>
  processAdjustment: (formData: FormData) => Promise<void>
}

export default function AdjustmentsClient({ 
  adjustments, categories, canRequest, canApprove, submitAdjustment, processAdjustment 
}: AdjustmentsClientProps) {
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState("REALLOCATION")
  const [sourceCat, setSourceCat] = useState("")
  const [destCat, setDestCat] = useState("")

  const handleRequestSubmit = async (formData: FormData) => {
    await submitAdjustment(formData)
    setIsModalOpen(false)
    setAdjustmentType("REALLOCATION")
    setSourceCat("")
    setDestCat("")
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Budget Adjustments</h1>
          <p className="text-gray-600 mt-1 text-sm">Manage annual reallocations, additional funds, and surplus returns.</p>
        </div>
        {canRequest && (
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors cursor-pointer">
            + New Adjustment Request
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500 bg-gray-50">
                <th className="px-6 py-3 font-semibold">Date Requested</th>
                <th className="px-6 py-3 font-semibold">Type & Details</th>
                <th className="px-6 py-3 font-semibold text-right">Amount</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                {canApprove && <th className="px-6 py-3 font-semibold text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adj: any) => (
                <tr key={adj.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{new Date(adj.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{adj.adjustmentType.replace("_", " ")}</p>
                    <p className="text-xs text-gray-600 font-medium mt-1">
                      {adj.adjustmentType === 'REALLOCATION' && (
                        <>From: <span className="text-red-600">{adj.sourceLine?.aipBudgetLine?.category || 'N/A'}</span> &rarr; To: <span className="text-green-600">{adj.destinationLine?.aipBudgetLine?.category || 'N/A'}</span></>
                      )}
                      {adj.adjustmentType === 'ADDITIONAL_FUND' && (
                        <>Target Category: <span className="text-green-600">{adj.destinationLine?.aipBudgetLine?.category || 'N/A'}</span></>
                      )}
                      {adj.adjustmentType === 'RETURN_TO_DIVISION' && (
                        <>Source Category: <span className="text-red-600">{adj.sourceLine?.aipBudgetLine?.category || 'N/A'}</span></>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">"{adj.reason}"</p>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-indigo-600">₱{adj.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      adj.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                      adj.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {adj.status}
                    </span>
                  </td>
                  {canApprove && (
                    <td className="px-6 py-4 text-center">
                      {adj.status === 'PENDING' && (
                        <form action={processAdjustment} className="flex gap-2 justify-center">
                          <input type="hidden" name="adjustmentId" value={adj.id} />
                          <button type="submit" name="action" value="APPROVE" className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors">✓</button>
                          <button type="submit" name="action" value="REJECT" className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold cursor-pointer transition-colors">✕</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">New Budget Adjustment Request</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form action={handleRequestSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adjustment Type</label>
                <select name="adjustmentType" value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none cursor-pointer">
                  <option value="REALLOCATION">Reallocation (Transfer)</option>
                  <option value="ADDITIONAL_FUND">Additional Fund (Supplemental)</option>
                  <option value="RETURN_TO_DIVISION">Return to Division</option>
                </select>
              </div>

              {(adjustmentType === 'REALLOCATION' || adjustmentType === 'RETURN_TO_DIVISION') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Source Category (Deduct From)</label>
                  <select name="sourceCategory" required value={sourceCat} onChange={e => setSourceCat(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none cursor-pointer">
                    <option value="" disabled>-- Select Source --</option>
                    {categories.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                  </select>
                </div>
              )}
              
              {(adjustmentType === 'REALLOCATION' || adjustmentType === 'ADDITIONAL_FUND') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Destination Category (Add To)</label>
                  <select name="destinationCategory" required value={destCat} onChange={e => setDestCat(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none cursor-pointer">
                    <option value="" disabled>-- Select Destination --</option>
                    {categories.filter(c => c !== sourceCat).map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₱)</label>
                <input type="number" name="amount" step="0.01"  min="0.01" required placeholder="0.00" className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none placeholder-gray-500" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason / Justification</label>
                <input type="text" name="reason" required placeholder="State reason..." className="w-full px-4 py-2 border border-gray-400 rounded-lg text-black font-semibold bg-white outline-none placeholder-gray-500" />
              </div>
              
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg mt-4 shadow-sm cursor-pointer">Submit Request</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}