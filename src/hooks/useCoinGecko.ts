import { useState, useEffect, useCallback } from 'react'
import { fetchMarketChartRange, fetchOHLC, symbolToCoinGeckoIdAsync } from '../lib/coingecko'
import { CacheManager } from '../utils/cacheManager'
import { rateLimiter } from '../utils/rateLimiter'
import { CacheTTL, ChartTimeframe, TIMEFRAME_WINDOW_MINUTES } from '../types/coingecko'
import type { MarketChartPoint, OHLCPoint, CoinGeckoConfig, CoinCacheData } from '../types/coingecko'

/**
 * Aggregate 5-minute OHLC candles into 15-minute candles
 * Groups every 3 consecutive 5m candles into one 15m candle
 */
function aggregateTo15Min(ohlcData: OHLCPoint[]): OHLCPoint[] {
  const aggregated: OHLCPoint[] = []
  
  // Group by 3 (3 x 5min = 15min)
  for (let i = 0; i < ohlcData.length; i += 3) {
    const group = ohlcData.slice(i, i + 3)
    if (group.length === 0) continue
    
    // Calculate 15m candle from 5m candles
    const candle: OHLCPoint = {
      timestamp: group[0].timestamp, // Use first candle's timestamp
      open: group[0].open,           // First candle's open
      high: Math.max(...group.map(c => c.high)), // Highest high
      low: Math.min(...group.map(c => c.low)),   // Lowest low
      close: group[group.length - 1].close       // Last candle's close
    }
    
    aggregated.push(candle)
  }
  
  console.log(`📊 Aggregated ${ohlcData.length} x 5m → ${aggregated.length} x 15m candles`)
  return aggregated
}

/**
 * Calculate optimal time window centered around trade execution
 * Ensures trade timestamp is visible in the chart
 */
function calculateTradeWindow(tradeTime: number, timeframe: ChartTimeframe) {
  const windowMinutes = TIMEFRAME_WINDOW_MINUTES[timeframe]
  const halfWindow = (windowMinutes * 60) / 2 // seconds
  
  const now = Math.floor(Date.now() / 1000)
  
  // Center trade time in the window
  let fromTs = Math.floor(tradeTime - halfWindow)
  let toTs = Math.floor(tradeTime + halfWindow)
  
  // If trade is very recent, extend to current time
  if (toTs < now && (now - toTs) < 1800) { // Within 30 minutes
    toTs = now
    fromTs = now - (windowMinutes * 60)
  }
  
  // Ensure we don't go into the future
  if (toTs > now) {
    toTs = now
    fromTs = now - (windowMinutes * 60)
  }
  
  return { fromTs, toTs, windowMinutes }
}

/**
 * Calculate optimal data range for fetching
 * Ensures we have enough data for all timeframes
 * Fetches 7 days of data (maximum for good 5m granularity)
 */
function calculateDataRange(tradeTime: number) {
  const now = Math.floor(Date.now() / 1000)
  
  // Fetch 7 days of data (enough for all timeframes)
  // 7 days = 2016 x 5-minute candles
  const sevenDaysInSeconds = 7 * 24 * 60 * 60
  
  let toTs = now // Always fetch up to current time
  let fromTs = Math.max(tradeTime - sevenDaysInSeconds, now - sevenDaysInSeconds)
  
  return { fromTs, toTs, days: 7 }
}

/**
 * Filter cached data for specific time window
 * Extracts relevant candles for the requested timeframe view
 */
function filterDataForWindow(
  coinCache: CoinCacheData,
  tradeTime: number,
  timeframe: ChartTimeframe
): OHLCPoint[] {
  const { fromTs, toTs } = calculateTradeWindow(tradeTime, timeframe)
  
  // Get pre-aggregated data for timeframe
  let data: OHLCPoint[] = []
  
  switch (timeframe) {
    case ChartTimeframe.FIFTEEN_MIN:
      data = coinCache.aggregated['15m'] || []
      break
    case ChartTimeframe.THREE_MIN:
    case ChartTimeframe.ONE_MIN:
    case ChartTimeframe.FIVE_MIN:
    default:
      data = coinCache.aggregated['5m'] || coinCache.rawOHLC
      break
  }
  
  // Filter for window
  const filtered = data.filter(candle => {
    const candleTime = candle.timestamp / 1000 // ms to seconds
    return candleTime >= fromTs && candleTime <= toTs
  })
  
  console.log(`🎯 Filtered ${data.length} candles → ${filtered.length} candles for window`)
  return filtered
}

interface UseCoinGeckoReturn {
  data: MarketChartPoint[] | OHLCPoint[] | null
  loading: boolean
  error: Error | null
  refresh: () => void
}

