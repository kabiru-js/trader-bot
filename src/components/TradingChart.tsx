'use client'

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TradingChartProps {
  data?: { time: string; price: number }[]
  type?: 'line' | 'area'
  height?: number
  color?: string
}

export function TradingChart({ data, type = 'area', height = 300, color = '#06b6d4' }: TradingChartProps) {
  const chartData = data && data.length > 1
    ? data
    : [
        { time: '00:00', price: 42850 },
        { time: '04:00', price: 43120 },
        { time: '08:00', price: 43890 },
        { time: '12:00', price: 43450 },
        { time: '16:00', price: 44280 },
        { time: '20:00', price: 43950 },
        { time: '24:00', price: 44620 },
      ]

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'area' ? (
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['dataMin - 500', 'dataMax + 500']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#e5e7eb' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
            <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '12px' }} />
            <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['dataMin - 500', 'dataMax + 500']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#e5e7eb' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
            <Line type="monotone" dataKey="price" stroke={color} dot={false} strokeWidth={2} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
