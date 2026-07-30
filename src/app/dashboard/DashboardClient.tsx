"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

interface Price {
  price: number;
  change24h?: number;
  volume?: number;
  timestamp: number;
}

interface Trade {
  id: number;
  user_id: string;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  pnl: number | null;
  status: string;
  created_at: string;
  closed_at: string | null;
}

export default function DashboardClient({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<Price | null>(null);
  const [prevPrice, setPrevPrice] = useState<Price | null>(null);
  const [openTrade, setOpenTrade] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [botRunning, setBotRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadState = useCallback(async () => {
    try {
      const [statusRes, tradesRes] = await Promise.all([
        fetch("/api/status"),
        fetch("/api/trades"),
      ]);

      const status = await statusRes.json();
      const tradesData = await tradesRes.json();

      if (status.user) setBalance(status.user.wallet_balance ?? 0);
      if (status.price) {
        setPrevPrice(currentPrice);
        setCurrentPrice({
          price: status.price.price,
          change24h: status.price.change24h,
          volume: status.price.volume,
          timestamp: status.price.timestamp,
        });
        setPriceHistory((prev) =>
          [...prev, status.price.price].slice(-200)
        );
      }
      setOpenTrade(status.openTrade ?? null);
      setTrades(tradesData ?? []);
      setBotRunning(status.botRunning ?? false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
    const poll = setInterval(loadState, 10000);
    return () => clearInterval(poll);
  }, [loadState]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade" },
        loadState
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "price_feed" },
        loadState
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        loadState
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadState, supabase]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 160;

    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 10, bottom: 20, left: 10, right: 10 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;
    const prices = priceHistory.slice(-100);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = pad.top + (ch / 5) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    const lastP = prices[prices.length - 1];
    const firstP = prices[0];
    const isUp = lastP >= firstP;
    const color = isUp ? "#22c55e" : "#ef4444";

    // line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = pad.left + (i / (prices.length - 1)) * cw;
      const y = pad.top + ch - ((p - min) / range) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // fill
    const lx = pad.left + cw;
    const ly = pad.top + ch - ((lastP - min) / range) * ch;
    ctx.lineTo(lx, pad.top + ch);
    ctx.lineTo(pad.left, pad.top + ch);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, color + "88");
    grad.addColorStop(1, color + "11");
    ctx.fillStyle = grad;
    ctx.fill();
  }, [priceHistory]);

  async function fundWallet() {
    setError("");
    try {
      const res = await fetch("/api/fund-wallet", { method: "POST" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setBalance(data.wallet_balance);
        loadState();
      }
    } catch {
      setError("Failed to fund wallet");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  function fmt(n: number | null | undefined) {
    if (n == null) return "--";
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });
  }

  function pnlClass(n: number | null | undefined) {
    if (n == null) return "text-gray-400";
    return n >= 0 ? "text-emerald-400" : "text-red-400";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Trader Bot</h1>
            <p className="text-xs text-gray-500">Multi-User Demo Trading</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded ${
                botRunning
                  ? "bg-emerald-900/50 text-emerald-400"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              Bot: {botRunning ? "RUNNING" : "STOPPED"}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-xs text-gray-500 mb-1">Wallet Balance</div>
            <div className="text-2xl font-bold text-emerald-400">
              {fmt(balance)}
            </div>
            {balance === 0 && (
              <p className="text-xs text-yellow-500 mt-1">
                Fund your wallet to start trading!
              </p>
            )}
            <button
              onClick={fundWallet}
              className="mt-2 text-xs px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
            >
              + Fund Wallet ($1,000)
            </button>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-xs text-gray-500 mb-1">BTC/USDT</div>
            <div
              className={`text-2xl font-bold ${
                currentPrice &&
                prevPrice &&
                currentPrice.price >= prevPrice.price
                  ? "text-emerald-400"
                  : currentPrice && prevPrice
                  ? "text-red-400"
                  : ""
              }`}
            >
              {currentPrice
                ? "$" +
                  currentPrice.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })
                : "--"}
            </div>
            {currentPrice?.change24h !== undefined && (
              <div
                className={`text-xs mt-1 ${
                  currentPrice.change24h >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {currentPrice.change24h >= 0 ? "+" : ""}
                {currentPrice.change24h.toFixed(2)}% 24h
              </div>
            )}
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-xs text-gray-500 mb-1">Active Trade</div>
            {openTrade ? (
              <>
                <div className="text-emerald-400 text-sm font-semibold">
                  BUY @ {fmt(openTrade.entry_price)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {openTrade.position_size.toFixed(6)} BTC
                </div>
                {currentPrice && (
                  <div
                    className={`text-sm font-semibold mt-1 ${pnlClass(
                      openTrade.position_size *
                        (currentPrice.price - openTrade.entry_price)
                    )}`}
                  >
                    PnL:{" "}
                    {fmt(
                      openTrade.position_size *
                        (currentPrice.price - openTrade.entry_price)
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">No open trades</div>
            )}
          </div>
        </div>

        {/* Active Trade Detail */}
        {openTrade && currentPrice && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-4">
            <div className="text-xs text-gray-500 mb-2">OPEN POSITION</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">Entry</div>
                <div className="text-lg font-semibold">
                  {fmt(openTrade.entry_price)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Size</div>
                <div className="text-lg font-semibold">
                  {openTrade.position_size.toFixed(6)} BTC
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Market Value</div>
                <div className="text-lg font-semibold">
                  {fmt(openTrade.position_size * currentPrice.price)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">PnL</div>
                <div
                  className={`text-lg font-semibold ${pnlClass(
                    openTrade.position_size *
                      (currentPrice.price - openTrade.entry_price)
                  )}`}
                >
                  {fmt(
                    openTrade.position_size *
                      (currentPrice.price - openTrade.entry_price)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-4">
          <div className="text-xs text-gray-500 mb-2">
            Price Chart (last 100 ticks)
          </div>
          <div style={{ width: "100%" }}>
            <canvas ref={canvasRef} height="160" className="w-full" />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4 text-center">{error}</p>
        )}

        {/* Trade History */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="text-xs text-gray-500 mb-2">Trade History</div>
          {trades.length === 0 ? (
            <div className="text-xs text-gray-600 text-center py-4">
              No trades yet. Fund your wallet and wait for the bot to trade.
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {trades.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold w-8">
                      BUY
                    </span>
                    <span className="text-gray-400">
                      @ {fmt(t.entry_price)}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="text-gray-400">
                      {t.exit_price ? fmt(t.exit_price) : "--"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">
                      {t.position_size.toFixed(6)} BTC
                    </span>
                    <span
                      className={`font-semibold w-20 text-right ${pnlClass(
                        t.pnl
                      )}`}
                    >
                      {t.pnl != null
                        ? (t.pnl >= 0 ? "+" : "") + fmt(t.pnl)
                        : "--"}
                    </span>
                    <span className="text-gray-600 w-16 text-right">
                      {t.created_at
                        ? new Date(t.created_at).toLocaleTimeString()
                        : "--"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