export function useCoinGecko(
  symbol: string,
  tradeTimestamp: string,
  config: CoinGeckoConfig = { mode: 'ohlc', timeframe: ChartTimeframe.FIVE_MIN, cacheTtl: CacheTTL.LONG }
): UseCoinGeckoReturn {
  const [data, setData] = useState<MarketChartPoint[] | OHLCPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Extract config fields for stable dependencies
  const { mode, timeframe = ChartTimeframe.FIVE_MIN, cacheTtl = CacheTTL.LONG } = config
  
  const fetchData = useCallback(async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 useCoinGecko: Starting fetch')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Request:', { symbol, timeframe, mode })
    
    if (!symbol || !tradeTimestamp) {
      setError(new Error('Symbol ve trade timestamp gerekli'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Symbol to CoinGecko ID mapping
      const coinId = await symbolToCoinGeckoIdAsync(symbol)
      console.log('🔄 Mapping:', { symbol, coinId })
      
      if (!coinId) {
        const errorMsg = `Desteklenmeyen sembol: ${symbol}`
        console.error('❌', errorMsg)
        setError(new Error(errorMsg))
        setLoading(false)
        return
      }
      
      const tradeTime = Math.floor(new Date(tradeTimestamp).getTime() / 1000)
      
      // 2. Check coin-specific cache (SINGLE SOURCE OF TRUTH)
      let coinCache = CacheManager.getCoinCache(coinId)
      
      if (coinCache) {
        console.log('✅ Coin cache EXISTS - using cached data')
        
        // Extract data for requested timeframe and window
        if (mode === 'ohlc') {
          const filteredData = filterDataForWindow(coinCache, tradeTime, timeframe)
          setData(filteredData)
          setLoading(false)
          return
        } else {
          // Line chart mode - convert OHLC to price points
          const priceData: MarketChartPoint[] = coinCache.rawOHLC.map(candle => ({
            timestamp: candle.timestamp,
            price: candle.close
          }))
          setData(priceData)
          setLoading(false)
          return
        }
      }
      
      // 3. Cache MISS - fetch from API (ONLY ONCE PER COIN)
      console.log('� Coin cache MISS - fetching from API...')
      console.log('⚠️ This is the ONLY API call for this coin (rate limit safe)')
      
      const { fromTs, toTs, days } = calculateDataRange(tradeTime)
      
      console.log('� Data range:', {
        trade: new Date(tradeTime * 1000).toISOString(),
        from: new Date(fromTs * 1000).toISOString(),
        to: new Date(toTs * 1000).toISOString(),
        days: `${days} days`
      })
      
      // Fetch raw 5m OHLC data from API
      const result = await rateLimiter.add(() => 
        fetchOHLC(coinId, 'usd', days)
      )
      
      console.log('✅ API response:', result?.length || 0, 'candles')
      
      // Convert to OHLCPoint[]
      const rawOHLC: OHLCPoint[] = result.map((point: number[]) => ({
        timestamp: point[0],
        open: point[1],
        high: point[2],
        low: point[3],
        close: point[4]
      }))
      
      // 4. Pre-aggregate data for all timeframes
      const aggregated15m = aggregateTo15Min(rawOHLC)
      
      // 5. Create unified coin cache object
      coinCache = {
        coinId,
        symbol,
        rawOHLC,
        fetchedAt: Date.now(),
        ttl: cacheTtl,
        dataRange: { from: fromTs, to: toTs },
        aggregated: {
          '5m': rawOHLC,           // Native 5m from API
          '15m': aggregated15m,    // Pre-aggregated 15m
          '1m': rawOHLC,           // Fallback to 5m (API limitation)
          '3m': rawOHLC            // Fallback to 5m (API limitation)
        }
      }
      
      // 6. Save to cache (SINGLE WRITE)
      CacheManager.setCoinCache(coinCache)
      
      console.log('✅ Coin cache SAVED')
      console.log('   ├─ Total candles:', rawOHLC.length)
      console.log('   ├─ Aggregated 15m:', aggregated15m.length)
      console.log('   └─ All timeframes ready for instant switching!')
      
      // 7. Return filtered data for current view
      if (mode === 'ohlc') {
        const filteredData = filterDataForWindow(coinCache, tradeTime, timeframe)
        setData(filteredData)
      } else {
        const priceData: MarketChartPoint[] = rawOHLC.map(candle => ({
          timestamp: candle.timestamp,
          price: candle.close
        }))
        setData(priceData)
      }
      
    } catch (err) {
      console.error('❌ Fetch error:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    }
  }, [symbol, tradeTimestamp, mode, timeframe, cacheTtl])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  return { data, loading, error, refresh: fetchData }
}
