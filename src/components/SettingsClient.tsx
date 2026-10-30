"use client"

import { useState } from "react"
import toast from "react-hot-toast"

interface SettingsClientProps {
  signatories: any[]
  updateSignatory: (formData: FormData) => Promise<void>
}

export default function SettingsClient({ signatories, updateSignatory }: SettingsClientProps) {
  // Itinakda ang tamang default positions para sa bawat box
  const boxes = [
    { box: "A", title: "BOX A: School Head / Principal", defaultName: "", defaultPosition: "Principal II" },
    { box: "B", title: "BOX B: Schools Division Superintendent", defaultName: "", defaultPosition: "Schools Division Superintendent" },
    { box: "C", title: "BOX C: Accounting Unit", defaultName: "", defaultPosition: "Head, Accounting Division Unit" }
  ]

  const getBoxData = (boxName: string) => {
    return signatories.find(s => s.box === boxName) || {
      name: boxes.find(b => b.box === boxName)?.defaultName || "",
      position: boxes.find(b => b.box === boxName)?.defaultPosition || ""
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 tracking-tight">System Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Manage official signatories for Appendix 44 (Boxes A, B, and C).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {boxes.map((item) => {
          const existingSig = signatories.find(s => s.box === item.box) || {
            id: "",
            name: item.defaultName,
            position: item.defaultPosition,
            box: item.box,
            isActive: true
          }

          return (
            <div key={item.box} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-200 text-gray-700 rounded-full">Box {item.box}</span>
              </div>
              <div className="p-6">
                <SignatoryForm sig={existingSig} updateSignatory={updateSignatory} boxName={item.box} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SignatoryForm({ sig, updateSignatory, boxName }: { sig: any, updateSignatory: any, boxName: string }) {
  const parts = sig.position ? sig.position.split("||") : ["", ""]
  const isCurrentlyOic = parts.length > 1
  
  const [isOic, setIsOic] = useState(isCurrentlyOic)
  const [name, setName] = useState(sig.name || "")
  const [primaryPosition, setPrimaryPosition] = useState(isCurrentlyOic ? parts[0] : (sig.position || ""))
  const [actingPosition, setActingPosition] = useState(isCurrentlyOic ? parts[1] : "")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const finalPosition = isOic ? `${primaryPosition}||${actingPosition}` : primaryPosition
    
    const formData = new FormData()
    if (sig.id) formData.append("id", sig.id)
    formData.append("name", name)
    formData.append("position", finalPosition)
    formData.append("box", boxName)
    formData.append("isActive", "true")

    toast.promise(updateSignatory(formData), {
      loading: 'Saving signatory...',
      success: 'Signatory saved successfully!',
      error: 'Failed to save signatory.',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name (with Title)</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          required 
          placeholder="e.g. ARLENE S. RICASATA, CESO VI"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all bg-white"
        />
      </div>

      <div className="flex items-center pt-1">
        <label className="inline-flex items-center gap-2.5 cursor-pointer bg-blue-50/60 hover:bg-blue-50 px-3.5 py-2 rounded-lg border border-blue-100 transition-colors">
          <input 
            type="checkbox" 
            checked={isOic} 
            onChange={(e) => setIsOic(e.target.checked)} 
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-blue-900">Is Officer-in-Charge (OIC)?</span>
        </label>
      </div>

      <div className={`grid grid-cols-1 ${isOic ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            {isOic ? "Primary Designation" : "Designation / Position"}
          </label>
          <input 
            type="text" 
            value={primaryPosition}
            onChange={(e) => setPrimaryPosition(e.target.value)}
            required 
            placeholder="e.g. Assistant Schools Division Superintendent"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all bg-white"
          />
        </div>

        {isOic && (
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Acting Position
            </label>
            <input 
              type="text" 
              value={actingPosition}
              onChange={(e) => setActingPosition(e.target.value)}
              required 
              placeholder="e.g. Schools Division Superintendent"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all bg-white"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-sm cursor-pointer text-sm">
          Save Changes
        </button>
      </div>
    </form>
  )
}