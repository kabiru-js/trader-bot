'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { TradingSidebar } from '@/components/TradingSidebar'
import { PortfolioWidget } from '@/components/PortfolioWidget'
import { TradingChart } from '@/components/TradingChart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  TrendingUp, TrendingDown, AlertCircle, DollarSign, Wallet, Activity,
  Brain, Target, BarChart3, ArrowUpRight, ArrowDownRight, Zap,
} from 'lucide-react'

interface Price {
  price: number
  change24h?: number
  volume?: number
  timestamp: number
}

interface Trade {
  id: number
  user_id: string
  symbol: string
  side: string
  entry_price: number
  exit_price: number | null
  position_size: number
  pnl: number | null
  status: string
  strategy: string | null
  entry_reason: string | null
  exit_reason: string | null
  confidence: number | null
  created_at: string
  closed_at: string | null
}

export default function DashboardClient({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0)
  const [totalDeposits, setTotalDeposits] = useState(0)
  const [currentPrice, setCurrentPrice] = useState<Price | null>(null)
  const [openTrade, setOpenTrade] = useState<Trade | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([])
  const [botRunning, setBotRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [funding, setFunding] = useState(false)
  const [flashTrades, setFlashTrades] = useState<Set<number>>(new Set())
  const seenTradeIds = useRef<Set<number> | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadState = useCallback(async () => {
    try {
      const [statusRes, tradesRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/trades'),
      ])

      if (!statusRes.ok) {
        if (statusRes.status === 401) {
          router.push('/auth')
          return
        }
        return
      }

      const status = await statusRes.json()
      const tradesData = await tradesRes.json()

      if (status.user) {
        setBalance(status.user.wallet_balance ?? 0)
        setTotalDeposits(status.user.total_deposits ?? 0)
      }
      if (status.price) {
        setCurrentPrice((prev) => {
          if (prev && prev.price !== status.price.price) {
            setPriceHistory((h) => {
              const next = [...h, {
                time: new Date(status.price.timestamp).toLocaleTimeString(),
                price: status.price.price,
              }]
              return next.slice(-50)
            })
          }
          return {
            price: status.price.price,
            change24h: status.price.change24h,
            volume: status.price.volume,
            timestamp: status.price.timestamp,
          }
        })
      }
      setOpenTrade(status.openTrade ?? null)
      setTrades(tradesData ?? [])

      const tradesList: Trade[] = tradesData ?? []
      if (!seenTradeIds.current) {
        seenTradeIds.current = new Set(tradesList.map((t) => t.id))
      } else {
        const newIds = tradesList
          .filter((t) => !seenTradeIds.current!.has(t.id))
          .map((t) => t.id)
        if (newIds.length > 0) {
          setFlashTrades(new Set(newIds))
          setTimeout(() => {
            seenTradeIds.current = new Set(tradesList.map((t) => t.id))
            setFlashTrades(new Set())
          }, 2400)
        }
      }

      setBotRunning(status.botRunning ?? false)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadState()
    const poll = setInterval(loadState, 10000)
    return () => clearInterval(poll)
  }, [loadState])

  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades' },
        loadState
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'price_feed' },
        () => setTimeout(loadState, 500)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        loadState
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, loadState, supabase])

  async function fundWallet() {
    setError('')
    setFunding(true)
    try {
      const res = await fetch('/api/fund-wallet', { method: 'POST' })
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setBalance(data.wallet_balance)
        setTotalDeposits(data.total_deposits ?? totalDeposits)
        loadState()
      }
    } catch {
      setError('Failed to fund wallet')
    } finally {
      setFunding(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  function fmt(n: number | null | undefined) {
    if (n == null) return '--'
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 })
  }

  function fmtTime(ts: string) {
    return new Date(ts).toLocaleString()
  }

  function confidenceClass(conf: number | null | undefined) {
    if (conf == null) return 'bg-muted/50 text-muted-foreground border border-border/50'
    if (conf > 70) return 'bg-success/15 text-success border border-success/30'
    if (conf >= 50) return 'bg-warning/15 text-warning border border-warning/30'
    return 'bg-destructive/15 text-destructive border border-destructive/30'
  }

  const activePnL = openTrade && currentPrice
    ? openTrade.position_size * (currentPrice.price - openTrade.entry_price)
    : 0

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const winTrades = trades.filter((t) => (t.pnl ?? 0) > 0).length
  const winRate = trades.length > 0 ? Math.round((winTrades / trades.length) * 100) : 0
  const closedTrades = trades.filter((t) => t.status === 'CLOSED')
  const lastClosed = closedTrades[0] ?? null

  const totalProfit = balance - totalDeposits
  const totalReturn = totalDeposits > 0 ? (totalProfit / totalDeposits) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 text-accent animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <TradingSidebar currentPage="dashboard" balance={balance} onLogout={handleLogout} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Your automated trading overview</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                botRunning ? 'bg-success/20 text-success border border-success/30' : 'bg-muted text-muted-foreground'
              }`}>
                Bot: {botRunning ? 'Active' : 'Off'}
              </span>
            </div>
          </div>

          {/* AI Status Panel */}
          <div className="bg-card border border-border/50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-accent" />
              <h2 className="font-semibold text-foreground">AI Trading System</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${botRunning ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Bot Status</p>
                  <p className="font-semibold text-foreground">{botRunning ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Strategy</p>
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-accent flex-shrink-0" />
                  {openTrade?.strategy ?? 'Standing by — watching market'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                <p className="font-semibold text-accent">
                  {closedTrades.length > 0 ? `${winRate}%` : '--'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {winTrades} wins / {closedTrades.length - winTrades} losses
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Trade</p>
                {lastClosed ? (
                  <div className="flex items-center gap-1.5">
                    {lastClosed.pnl != null && lastClosed.pnl >= 0
                      ? <ArrowUpRight className="w-4 h-4 text-success flex-shrink-0" />
                      : <ArrowDownRight className="w-4 h-4 text-destructive flex-shrink-0" />}
                    <span className={`font-semibold ${lastClosed.pnl != null && lastClosed.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {lastClosed.pnl != null ? `${lastClosed.pnl >= 0 ? '+' : ''}${fmt(lastClosed.pnl)}` : '--'}
                    </span>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No closed trades yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
              <PortfolioWidget
                balance={balance}
                totalDeposits={totalDeposits}
                dayChange={openTrade && currentPrice ? activePnL : 0}
                dayChangePercent={openTrade && currentPrice && openTrade.entry_price > 0
                  ? (activePnL / (openTrade.position_size * openTrade.entry_price)) * 100
                  : 0}
                totalProfit={totalProfit}
                totalReturn={totalReturn}
              />
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
                <p className="text-3xl font-bold text-foreground">{trades.length}</p>
                <p className="text-xs text-success mt-2">
                  {winTrades} wins / {trades.length - winTrades} losses
                </p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                <p className="text-3xl font-bold text-accent">
                  {closedTrades.length > 0 ? `${winRate}%` : '--'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Avg PnL: {closedTrades.length > 0 ? fmt(totalPnl / closedTrades.length) : '--'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">BTC/USDT Live Price</h3>
                  <p className="text-sm text-muted-foreground">Real-time price feed</p>
                </div>
                {currentPrice && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      ${currentPrice.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    {currentPrice.change24h !== undefined && (
                      <p className={`text-sm font-medium ${currentPrice.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {currentPrice.change24h >= 0 ? '+' : ''}{currentPrice.change24h.toFixed(2)}% 24h
                      </p>
                    )}
                  </div>
                )}
              </div>
              <TradingChart
                data={priceHistory}
                height={250}
                type="area"
                color={currentPrice && priceHistory.length > 1
                  ? priceHistory[priceHistory.length - 1].price >= priceHistory[0].price
                    ? '#10b981'
                    : '#ef4444'
                  : '#06b6d4'
                }
              />
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-foreground mb-4">Active Position</h3>
              {openTrade ? (
                <div className="space-y-4">
                  <div className="bg-accent/10 rounded-lg p-4 border border-accent/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        <span className="text-sm font-semibold text-accent">OPEN LONG</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${confidenceClass(openTrade.confidence)}`}>
                        {openTrade.confidence != null ? `${openTrade.confidence.toFixed(0)}% conf` : '--'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entry</span>
                        <span className="font-medium text-foreground">{fmt(openTrade.entry_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-medium text-foreground">{openTrade.position_size.toFixed(6)} BTC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value</span>
                        <span className="font-medium text-foreground">
                          {fmt(openTrade.position_size * (currentPrice?.price ?? openTrade.entry_price))}
                        </span>
                      </div>
                    </div>
                    {openTrade.strategy && (
                      <div className="mt-3 pt-3 border-t border-accent/20">
                        <p className="text-[11px] text-accent/80 mb-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Strategy
                        </p>
                        <p className="text-xs text-foreground">{openTrade.strategy}</p>
                      </div>
                    )}
                    {openTrade.entry_reason && (
                      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                        {openTrade.entry_reason}
                      </p>
                    )}
                  </div>
                  {currentPrice && (
                    <div className={`rounded-lg p-4 ${activePnL >= 0 ? 'bg-success/10 border border-success/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                      <p className="text-xs text-muted-foreground mb-1">Unrealized PnL</p>
                      <p className={`text-2xl font-bold ${activePnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {activePnL >= 0 ? '+' : ''}{fmt(activePnL)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">No active trades</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fund your wallet and wait for the bot
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total PnL</span>
                  <span className={totalPnl >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                    {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-foreground mb-4">Fund Wallet</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-xl font-bold text-foreground">{fmt(balance)}</p>
                </div>
                <button
                  onClick={fundWallet}
                  disabled={funding}
                  className="bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  {funding ? 'Funding...' : '+ $1,000'}
                </button>
              </div>
              {balance === 0 && (
                <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning">
                  Fund your wallet to enable bot trading
                </div>
              )}
              {error && (
                <p className="mt-3 text-xs text-destructive">{error}</p>
              )}
            </div>

            <div className="bg-card border border-border/50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-foreground mb-4">Portfolio Performance</h3>
              {priceHistory.length > 1 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '10px' }} tick={false} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '10px' }} domain={['dataMin - 100', 'dataMax + 100']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #1f2937',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#e5e7eb' }}
                      formatter={(value) => `$${Number(value).toLocaleString()}`}
                    />
                    <Line type="monotone" dataKey="price" stroke="#06b6d4" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
                  Waiting for price data...
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-foreground">Trade History</h3>
              {trades.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
                  {closedTrades.length} closed / {trades.length} total
                </span>
              )}
            </div>
            {trades.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No trades yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Fund your wallet and wait for the bot to start trading
                </p>
                <button
                  onClick={fundWallet}
                  disabled={funding}
                  className="bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-all"
                >
                  {funding ? 'Funding...' : 'Fund Wallet Now'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((t) => {
                  const isWin = (t.pnl ?? 0) >= 0
                  const isNew = flashTrades.has(t.id)
                  return (
                    <div
                      key={t.id}
                      className={`border rounded-xl p-4 transition-colors ${isNew ? 'animate-trade-flash border-border' : 'border-border/50 hover:bg-muted/30'}`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isWin ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                            {isWin ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{t.side === 'BUY' ? 'LONG' : 'SHORT'} BTC</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === 'OPEN' ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-muted/50 text-muted-foreground border border-border/50'}`}>
                                {t.status === 'OPEN' ? 'OPEN' : 'CLOSED'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{fmtTime(t.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${isWin ? 'text-success' : 'text-destructive'}`}>
                            {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}${fmt(t.pnl)}` : '--'}
                          </p>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${confidenceClass(t.confidence)}`}>
                            {t.confidence != null ? `${t.confidence.toFixed(0)}% confidence` : 'confidence --'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs ml-12 mb-2">
                        <div>
                          <span className="text-muted-foreground">Entry </span>
                          <span className="font-medium text-foreground">{fmt(t.entry_price)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Exit </span>
                          <span className="font-medium text-foreground">
                            {t.exit_price ? fmt(t.exit_price) : <span className="text-muted-foreground">--</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Size </span>
                          <span className="font-medium text-foreground">{t.position_size.toFixed(6)} BTC</span>
                        </div>
                      </div>

                      <div className="ml-12 space-y-1.5">
                        <p className="text-xs flex items-start gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                          <span className="text-foreground font-medium">{t.strategy ?? 'Strategy unavailable'}</span>
                        </p>
                        {t.entry_reason && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                            {t.entry_reason}
                          </p>
                        )}
                        {t.status === 'CLOSED' && t.exit_reason && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                            <ArrowDownRight className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                            {t.exit_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
