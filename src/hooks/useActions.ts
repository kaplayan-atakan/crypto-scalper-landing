import { useState, useEffect, useCallback } from 'react'
import { dataService } from '../services/dataService'
import type { ClosedTradeSimple, TradeMetrics } from '../types/supabase'

interface UseActionsReturn {
  trades: ClosedTradeSimple[]
  metrics: TradeMetrics[]
  loading: boolean
  error: Error | null
  refresh: () => void
  enableRealtime: boolean
  setEnableRealtime: (value: boolean) => void
  limit: number
  setLimit: (value: number) => void
  timeRange: number
  setTimeRange: (value: number) => void
}

export function useActions(autoRefresh = true): UseActionsReturn {
  const [trades, setTrades] = useState<ClosedTradeSimple[]>([])
  const [metrics, setMetrics] = useState<TradeMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [enableRealtime, setEnableRealtime] = useState(autoRefresh)
  const [limit, setLimit] = useState(50)
  const [timeRange, setTimeRange] = useState(24) // hours
  const [subscriptionKey, setSubscriptionKey] = useState(Date.now()) // Bot değişiminde yeniden subscribe için

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [tradesResult, metricsResult] = await Promise.all([
        dataService.getRecentTrades(limit, timeRange),
        dataService.getPerformanceMetrics(timeRange)
      ])
      
      if (tradesResult.error) throw tradesResult.error
      if (metricsResult.error) throw metricsResult.error
      
      setTrades(tradesResult.data || [])
      setMetrics(metricsResult.data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [limit, timeRange])

  // Bot değişikliğinde verileri yenile
  useEffect(() => {
    const handleBotChange = () => {
      setSubscriptionKey(Date.now()) // Force re-subscribe
      fetchData() // Yeni bot verilerini çek
    }
    
    window.addEventListener('botChanged', handleBotChange)
    return () => window.removeEventListener('botChanged', handleBotChange)
  }, [fetchData])

  useEffect(() => {
    fetchData()
    
    if (!enableRealtime) return
    
    const subscription = dataService.subscribeToTrades((payload) => {
      if (payload.eventType === 'INSERT') {
        setTrades(prev => [payload.new, ...prev].slice(0, limit))
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchData, enableRealtime, limit, subscriptionKey]) // subscriptionKey ekledik

  return {
    trades,
    metrics,
    loading,
    error,
    refresh: fetchData,
    enableRealtime,
    setEnableRealtime,
    limit,
    setLimit,
    timeRange,
    setTimeRange
  }
}
