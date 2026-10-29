// Global Loading State to improve perceived performance (Usability)
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading system data...</p>
      </div>
    </div>
  )
}