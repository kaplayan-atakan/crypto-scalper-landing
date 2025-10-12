import type { CachedData, CoinCacheData } from '../types/coingecko'
import { CacheTTL } from '../types/coingecko'

const CACHE_PREFIX = 'cg_cache_'
const COIN_CACHE_PREFIX = 'coin_data_' // New: Coin-specific unified cache
const DEFAULT_TTL = CacheTTL.SHORT // 30 seconds

export class CacheManager {
  static get<T>(key: string): T | null {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null
      
      const parsedCache: CachedData<T> = JSON.parse(cached)
      const now = Date.now()
      
      // TTL kontrolü
      if (now - parsedCache.timestamp > parsedCache.ttl) {
        localStorage.removeItem(cacheKey)
        return null
      }
      
      console.log(`📦 Cache HIT: ${key}`)
      return parsedCache.data
    } catch (error) {
      console.error('Cache read error:', error)
      return null
    }
  }
  
  static set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        ttl
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}ms)`)
    } catch (error) {
      console.error('Cache write error:', error)
      // localStorage full ise eski cache'leri temizle
      this.clearOldCaches()
    }
  }
  
  static clearOldCaches(): void {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    let cleared = 0
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (!cached) return
          
          const parsedCache: CachedData<any> = JSON.parse(cached)
          if (now - parsedCache.timestamp > parsedCache.ttl) {
            localStorage.removeItem(key)
            cleared++
          }
        } catch {
          localStorage.removeItem(key)
          cleared++
        }
      }
    })
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} old cache entries`)
    }
  }
  
  static clear(): void {
    const keys = Object.keys(localStorage)
    let cleared = 0
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
        cleared++
      }
    })
    
    console.log(`🗑️ Cleared all ${cleared} cache entries`)
  }

  /**
   * Get coin-specific unified cache
   * Returns cached data if valid, null otherwise
   */
  static getCoinCache(coinId: string): CoinCacheData | null {
    try {
      const cacheKey = `${COIN_CACHE_PREFIX}${coinId}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) {
        console.log(`📭 Coin cache MISS: ${coinId}`)
        return null
      }
      
      const coinCache: CoinCacheData = JSON.parse(cached)
      const now = Date.now()
      
      // TTL kontrolü
      if (now - coinCache.fetchedAt > coinCache.ttl) {
        console.log(`⏰ Coin cache EXPIRED: ${coinId}`)
        localStorage.removeItem(cacheKey)
        return null
      }
      
      console.log(`📦 Coin cache HIT: ${coinId} (${coinCache.rawOHLC.length} candles)`)
      return coinCache
    } catch (error) {
      console.error('Coin cache read error:', error)
      return null
    }
  }

  /**
   * Set coin-specific unified cache
   * Stores raw OHLC data and pre-aggregated timeframes
   */
  static setCoinCache(coinCache: CoinCacheData): void {
    try {
      const cacheKey = `${COIN_CACHE_PREFIX}${coinCache.coinId}`
      localStorage.setItem(cacheKey, JSON.stringify(coinCache))
      
      console.log(`💾 Coin cache SET: ${coinCache.coinId}`)
      console.log(`   ├─ Raw 5m candles: ${coinCache.rawOHLC.length}`)
      console.log(`   ├─ Range: ${new Date(coinCache.dataRange.from * 1000).toISOString()} → ${new Date(coinCache.dataRange.to * 1000).toISOString()}`)
      console.log(`   ├─ TTL: ${coinCache.ttl}ms (${Math.round(coinCache.ttl / 3600000)}h)`)
      console.log(`   └─ Timeframes: ${Object.keys(coinCache.aggregated).join(', ')}`)
    } catch (error) {
      console.error('Coin cache write error:', error)
      // localStorage full ise eski cache'leri temizle
      this.clearOldCaches()
      // Retry
      try {
        const cacheKey = `${COIN_CACHE_PREFIX}${coinCache.coinId}`
        localStorage.setItem(cacheKey, JSON.stringify(coinCache))
      } catch (retryError) {
        console.error('Coin cache write retry failed:', retryError)
      }
    }
  }

  /**
   * Clear all coin-specific caches
   */
  static clearCoinCaches(): void {
    const keys = Object.keys(localStorage)
    let cleared = 0
    
    keys.forEach(key => {
      if (key.startsWith(COIN_CACHE_PREFIX)) {
        localStorage.removeItem(key)
        cleared++
      }
    })
    
    console.log(`🗑️ Cleared ${cleared} coin cache entries`)
  }
}
