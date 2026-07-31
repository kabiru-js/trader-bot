'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { TradingChart } from '@/components/TradingChart'
import { Zap, TrendingUp, Shield, Brain, Users, Sparkles, ArrowRight, BarChart3, Layers } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/status').then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          router.replace('/dashboard')
          return
        }
      }
      setChecking(false)
    }).catch(() => setChecking(false))
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-accent-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm text-accent font-medium">
                  <Sparkles className="w-4 h-4" />
                  Automated Trading Bot
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-balance leading-tight text-foreground">
                Trade Smarter with{' '}
                <span className="text-accent">Automated Bots</span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-md leading-relaxed">
                Real-time automated trading with ML-based strategies. Fund your wallet and let the bot trade for you.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-lg font-semibold hover:bg-accent/90 transition-all duration-200"
                >
                  Start Trading Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 border border-accent/30 text-accent px-8 py-4 rounded-lg font-semibold hover:bg-accent/5 transition-all duration-200"
                >
                  Learn More
                </Link>
              </div>

              <div className="flex gap-8 pt-8 text-sm">
                <div>
                  <p className="font-bold text-foreground">1K+</p>
                  <p className="text-muted-foreground">Active Traders</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">$10M+</p>
                  <p className="text-muted-foreground">Trading Volume</p>
                </div>
                <div>
                  <p className="font-bold text-foreground">24/7</p>
                  <p className="text-muted-foreground">Automated Trading</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-accent/20 rounded-2xl p-6 overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-foreground">BTC/USDT</h3>
                  <span className="text-success font-semibold">Live</span>
                </div>
                <TradingChart height={250} type="area" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-32 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm text-accent font-medium mb-4">
              Features
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Everything You Need to Trade
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade automated trading platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: 'Real-Time Charts',
                description: 'Live BTC price charts with real-time updates powered by Binance data feed.',
              },
              {
                icon: Brain,
                title: 'ML Predictions',
                description: 'Machine learning models analyze market patterns for smarter trade decisions.',
              },
              {
                icon: Shield,
                title: 'Risk-Free Learning',
                description: 'Practice with simulated funds. No real money, no real risk, pure learning.',
              },
              {
                icon: Zap,
                title: 'Automated Trading',
                description: 'Set it and forget it. The bot trades automatically based on market conditions.',
              },
              {
                icon: BarChart3,
                title: 'Portfolio Analytics',
                description: 'Track your PnL, win rate, and performance with detailed analytics.',
              },
              {
                icon: Users,
                title: 'Multi-User',
                description: 'Every user gets their own wallet. The bot trades proportionally for all users.',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="bg-card border border-border/50 hover:border-accent/50 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:shadow-accent/5"
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 bg-card/50 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm text-accent font-medium mb-4">
              How It Works
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Start Trading in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Account',
                description: 'Sign up with your email and get a virtual wallet to start trading.',
                icon: Users,
              },
              {
                step: '02',
                title: 'Fund Your Wallet',
                description: 'Add virtual funds to your wallet so the bot can trade on your behalf.',
                icon: BarChart3,
              },
              {
                step: '03',
                title: 'Auto-Trade',
                description: 'Watch as the bot trades automatically. Track your PnL in real-time.',
                icon: Layers,
              },
            ].map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className="relative">
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-20 left-full w-8 h-px bg-gradient-to-r from-accent/50 to-transparent" />
                  )}
                  <div className="bg-card border border-accent/20 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-5xl font-bold text-accent/30 mb-2">{item.step}</p>
                    <h3 className="font-bold text-xl text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-32 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to start trading?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of traders on Trader Bot. Start your journey today with automated trading.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-8 py-4 rounded-lg font-semibold hover:bg-accent/90 transition-all duration-200 text-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 bg-card/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center text-muted-foreground text-sm">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <BarChart3 className="w-5 h-5 text-accent" />
              <p>&copy; 2024 Trader Bot. All rights reserved.</p>
            </div>
            <p>Demo trading platform for educational purposes.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
