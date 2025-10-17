import React, { useState, useEffect, useRef } from 'react'
import { BinanceStyleChart } from '../BinanceStyleChart'
import type { OHLCPoint } from '../../types/coingecko'
import { 
  fetchOHLC,
  SYMBOL_TO_COINGECKO_ID 
} from '../../lib/coingecko'

interface LiveMarketChartProps {
  symbol: string // e.g., 'BTCUSDT', 'ETHUSDT'
  coinId: string // e.g., 'bitcoin', 'ethereum'
  color: 'orange' | 'purple' | 'cyan' | 'green'
}

interface MarketData {
  current_price: number
  price_change_24h: number
  price_change_percentage_24h: number
  market_cap: number
  total_volume: number
  high_24h: number
  low_24h: number
}

export default function LiveMarketChart({ symbol, coinId, color }: LiveMarketChartProps) {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [candles, setCandles] = useState<OHLCPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  const refreshIntervalRef = useRef<number | null>(null)

  // Fetch live market data and chart data
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch OHLC data for last 1 day (returns hourly candles)
      // This gives us real candlesticks with proper open/high/low/close values
      const ohlcData = await fetchOHLC(coinId, 'usd', 1)
      
      // Convert OHLC array format to OHLCPoint objects
      const candleData: OHLCPoint[] = ohlcData.map((point: number[]) => ({
        timestamp: Math.floor(point[0] / 1000), // Convert ms to seconds
        open: point[1],
        high: point[2],
        low: point[3],
        close: point[4]
      }))
      
      // Filter to last 4 hours only
      const now = Math.floor(Date.now() / 1000)
      const fourHoursAgo = now - (4 * 60 * 60)
      const recentCandles = candleData.filter(c => c.timestamp >= fourHoursAgo)
      
      console.log(`📊 ${symbol}: Loaded ${recentCandles.length} candles (last 4h)`)
      
      setCandles(recentCandles)
      
      // Calculate market data from candles
      if (recentCandles.length > 0) {
        const latestCandle = recentCandles[recentCandles.length - 1]
        const firstCandle = recentCandles[0]
        const priceChange = latestCandle.close - firstCandle.open
        const priceChangePercent = (priceChange / firstCandle.open) * 100
        
        const high24h = Math.max(...recentCandles.map(c => c.high))
        const low24h = Math.min(...recentCandles.map(c => c.low))
        
        setMarketData({
          current_price: latestCandle.close,
          price_change_24h: priceChange,
          price_change_percentage_24h: priceChangePercent,
          market_cap: 0, // Not available from OHLC
          total_volume: 0, // Not available from OHLC
          high_24h: high24h,
          low_24h: low24h
        })
      }

      setLastUpdate(new Date())
      setLoading(false)
    } catch (err) {
      console.error('❌ LiveMarketChart fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch OHLC data')
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [coinId])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      console.log(`🔄 Auto-refreshing ${symbol} market data...`)
      fetchData()
    }, 60 * 1000) // 60 seconds

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [coinId, symbol])

  // Calculate 4-hour high/low from candles
  const fourHourHigh = candles.length > 0 
    ? Math.max(...candles.map(c => c.high)) 
    : marketData?.high_24h || 0

  const fourHourLow = candles.length > 0 
    ? Math.min(...candles.map(c => c.low)) 
    : marketData?.low_24h || 0

  // Calculate volatility (percentage difference between high and low)
  const volatility = fourHourHigh && fourHourLow
    ? (((fourHourHigh - fourHourLow) / fourHourLow) * 100).toFixed(2)
    : '0.00'

  // Format large numbers (market cap, volume)
  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    return `$${num.toLocaleString()}`
  }

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const displaySymbol = symbol.replace('USDT', '')
  const isPositive = (marketData?.price_change_percentage_24h || 0) >= 0

  if (loading && !marketData) {
    return (
      <div className={`mini-trade-card mini-trade-card--${color}`}>
        <div className="mini-trade-card__header">
          <h3 className="mini-trade-card__title">{displaySymbol} Market</h3>
        </div>
        <div className="mini-trade-card__chart" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '300px' 
        }}>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`mini-trade-card mini-trade-card--${color}`}>
        <div className="mini-trade-card__header">
          <h3 className="mini-trade-card__title">{displaySymbol} Market</h3>
        </div>
        <div className="mini-trade-card__chart" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '300px',
          color: '#ef4444'
        }}>
          <p>❌ {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`mini-trade-card mini-trade-card--${color}`}>
      {/* Header */}
      <div className="mini-trade-card__header">
        <h3 className="mini-trade-card__title">{displaySymbol} Market</h3>
        <span className="live-indicator">
          <span className="live-indicator__dot"></span>
          <span className="live-indicator__text">LIVE</span>
        </span>
      </div>

      {/* Current Price Display */}
      <div className="current-price-section">
        <div className="current-price-display">
          ${marketData?.current_price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </div>
        <div className={`price-change-24h price-change-24h--${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(marketData?.price_change_percentage_24h || 0).toFixed(2)}%
          <span className="price-change-24h__amount">
            ({isPositive ? '+' : '-'}${Math.abs(marketData?.price_change_24h || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })})
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="mini-trade-card__chart">
        {candles.length > 0 ? (
          <BinanceStyleChart
            data={candles}
            height={220}
            showVolume={false}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '220px'
          }}>
            <p style={{ color: 'var(--text-muted)' }}>No chart data available</p>
          </div>
        )}
      </div>

      {/* Market Stats Grid */}
      <div className="market-stats-grid">
        <div className="market-stat">
          <span className="market-stat__label">High (4h)</span>
          <span className="market-stat__value market-stat__value--positive">
            ${fourHourHigh.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="market-stat">
          <span className="market-stat__label">Low (4h)</span>
          <span className="market-stat__value market-stat__value--negative">
            ${fourHourLow.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="market-stat">
          <span className="market-stat__label">Volatility</span>
          <span className="market-stat__value">{volatility}%</span>
        </div>
        <div className="market-stat">
          <span className="market-stat__label">Market Cap</span>
          <span className="market-stat__value">{formatLargeNumber(marketData?.market_cap || 0)}</span>
        </div>
        <div className="market-stat">
          <span className="market-stat__label">Volume (24h)</span>
          <span className="market-stat__value">{formatLargeNumber(marketData?.total_volume || 0)}</span>
        </div>
        <div className="market-stat">
          <span className="market-stat__label">Updated</span>
          <span className="market-stat__value">{formatRelativeTime(lastUpdate)}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mini-trade-card__footer">
        <a 
          href={`https://www.coingecko.com/en/coins/${coinId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="coingecko-link"
        >
          View on CoinGecko →
        </a>
      </div>
    </div>
  )
}
