'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Header } from '@/components/Header'
import { Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const opts = { email, password }

    const { error: authError } = isSignup
      ? await supabase.auth.signUp(opts)
      : await supabase.auth.signInWithPassword(opts)

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (isSignup) {
      setError('Account created! You can now log in.')
      setIsSignup(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border/50 rounded-xl p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {isSignup ? 'Get Started' : 'Welcome Back'}
              </h1>
              <p className="text-muted-foreground">
                {isSignup
                  ? 'Create your account and start trading'
                  : 'Sign in to access your trading dashboard'}
              </p>
            </div>

            {isSignup && (
              <div className="space-y-3 mb-8 p-4 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-foreground">Virtual Trading Wallet</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-foreground">Real-Time Market Data</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-foreground">Automated Bot Trading</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-muted border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-muted border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <p className={`text-sm ${error.includes('created') ? 'text-success' : 'text-destructive'}`}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-semibold hover:bg-accent/90 transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-muted-foreground text-sm mt-6">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignup(!isSignup)
                  setError('')
                }}
                className="text-accent hover:text-accent/80 transition-colors font-medium bg-transparent border-none p-0 inline cursor-pointer"
              >
                {isSignup ? 'Sign in here' : 'Sign up for free'}
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Demo trading platform for educational purposes only.
          </p>
        </div>
      </div>
    </div>
  )
}
