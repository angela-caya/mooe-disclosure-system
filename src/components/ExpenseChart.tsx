"use client";

import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ChartData {
  name: string;
  value: number;
}

interface ExpenseChartProps {
  data: ChartData[];
}

const COLORS: Record<string, string> = {
  "UTILITIES": "#3b82f6",     // blue-500
  "SUPPLIES": "#22c55e",      // green-500
  "MINOR REPAIRS": "#eab308", // yellow-500
  "TRAVEL": "#a855f7",        // purple-500
  "TRAINING": "#ec4899",      // pink-500
  "OTHERS": "#6b7280",        // gray-500
};

export default function ExpenseChart({ data }: ExpenseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500 font-medium">No expenses recorded yet.</p>
      </div>
    );
  }

  const chartDataWithColors = data.map((entry) => ({
    ...entry,
    fill: COLORS[entry.name] || "#cbd5e1"
  }));

  const formatCurrency = (value: any) => {
    const numericValue = Number(value) || 0;
    return `₱${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartDataWithColors}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
          />
          <Tooltip formatter={formatCurrency} />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}