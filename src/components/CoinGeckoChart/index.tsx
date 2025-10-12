import React from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import type { MarketChartPoint, OHLCPoint } from '../../types/coingecko'
import './CoinGeckoChart.css'

interface CoinGeckoChartProps {
  data: MarketChartPoint[] | OHLCPoint[]
  mode: 'ohlc' | 'line'
  tradeTimestamp: string
  symbol: string
}

function isOHLCData(data: any[]): data is OHLCPoint[] {
  return data.length > 0 && 'open' in data[0]
}

const CustomTooltip = ({ active, payload, mode }: any) => {
  if (!active || !payload || payload.length === 0) return null
  
  const data = payload[0].payload
  const time = new Date(data.timestamp).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  if (mode === 'ohlc') {
    return (
      <div className="cg-tooltip">
        <p className="cg-tooltip-time">{time}</p>
        <p className="cg-tooltip-row">
          <span className="cg-tooltip-label">Open:</span>
          <span className="cg-tooltip-value">${data.open?.toFixed(2)}</span>
        </p>
        <p className="cg-tooltip-row">
          <span className="cg-tooltip-label">High:</span>
          <span className="cg-tooltip-value">${data.high?.toFixed(2)}</span>
        </p>
        <p className="cg-tooltip-row">
          <span className="cg-tooltip-label">Low:</span>
          <span className="cg-tooltip-value">${data.low?.toFixed(2)}</span>
        </p>
        <p className="cg-tooltip-row">
          <span className="cg-tooltip-label">Close:</span>
          <span className="cg-tooltip-value">${data.close?.toFixed(2)}</span>
        </p>
      </div>
    )
  }
  
  return (
    <div className="cg-tooltip">
      <p className="cg-tooltip-time">{time}</p>
      <p className="cg-tooltip-row">
        <span className="cg-tooltip-label">Price:</span>
        <span className="cg-tooltip-value">${data.price?.toFixed(2)}</span>
      </p>
    </div>
  )
}

export function CoinGeckoChart({ data, mode, tradeTimestamp, symbol }: CoinGeckoChartProps) {
  console.log('📊 CoinGeckoChart rendering:', {
    symbol,
    mode,
    dataPoints: data.length,
    tradeTimestamp
  })
  
  if (!data || data.length === 0) {
    console.warn('⚠️ No chart data available for', symbol)
    return (
      <div className="cg-chart-empty">
        <p>📊 {symbol} için veri bulunamadı</p>
        <p className="cg-chart-empty-sub">Bu zaman aralığında CoinGecko verisi mevcut değil</p>
      </div>
    )
  }
  
  const tradeTime = new Date(tradeTimestamp).getTime()
  console.log('⏰ Trade time marker:', new Date(tradeTime).toISOString())
  
  // X-axis formatter
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  // Y-axis formatter
  const formatYAxis = (value: number) => {
    return `$${value.toFixed(2)}`
  }
  
  return (
    <div className="cg-chart-container">
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0, 255, 255, 0.1)"
            vertical={false}
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatXAxis}
            stroke="rgba(0, 255, 255, 0.5)"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'rgba(0, 255, 255, 0.7)' }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke="rgba(0, 255, 255, 0.5)"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'rgba(0, 255, 255, 0.7)' }}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip mode={mode} />} />
          
          {/* Trade time marker */}
          <ReferenceLine
            x={tradeTime}
            stroke="#ff0066"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: '⚡ Trade',
              position: 'top',
              fill: '#ff0066',
              fontSize: 12,
              fontWeight: 'bold'
            }}
          />
          
          {mode === 'ohlc' ? (
            <>
              {/* Candlestick with bars and lines */}
              <Bar
                dataKey="close"
                fill="rgba(0, 255, 255, 0.3)"
                stroke="#00ffff"
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="high"
                stroke="#00ff99"
                strokeWidth={1}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="low"
                stroke="#ff0066"
                strokeWidth={1}
                dot={false}
              />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey="price"
              stroke="#00ffff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#00ffff' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      
      <div className="cg-chart-footer">
        <span>📈 Data provided by <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer">CoinGecko</a></span>
      </div>
    </div>
  )
}
