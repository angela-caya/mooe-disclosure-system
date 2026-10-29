"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        setError("Invalid email or password. Please try again.")
        setLoading(false)
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-900 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-md">
            BC
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          MOOE Disclosure Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Biñan City Senior High School - West Campus
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.edu.ph"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In to Portal"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <a href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              &larr; Return to Public Transparency Board
            </a>
          </div>
        </div>

        {/* Test Accounts Guide for Panelists / Evaluation */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 space-y-1">
          <p className="font-bold uppercase tracking-wider mb-1">Quick Credentials (for Testing):</p>
          <p><strong>Principal:</strong> admin@school.edu.ph / admin123</p>
          <p><strong>Disbursing Officer:</strong> disbursing@school.edu.ph / disbursing123</p>
        </div>
      </div>
    </div>
  )
}