import React, { useState, useEffect, useMemo } from 'react'
import { BinanceStyleChart } from '../BinanceStyleChart'
import { useCoinGecko } from '../../hooks/useCoinGecko'
import { CacheTTL, ChartTimeframe } from '../../types/coingecko'
import { formatPrice, formatPriceWithCurrency } from '../../utils/priceFormatter'
import type { ClosedTradeSimple } from '../../types/supabase'
import type { OHLCPoint } from '../../types/coingecko'
import './TradeDetailPopup.css'

interface TradeDetailPopupProps {
  trade: ClosedTradeSimple
  onClose: () => void
  initialTimezone?: number  // Optional timezone from parent (Live Actions page)
}

export function TradeDetailPopup({ trade, onClose, initialTimezone = 3 }: TradeDetailPopupProps) {
  // Use initialTimezone from parent if provided, otherwise load from localStorage
  const [timezoneOffset, setTimezoneOffset] = useState(() => {
    if (initialTimezone !== undefined) return initialTimezone
    const saved = localStorage.getItem('chartTimezone')
    return saved ? parseInt(saved, 10) : 3 // Default UTC+3
  })
  
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(ChartTimeframe.FIVE_MIN)
  const [refreshKey, setRefreshKey] = useState(0) // Force refresh
  
  // Memoize config to prevent unnecessary re-renders
  const coinGeckoConfig = useMemo(() => ({
    mode: 'ohlc' as const,  // Always use OHLC for Binance-style chart
    timeframe: timeframe,
    cacheTtl: CacheTTL.LONG  // 2 days cache for popup
  }), [timeframe])
  
  const { data, loading, error, refresh } = useCoinGecko(
    trade.symbol,
    trade.created_at,  // Use original timestamp - no year replacement!
    coinGeckoConfig
  )

  // Auto-refresh on timeframe change
  const handleTimeframeChange = (newTimeframe: ChartTimeframe) => {
    console.log('⏱️ Timeframe changed to:', newTimeframe)
    setTimeframe(newTimeframe)
    // useCoinGecko will automatically re-run with new timeframe
  }

  // Apply timezone offset to data
  const adjustedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return data
    
    // Adjust timestamps for timezone
    return data.map((point: any) => ({
      ...point,
      timestamp: point.timestamp + (timezoneOffset * 3600), // Add hours in seconds
    }))
  }, [data, timezoneOffset])

  // Format trade time with timezone
  const formatTradeTime = (timestamp: string) => {
    const date = new Date(timestamp)  // Use original timestamp
    const offsetMs = timezoneOffset * 60 * 60 * 1000
    const localDate = new Date(date.getTime() + offsetMs)
    
    return localDate.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
  
  // Type guard to check if data is OHLC
  const isOHLCData = (d: typeof data): d is OHLCPoint[] => {
    return d !== null && d.length > 0 && 'open' in d[0]
  }
  
  // Log popup açılışı - SADECE BİR KEZ (component mount'ta)
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 TradeDetailPopup OPENED - Binance Style')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Trade Details:', {
      symbol: trade.symbol,
      pnl: trade.pnl,
      score: trade.score,
      created_at: trade.created_at,
      reason: trade.reason.substring(0, 50) + '...'
    })
    console.log('⏱️ Initial Timeframe:', timeframe, '(trade-centered window)')
    console.log('💾 Cache TTL:', CacheTTL.LONG, 'ms (2 days)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }, []) // Empty dependency array = runs only once on mount
  
  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('⌨️ ESC pressed - closing popup')
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])
  
  // Log timeframe changes
  useEffect(() => {
    console.log('⏱️ Timeframe changed to:', timeframe)
  }, [timeframe])
  
  // Log data/loading/error state changes
  useEffect(() => {
    if (loading) {
      console.log('⏳ Loading CoinGecko data...')
    } else if (error) {
      console.error('❌ CoinGecko error:', error.message)
    } else if (data && Array.isArray(data)) {
      console.log('✅ CoinGecko data loaded successfully!')
      console.log('📊 Data points:', data.length)
      if (data.length > 0) {
        console.log('📈 First point:', data[0])
        console.log('📉 Last point:', data[data.length - 1])
      } else {
        console.warn('⚠️ Data array is empty')
      }
    }
  }, [data, loading, error])
  
  // Prevent body scroll when popup is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])
  
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts)
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  return (
    <div className="cg-popup-overlay" onClick={onClose}>
      <div className="cg-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cg-popup-header">
          <div className="cg-popup-title">
            <span className="cg-popup-symbol">{trade.symbol}</span>
            <span className="cg-popup-action">{trade.reason.substring(0, 30)}...</span>
          </div>
          
          {/* Timezone Display (Read-only) */}
          <div className="popup-timezone-display">
            🌍 UTC{timezoneOffset > 0 ? '+' : ''}{timezoneOffset}
          </div>
          
          <button className="cg-popup-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        {/* Trade Info */}
        <div className="cg-popup-info">
          <div className="cg-info-item">
            <span className="cg-info-label">PnL:</span>
            <span className={`cg-info-value ${(trade.pnl ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {trade.pnl !== null && trade.pnl !== undefined
                ? `${(trade.pnl ?? 0) >= 0 ? '+' : ''}${(trade.pnl * 100).toFixed(2)}%`
                : 'N/A'}
            </span>
          </div>
          <div className="cg-info-item">
            <span className="cg-info-label">Score:</span>
            <span className="cg-info-value">{trade.score?.toFixed(2) ?? 'N/A'}</span>
          </div>
          <div className="cg-info-item cg-info-timestamp">
            <span className="cg-info-label">Trade Time:</span>
            <span className="cg-info-value">
              {formatTradeTime(trade.created_at)}
              {timezoneOffset !== 0 && (
                <span className="popup-info-tz"> (UTC{timezoneOffset > 0 ? '+' : ''}{timezoneOffset})</span>
              )}
            </span>
          </div>
        </div>
        
        {/* Chart Controls */}
        <div className="cg-popup-controls">
          <div className="cg-timeframe-toggle">
            <button
              className={`cg-timeframe-btn ${timeframe === ChartTimeframe.ONE_MIN ? 'active' : ''}`}
              onClick={() => handleTimeframeChange(ChartTimeframe.ONE_MIN)}
              title="1-minute candles (60 candles for 1 hour) - Best for scalping"
            >
              1m
            </button>
            <button
              className={`cg-timeframe-btn ${timeframe === ChartTimeframe.THREE_MIN ? 'active' : ''}`}
              onClick={() => handleTimeframeChange(ChartTimeframe.THREE_MIN)}
              title="3-minute candles (20 candles for 1 hour) - Quick trades"
            >
              3m
            </button>
            <button
              className={`cg-timeframe-btn ${timeframe === ChartTimeframe.FIVE_MIN ? 'active' : ''}`}
              onClick={() => handleTimeframeChange(ChartTimeframe.FIVE_MIN)}
              title="5-minute candles (36 candles for 3 hours) - Default view"
            >
              5m
            </button>
            <button
              className={`cg-timeframe-btn ${timeframe === ChartTimeframe.FIFTEEN_MIN ? 'active' : ''}`}
              onClick={() => handleTimeframeChange(ChartTimeframe.FIFTEEN_MIN)}
              title="15-minute candles (24 candles for 6 hours) - Longer timeframe"
            >
              15m
            </button>
          </div>
          
          <button className="cg-refresh-btn" onClick={() => setRefreshKey(prev => prev + 1)} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
        
        {/* Chart Area */}
        <div className="cg-popup-chart" key={refreshKey}>
          {loading && (
            <div className="cg-chart-loading">
              <div className="cg-spinner"></div>
              <p>Loading chart data...</p>
            </div>
          )}
          
          {error && (
            <div className="cg-chart-error">
              <p className="cg-error-icon">⚠️</p>
              <p className="cg-error-message">{error.message}</p>
              <div className="cg-error-details">
                <p className="cg-error-hint">
                  {error.message.includes('Desteklenmeyen sembol') ? (
                    <>
                      <strong>{trade.symbol}</strong> için CoinGecko'da veri bulunamadı.
                      <br />
                      Bu sembol henüz CoinGecko'da listelenmiş olmayabilir veya farklı bir isimle kayıtlı olabilir.
                    </>
                  ) : (
                    <>
                      Grafik verisi yüklenirken bir hata oluştu.
                      <br />
                      Lütfen tekrar deneyin veya daha sonra kontrol edin.
                    </>
                  )}
                </p>
              </div>
              <button className="cg-retry-btn" onClick={() => setRefreshKey(prev => prev + 1)}>
                🔄 Tekrar Dene
              </button>
            </div>
          )}
          
          {!loading && !error && adjustedData && Array.isArray(adjustedData) && adjustedData.length > 0 && (
            <>
              <BinanceStyleChart
                data={adjustedData}
                height={450}
                showVolume={false}
                tradeTimestamp={trade.created_at}  // Use original timestamp
              />
              <div className="cg-chart-info">
                📍 Trade-centered window: {adjustedData.length} × {timeframe} candles
                <br />
                🕐 Timezone: UTC{timezoneOffset > 0 ? '+' : ''}{timezoneOffset}
              </div>
            </>
          )}
          
          {!loading && !error && (!adjustedData || !Array.isArray(adjustedData) || adjustedData.length === 0) && (
            <div className="cg-chart-error">
              <p className="cg-error-icon">⚠️</p>
              <p className="cg-error-message">Invalid chart data format</p>
            </div>
          )}
        </div>
        
        {/* Info Footer */}
        <div className="cg-popup-footer">
          <p>
            💡 Chart shows trade-centered window
            {timeframe === ChartTimeframe.ONE_MIN && ' (60 min = 60 x 1m candles)'}
            {timeframe === ChartTimeframe.THREE_MIN && ' (120 min = 40 x 3m candles)'}
            {timeframe === ChartTimeframe.FIVE_MIN && ' (180 min = 36 x 5m candles)'}
            {timeframe === ChartTimeframe.FIFTEEN_MIN && ' (360 min = 24 x 15m candles)'}
          </p>
          <p className="cg-footer-hint">Press ESC or click outside to close</p>
        </div>
      </div>
    </div>
  )
}
