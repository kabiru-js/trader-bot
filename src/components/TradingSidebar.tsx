'use client'

import { Home, LogOut, TrendingUp, DollarSign, History } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface TradingSidebarProps {
  currentPage?: string
  balance?: number
  onLogout?: () => void
}

export function TradingSidebar({ currentPage = 'dashboard', balance = 0, onLogout }: TradingSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', id: 'dashboard' },
    { icon: TrendingUp, label: 'Trading', href: '/dashboard', id: 'trading' },
    { icon: History, label: 'History', href: '/dashboard', id: 'history' },
  ]

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} bg-card border-r border-border/50 h-screen flex flex-col transition-all duration-200 sticky top-0 flex-shrink-0`}>
      <div className="px-6 py-6 border-b border-border/50 flex items-center justify-between">
        <Link href="/dashboard" className={`flex items-center gap-2 font-bold text-accent ${collapsed ? 'justify-center w-full' : ''}`}>
          <TrendingUp className="w-6 h-6" />
          {!collapsed && <span>Trader Bot</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground hidden lg:block"
        >
          <TrendingUp className="w-4 h-4 rotate-45" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border/50 space-y-2">
        <div className={`${collapsed ? 'px-1' : 'px-4'} py-3 rounded-lg bg-muted/50`}>
          {!collapsed && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Wallet Balance</p>
              <p className="text-lg font-bold text-accent">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        )}
      </div>
    </div>
  )
}
