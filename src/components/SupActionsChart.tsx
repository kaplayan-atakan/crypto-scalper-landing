import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TradeMetrics } from '../types/supabase'

interface SupActionsChartProps {
  data: TradeMetrics[]
  height?: number
  className?: string
}

export function SupActionsChart({ data, height = 300, className = '' }: SupActionsChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      pnl: item.total_pnl,
      trades: item.total_trades,
      winRate: item.win_rate
    }))
  }, [data])

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`sb-chart-container sb-chart-empty ${className}`}>
        <p>Veri yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className={`sb-chart-container ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="sb-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" />
          <YAxis stroke="rgba(255,255,255,0.6)" />
          <Tooltip 
            contentStyle={{ 
              background: 'rgba(20, 25, 35, 0.95)', 
              border: '1px solid #00E5FF',
              borderRadius: '12px',
              padding: '12px'
            }} 
          />
          <Area 
            type="monotone" 
            dataKey="pnl" 
            stroke="#00E5FF" 
            fillOpacity={1} 
            fill="url(#sb-gradient)"
            name="PnL ($)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
