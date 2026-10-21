'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [error, setError] = useState('')

  // Verify active session on mount and redirect authenticated users
  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setIsCheckingSession(false)
      }
    })
  }, [router])

  // Handle credentials authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
    })

    if (res?.error) {
      setError('Mali ang email o password. Paki-check at subukan ulit.')
      setIsLoading(false)
    } else if (res?.ok) {
      router.push('/dashboard')
    }
  }

  // Render loading state during session validation to prevent UI flashing
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Sinusuri ang account...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {/* UX: Added lift and shadow transitions to the login card */}
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100 transition-all duration-300 hover:shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">MOOE Portal</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Mag-login para i-manage ang budget</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 shadow-sm animate-pulse">
              {error}
            </div>
          )}

          {/* UX: Proper label associations and dark input text */}
          <div>
            <label htmlFor="loginEmail" className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
            <input 
              id="loginEmail"
              type="email" 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-gray-50 focus:bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.edu.ph"
              required 
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="loginPassword" className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
            <input 
              id="loginPassword"
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-gray-50 focus:bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
              disabled={isLoading}
            />
          </div>

          {/* UX: Button lift, pointer, and clear disabled states */}
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-sm flex justify-center items-center text-lg ${
              isLoading 
                ? 'bg-blue-400 cursor-wait' 
                : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Naglo-load...
              </>
            ) : (
              'Mag-login'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}