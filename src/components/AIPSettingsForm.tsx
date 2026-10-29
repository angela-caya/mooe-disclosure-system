//unused

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AIPSettingsFormProps {
  year: number;
  initialData: {
    utilities: number;
    supplies: number;
    repairs: number;
    travel: number;
    training: number;
    others: number;
  };
}

export default function AIPSettingsForm({ year, initialData }: AIPSettingsFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Calculate real-time total to enforce the 100% rule
  const currentTotal = Object.values(formData).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const isValid = currentTotal === 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/settings/aip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, ...formData }),
      });

      if (!response.ok) throw new Error("Failed to save settings");
      
      setMessage("✅ AIP Percentages successfully updated.");
      router.refresh(); // Refresh the page to sync server data
    } catch (error) {
      setMessage("❌ Error saving settings.");
    } finally {
      setIsLoading(false);
    }
  };

  // UI mapping for clean rendering
  const fields = [
    { key: "utilities", label: "Utilities (Water, Electricity, Internet)" },
    { key: "supplies", label: "Supplies & Materials" },
    { key: "repairs", label: "Minor Repairs" },
    { key: "travel", label: "Travel Expenses" },
    { key: "training", label: "Training & Seminars" },
    { key: "others", label: "Other Expenses" },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Configure Allocations (%)</h2>

      {/* Real-time Total Indicator */}
      <div className={`p-4 mb-6 rounded-lg border-l-4 flex justify-between items-center ${
        isValid ? "bg-green-50 border-green-500 text-green-800" : "bg-red-50 border-red-500 text-red-800"
      }`}>
        <span className="font-semibold">Total Allocation:</span>
        <span className="text-2xl font-black">{currentTotal}%</span>
      </div>

      {message && <div className="mb-4 text-sm font-medium">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <div className="relative">
                <input
                  type="number"
                  name={key}
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData[key as keyof typeof formData]}
                  onChange={handleChange}
                  className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="absolute right-3 top-2.5 text-gray-400 font-bold">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t mt-6">
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
              isValid && !isLoading ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? "Saving..." : isValid ? "Save AIP Settings" : "Total must be exactly 100%"}
          </button>
        </div>
      </form>
    </div>
  );
}