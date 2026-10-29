"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ChartData {
  name: string;
  value: number;
}

export default function ExpenseDonutChart({ data }: { data: ChartData[] }) {
  // Magagandang kulay na professional at accessible
  const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#9333ea", "#0891b2", "#475569"];

  // Custom Tooltip para naka-format ng Peso (₱) kapag hinover
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
          <p className="font-bold text-gray-800">{payload[0].name}</p>
          <p className="text-blue-600 font-black">
            ₱{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}  /* Ito ang gumagawa ng butas (Donut) */
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-gray-700 text-xs font-semibold">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}