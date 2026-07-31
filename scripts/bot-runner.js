// Bot Runner - runs alongside Next.js
// Connects to Binance WS + manages global trades + replicates to all users

// Load .env.local manually (next.js does this automatically, but this is a standalone script)
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[Bot] Missing SUPABASE_URL or SERVICE_KEY. Set them in .env.local");
  process.exit(1);
}

let latestPrice = null;
let priceHistory = [];
const BOT_INTERVAL = 5000;

// ─── Supabase REST (no client lib needed) ───────────────────────────────────

async function supFetch(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Prefer': 'return=representation'
  };
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    console.error(`[Sup] ${method} ${path} -> ${res.status}: ${text.slice(0, 100)}`);
    return null;
  }
  return res.json();
}

async function getGlobalState() {
  const rows = await supFetch('GET', 'global_bot_state?select=*&limit=1');
  return rows?.[0] ?? null;
}

async function updateGlobalState(data) {
  await supFetch('PATCH', 'global_bot_state?id=eq.1', {
    ...data,
    updated_at: new Date().toISOString()
  });
}

async function getAllUsers() {
  return await supFetch('GET', 'users?select=id,wallet_balance');
}

async function createUserTrade(userId, side, price, positionSize, signals) {
  await supFetch('POST', 'trades', {
    user_id: userId,
    symbol: 'BTCUSDT',
    side,
    entry_price: price,
    exit_price: null,
    position_size: positionSize,
    pnl: null,
    status: 'OPEN',
    strategy: signals?.strategy ?? null,
    entry_reason: signals?.entry_reason ?? null,
    exit_reason: null,
    confidence: signals?.confidence ?? null,
    created_at: new Date().toISOString(),
    closed_at: null
  });
}

async function closeUserTrade(tradeId, exitPrice, pnl, exitReason) {
  await supFetch('PATCH', `trades?id=eq.${tradeId}`, {
    exit_price: exitPrice,
    pnl: pnl,
    status: 'CLOSED',
    exit_reason: exitReason ?? null,
    closed_at: new Date().toISOString()
  });
}

async function updateUserBalance(userId, balance) {
  await supFetch('PATCH', `users?id=eq.${userId}`, {
    wallet_balance: balance
  });
}

async function getOpenTrades() {
  return await supFetch('GET', 'trades?status=eq.OPEN&select=*');
}

// ─── Binance WebSocket ──────────────────────────────────────────────────────

function connectBinance() {
  const wsUrl = 'wss://stream.binance.com:9443/ws/btcusdt@ticker';
  let ws;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      console.log('[Bot] Connected to Binance BTC/USDT');
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.e === '24hrTicker') {
          const price = parseFloat(msg.c);
          const change24h = parseFloat(msg.P);
          const high24h = parseFloat(msg.h);
          const low24h = parseFloat(msg.l);
          const volume = parseFloat(msg.v);

          latestPrice = { price, change24h, high24h, low24h, volume, timestamp: Date.now() };

          priceHistory.push(price);
          if (priceHistory.length > 500) priceHistory = priceHistory.slice(-500);

          // Write price to Supabase
          updatePriceFeed(price);
        }
      } catch (err) {
        console.error('[Bot] WS parse error:', err.message);
      }
    });

    ws.addEventListener('close', () => {
      console.log('[Bot] WS disconnected, reconnecting in 5s...');
      setTimeout(connect, 5000);
    });

    ws.addEventListener('error', (err) => {
      console.error('[Bot] WS error:', err.message);
      ws.close();
    });
  }

  connect();
}

async function updatePriceFeed(price) {
  // Clear old data and insert new
  await supFetch('DELETE', 'price_feed?symbol=eq.BTCUSDT');
  await supFetch('POST', 'price_feed', {
    symbol: 'BTCUSDT',
    price: price,
    updated_at: new Date().toISOString()
  });
}

// ─── Bot Strategy ────────────────────────────────────────────────────────────

const ACTIVE_STRATEGY = 'BTC Pullback Mean Reversion';

function entrySignal(dropPct, localHigh, currentPrice) {
  const confidence = Math.round(Math.min(85, Math.max(50, 55 + dropPct * 25)) * 100) / 100;
  return {
    strategy: ACTIVE_STRATEGY,
    entry_reason: `BTC dropped ${dropPct.toFixed(2)}% from 20-tick high of $${localHigh.toFixed(2)}. Buying the pullback within the trend for mean reversion.`,
    confidence
  };
}

