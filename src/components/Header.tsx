'use client'

import { BarChart3, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-accent">
            <BarChart3 className="w-6 h-6" />
            <span className="hidden sm:inline">Trader Bot</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-foreground/80 hover:text-accent transition-colors text-sm">
              Platform
            </Link>
            <Link href="/#features" className="text-foreground/80 hover:text-accent transition-colors text-sm">
              Features
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth" className="text-foreground/80 hover:text-accent transition-colors text-sm">
              Sign In
            </Link>
            <Link href="/auth" className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors">
              Get Started
            </Link>
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            <Link href="/" className="block text-foreground/80 hover:text-accent py-2 text-sm">
              Platform
            </Link>
            <Link href="/#features" className="block text-foreground/80 hover:text-accent py-2 text-sm">
              Features
            </Link>
            <div className="flex gap-2 pt-4 border-t border-border/30">
              <Link href="/auth" className="flex-1 text-center text-foreground/80 hover:text-accent py-2 text-sm">
                Sign In
              </Link>
              <Link href="/auth" className="flex-1 text-center bg-accent text-accent-foreground px-4 py-2 rounded text-sm font-medium">
                Sign Up
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
