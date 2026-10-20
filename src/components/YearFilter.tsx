"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function YearFilter({ 
  availableYears, 
  currentYear 
}: { 
  availableYears: number[], 
  currentYear: number 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selectedYear = searchParams.get("year") || currentYear.toString();

  // Dynamically append the selected year parameter to the current active route
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`${pathname}?year=${e.target.value}`);
  };

  return (
    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-fit">
      <label htmlFor="year-select" className="text-sm font-bold text-gray-500 uppercase tracking-wider pl-2">
        Fiscal Year:
      </label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={handleChange}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-600 focus:border-blue-600 block px-3 py-1.5 font-bold cursor-pointer transition-colors"
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}