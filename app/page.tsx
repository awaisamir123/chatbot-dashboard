'use client'

import { useState, useEffect } from 'react'
import { signIn, signUp, getCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password)
        if (error) throw error
        
        toast.success('Login successful!')
        router.push('/dashboard')
      } else {
        const { data, error } = await signUp(email, password)
        if (error) throw error

        if (data.user && !data.session) {
          toast.success('Please check your email to confirm your account')
        } else {
          toast.success('Account created successfully!')
          router.push('/dashboard')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl card-shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl card-shadow w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Sign up to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              placeholder="Enter your password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 font-medium transition duration-200"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}