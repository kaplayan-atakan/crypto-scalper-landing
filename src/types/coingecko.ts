// TTL (Time To Live) cache durations
export enum CacheTTL {
  SHORT = 30000,        // 30 seconds - for real-time data
  MEDIUM = 300000,      // 5 minutes - for frequent updates
  LONG = 172800000      // 2 days (48 hours) - for historical data in popups
}

// Timeframe intervals for chart display
export enum ChartTimeframe {
  ONE_MIN = '1m',       // 1-minute candles - highest granularity for scalping
  THREE_MIN = '3m',     // 3-minute candles - good for quick trades
  FIVE_MIN = '5m',      // 5-minute candles - default
  FIFTEEN_MIN = '15m'   // 15-minute candles (aggregated from 5m)
}

// Timeframe duration in seconds
export const TIMEFRAME_SECONDS: Record<ChartTimeframe, number> = {
  [ChartTimeframe.ONE_MIN]: 60,
  [ChartTimeframe.THREE_MIN]: 180,
  [ChartTimeframe.FIVE_MIN]: 300,
  [ChartTimeframe.FIFTEEN_MIN]: 900,
}

// Optimal chart window size in minutes for each timeframe
export const TIMEFRAME_WINDOW_MINUTES: Record<ChartTimeframe, number> = {
  [ChartTimeframe.ONE_MIN]: 60,      // 60 minutes = 60 candles
  [ChartTimeframe.THREE_MIN]: 120,   // 120 minutes = 40 candles
  [ChartTimeframe.FIVE_MIN]: 180,    // 180 minutes = 36 candles
  [ChartTimeframe.FIFTEEN_MIN]: 360, // 360 minutes = 24 candles
}

export interface MarketChartPoint {
  timestamp: number
  price: number
}

export interface OHLCPoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

/**
 * Unified cache object for a single coin
 * Stores raw 5m OHLC data that can be aggregated for all timeframes
 */
export interface CoinCacheData {
  coinId: string                    // CoinGecko coin ID (e.g., 'bitcoin')
  symbol: string                    // Trading symbol (e.g., 'BTCUSDT')
  rawOHLC: OHLCPoint[]             // Raw 5-minute OHLC candles from API
  fetchedAt: number                 // Timestamp when data was fetched
  ttl: number                       // Cache duration in milliseconds
  dataRange: {
    from: number                    // Start timestamp (seconds)
    to: number                      // End timestamp (seconds)
  }
  // Pre-aggregated data for performance
  aggregated: {
    '1m'?: OHLCPoint[]             // 1m (uses 5m as-is due to API limitation)
    '3m'?: OHLCPoint[]             // 3m (uses 5m as-is due to API limitation)
    '5m': OHLCPoint[]              // 5m (native from API)
    '15m'?: OHLCPoint[]            // 15m (aggregated from 5m)
  }
}

export interface CoinGeckoConfig {
  mode: 'line' | 'ohlc' | 'range'
  timeframe?: ChartTimeframe  // 5m or 15m
  days?: number
  from?: number
  to?: number
  cacheTtl?: number
  granularity?: 'minute' | 'hourly' | 'daily'
}

export interface CachedData<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface ChartDataResponse {
  prices: [number, number][]
  market_caps?: [number, number][]
  total_volumes?: [number, number][]
}

export interface OHLCDataResponse {
  data: [number, number, number, number, number][]
}
