'use client'

import { TrendingUp } from 'lucide-react'
import { AnimatedNumber } from '@/components/AnimatedNumber'

interface PortfolioWidgetProps {
  balance: number
  totalDeposits: number
  dayChange: number
  dayChangePercent: number
  totalProfit: number
  totalReturn: number
}

function fmtCurrency(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function sign(n: number) {
  return n > 0 ? '+' : ''
}

export function PortfolioWidget({
  balance,
  totalDeposits,
  dayChange,
  dayChangePercent,
  totalProfit,
  totalReturn,
}: PortfolioWidgetProps) {
  const profitPositive = totalProfit >= 0
  const returnPositive = totalReturn >= 0
  const dayPositive = dayChangePercent >= 0

  return (
    <div className="bg-gradient-to-br from-card to-card/50 border border-accent/20 rounded-xl p-6">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Wallet Balance</p>
          <h2 className="text-4xl font-bold text-foreground text-balance">
            $<AnimatedNumber value={balance} />
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Deposits</p>
            <p className="text-lg font-bold text-foreground">${fmtCurrency(totalDeposits)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Profit</p>
            <p className={`text-lg font-bold ${profitPositive ? 'text-success' : 'text-destructive'}`}>
              {sign(totalProfit)}${fmtCurrency(totalProfit)}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Return</p>
            <p className={`text-lg font-bold ${returnPositive ? 'text-success' : 'text-destructive'}`}>
              {sign(totalReturn)}{totalReturn.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Unrealized PnL</p>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${dayPositive ? 'text-success' : 'text-destructive'}`}>
                  {dayPositive ? '+' : ''}${fmtCurrency(dayChange)}
                </span>
                <span className={`text-sm font-medium px-2 py-1 rounded-lg ${dayPositive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {dayPositive ? '+' : ''}{dayChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
            <TrendingUp className={`w-5 h-5 ${dayPositive ? 'text-success' : 'text-destructive'}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