function exitSignal(changePct, entryPrice, currentPrice) {
  const isProfit = changePct >= 0;
  return isProfit
    ? `BTC gained +${changePct.toFixed(2)}% from entry $${entryPrice.toFixed(2)}. Profit target reached, taking profit.`
    : `BTC fell ${changePct.toFixed(2)}% from entry $${entryPrice.toFixed(2)}. Stop loss triggered to limit downside risk.`;
}

async function runBot() {
  if (!latestPrice) return;

  const currentPrice = latestPrice.price;

  try {
    const globalState = await getGlobalState();
    const isOpen = globalState?.current_position === 'OPEN';

    if (isOpen) {
      // Check exit conditions
      const entryPrice = parseFloat(globalState.entry_price);
      const changePct = ((currentPrice - entryPrice) / entryPrice) * 100;

      if (changePct >= 1.0 || changePct <= -0.5) {
        console.log(`[Bot] CLOSING trade. Entry: $${entryPrice}, Exit: $${currentPrice}, Change: ${changePct.toFixed(2)}%`);

        const exitReason = exitSignal(changePct, entryPrice, currentPrice);

        // Get all open trades (all users)
        const openTrades = await getOpenTrades();
        if (openTrades) {
          for (const trade of openTrades) {
            const pnl = parseFloat(trade.position_size) * (currentPrice - entryPrice);
            await closeUserTrade(trade.id, currentPrice, pnl, exitReason);

            // Update user balance
            const { data: userData } = await supFetch('GET', `users?id=eq.${trade.user_id}&select=wallet_balance`);
            if (userData?.[0]) {
              const newBalance = parseFloat(userData[0].wallet_balance) + pnl;
              await updateUserBalance(trade.user_id, newBalance);
            }
          }
        }

        // Update global state
        await updateGlobalState({
          current_position: 'CLOSED',
          entry_price: null,
          position_size: null,
          last_action_time: new Date().toISOString()
        });

        console.log(`[Bot] Trade closed for all users.`);
      }
    } else {
      // Check entry condition: price dropped 0.3% from local high
      if (priceHistory.length < 20) return;

      const recentPrices = priceHistory.slice(-20);
      const localHigh = Math.max(...recentPrices);
      const dropPct = ((localHigh - currentPrice) / localHigh) * 100;

      if (dropPct >= 0.3) {
        console.log(`[Bot] BUY signal at $${currentPrice} (drop: ${dropPct.toFixed(2)}% from high $${localHigh})`);

        const signals = entrySignal(dropPct, localHigh, currentPrice);

        // Get all users with balance
        const users = await getAllUsers();
        if (!users || users.length === 0) {
          console.log('[Bot] No users found');
          return;
        }

        // Determine global position size (use first user's balance as reference)
        // All users get proportional trades based on their balance
        const entryPrice = currentPrice;

        for (const user of users) {
          const userBalance = parseFloat(user.wallet_balance);
          if (userBalance <= 0) continue; // Skip users with no funds

          const positionSize = (userBalance * 0.5) / entryPrice;
          await createUserTrade(user.id, 'BUY', entryPrice, positionSize, signals);
        }

        // Update global state
        await updateGlobalState({
          current_position: 'OPEN',
          entry_price: entryPrice,
          position_size: 0, // not used per-user
          last_action_time: new Date().toISOString()
        });

        console.log(`[Bot] Buy executed for ${users.filter(u => parseFloat(u.wallet_balance) > 0).length} funded users at $${entryPrice}`);
      }
    }
  } catch (err) {
    console.error('[Bot] Error:', err.message);
  }
}

// ─── Schema check ────────────────────────────────────────────────────────────

async function checkSchema() {
  console.log('[Bot] Verifying database schema...');
  const [tradesOk, usersOk] = await Promise.all([
    supFetch('GET', 'trades?select=strategy&limit=1'),
    supFetch('GET', 'users?select=total_deposits&limit=1')
  ]);
  if (!tradesOk || !usersOk) {
    console.error('[Bot] ERROR: Database schema is missing required columns.');
    console.error('');
    console.error('Run these two migrations in the Supabase SQL Editor, then restart this bot:');
    console.error('  1. scripts/migration-add-deposits.sql');
    console.error('  2. scripts/migration-add-trade-signals.sql');
    console.error('');
    process.exit(1);
  }
  console.log('[Bot] Schema OK');
}

// ─── Init ────────────────────────────────────────────────────────────────────

(async () => {
  await checkSchema();
  console.log('[Bot] Starting...');
  connectBinance();
  setInterval(runBot, BOT_INTERVAL);
  console.log(`[Bot] Running with ${BOT_INTERVAL}ms interval`);
})();

// Keep alive
process.on('SIGINT', () => {
  console.log('[Bot] Shutting down...');
  process.exit(0);
});
