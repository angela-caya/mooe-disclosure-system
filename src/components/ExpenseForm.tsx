"use client";

import React, { useState, useEffect } from "react";

// Matches the Prisma Enum for frontend validation/selection
const categories = [
  "UTILITIES",
  "SUPPLIES",
  "MINOR_REPAIRS",
  "TRAVEL",
  "TRAINING",
  "OTHERS",
];

interface ExpenseFormProps {
  allocationId: string;
  initialTotalExpenses?: number;
  monthlyBudget: number;
  month: number;
  year: number;
  disbursingOfficerId: string;
}

export default function ExpenseForm({
  allocationId,
  initialTotalExpenses = 0,
  monthlyBudget,
  month,
  year,
  disbursingOfficerId,
}: ExpenseFormProps) {
  const [totalExpenses, setTotalExpenses] = useState(initialTotalExpenses);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "SUPPLIES",
  });

  const remainingBalance = monthlyBudget - totalExpenses;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          month,
          year,
          allocationId,
          disbursingOfficerId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTotalExpenses(data.totalExpenses);
        setMessage("Expense added successfully!");
        setFormData({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          category: "SUPPLIES",
        });
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage("An error occurred while saving the expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-600">
          <p className="text-sm text-gray-500 uppercase font-bold">Monthly Allocation</p>
          <p className="text-2xl font-semibold text-gray-800">
            ₱{monthlyBudget.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500 uppercase font-bold">Total Spent</p>
          <p className="text-2xl font-semibold text-gray-800">
            ₱{totalExpenses.toLocaleString()}
          </p>
        </div>
        <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${remainingBalance < 0 ? 'border-red-600' : 'border-green-600'}`}>
          <p className="text-sm text-gray-500 uppercase font-bold">Remaining Balance</p>
          <p className={`text-2xl font-semibold ${remainingBalance < 0 ? 'text-red-600' : 'text-gray-800'}`}>
            ₱{remainingBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-blue-900 mb-6">Input Itemized Expense</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                required
                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Meralco Bill Jan 2024"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full md:w-auto px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-md transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Saving..." : "Add Expense to Draft"}
            </button>
            {message && (
              <p className={`mt-4 text-sm ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                {message}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
