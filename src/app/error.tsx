'use client' // Error components must be Client Components

import { useEffect } from 'react'

// Global Error Boundary to seamlessly recover from interruptions (Reliability)
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error) // Log to monitoring service in production
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Interruption</h2>
          <p className="text-sm text-gray-600 mt-2">
            An unexpected error occurred. This might be due to a brief network disconnection.
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}