import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps } from 'recharts'
import type { TradeMetrics } from '../types/supabase'

interface VolumeChartProps {
  data: TradeMetrics[]
  height?: number
  className?: string
}

// Custom Tooltip Component
const CustomVolumeTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload as any
  
  return (
    <div style={{
      backgroundColor: 'rgba(10, 15, 30, 0.95)',
      border: '2px solid #FF007A',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(255, 0, 122, 0.3)',
      minWidth: '280px'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255, 0, 122, 0.3)',
        paddingBottom: '10px',
        marginBottom: '12px'
      }}>
        <div style={{
          color: '#FF007A',
          fontSize: '16px',
          fontWeight: '700',
          marginBottom: '4px'
        }}>
          📊 İşlem Hacmi Detayı
        </div>
        <div style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {data.fullTime}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '12px'
      }}>
        {/* Volume */}
        <div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📊 Hacim
          </div>
          <div style={{
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            {data.volume.toLocaleString('tr-TR')}
          </div>
        </div>

        {/* PnL */}
        <div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            💰 PnL
          </div>
          <div style={{
            color: data.pnl >= 0 ? '#00FF88' : '#FF007A',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            {data.pnl >= 0 ? '+' : ''}{data.pnl.toFixed(2)}%
          </div>
        </div>

        {/* Trades */}
        <div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🔄 İşlem
          </div>
          <div style={{
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            {data.trades}
          </div>
        </div>

        {/* Win Rate */}
        <div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🎯 Başarı
          </div>
          <div style={{
            color: data.winRate >= 50 ? '#00FF88' : '#FFB800',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            {data.winRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255, 0, 122, 0.2)'
      }}>
        {/* Avg PnL */}
        <div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📈 Ort. PnL
          </div>
          <div style={{
            color: data.avgPnl >= 0 ? '#00FF88' : '#FF007A',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {data.avgPnl >= 0 ? '+' : ''}{data.avgPnl.toFixed(2)}%
          </div>
        </div>

        {/* Max Drawdown */}
        <div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ⚠️ Maks DD
          </div>
          <div style={{
            color: '#FF007A',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {data.maxDrawdown.toFixed(2)}%
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '11px',
            marginBottom: '4px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📊 Sharpe
          </div>
          <div style={{
            color: data.sharpeRatio >= 1 ? '#00FF88' : data.sharpeRatio >= 0 ? '#FFB800' : '#FF007A',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            {data.sharpeRatio.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Footer - Data Point */}
      <div style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255, 0, 122, 0.2)',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '11px',
        fontWeight: '600',
        textAlign: 'center'
      }}>
        📍 Veri Noktası #{data.index}
      </div>
    </div>
  )
}

export function VolumeChart({ data, height = 320, className = '' }: VolumeChartProps) {
  const chartData = useMemo(() => {
    const mapped = data.map((item, index) => ({
      time: new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      fullTime: new Date(item.timestamp).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      volume: item.total_trades,
      pnl: item.total_pnl,
      trades: item.total_trades,
      winRate: item.win_rate,
      avgPnl: item.avg_pnl,
      maxDrawdown: item.max_drawdown,
      sharpeRatio: item.sharpe_ratio,
      index: index + 1
    }))
    return mapped;
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
        <BarChart 
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          
          {/* X Axis - Zaman */}
          <XAxis 
            dataKey="time" 
            stroke="rgba(255,255,255,0.6)"
            label={{ 
              value: '⏰ Zaman (Saat:Dakika)', 
              position: 'insideBottom', 
              offset: -10,
              style: { 
                fill: 'rgba(255,255,255,0.8)', 
                fontSize: '14px',
                fontWeight: 600
              }
            }}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          
          {/* Y Axis - İşlem Sayısı */}
          <YAxis 
            stroke="rgba(255,255,255,0.6)"
            label={{ 
              value: '🔄 İşlem Sayısı', 
              angle: -90, 
              position: 'insideLeft',
              offset: 5,
              style: { 
                fill: 'rgba(255,255,255,0.8)', 
                fontSize: '14px',
                fontWeight: 600,
                textAnchor: 'middle'
              }
            }}
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          
          {/* Tooltip */}
          <Tooltip 
            content={CustomVolumeTooltip}
            cursor={{ fill: 'rgba(255, 0, 122, 0.1)' }}
          />
          
          {/* Bar - PnL'e göre renklendirilmiş */}
          <Bar 
            dataKey="volume" 
            name="İşlem Hacmi"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.pnl >= 0 ? '#FF007A' : 'rgba(255, 0, 122, 0.4)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Chart Legend/Info */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: 'rgba(255, 0, 122, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 0, 122, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px'
      }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
          📊 Toplam İşlem:
        </span>
        <span style={{ color: '#FF007A', fontWeight: 700 }}>
          {chartData.reduce((sum, item) => sum + item.volume, 0).toLocaleString('tr-TR')} adet
        </span>
      </div>
    </div>
  )
}
