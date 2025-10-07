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
}

export function useActions(autoRefresh = true): UseActionsReturn {
  const [trades, setTrades] = useState<ClosedTradeSimple[]>([])
  const [metrics, setMetrics] = useState<TradeMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [enableRealtime, setEnableRealtime] = useState(autoRefresh)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [tradesResult, metricsResult] = await Promise.all([
        dataService.getRecentTrades(),
        dataService.getPerformanceMetrics()
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
  }, [])

  useEffect(() => {
    fetchData()
    
    if (!enableRealtime) return
    
    const subscription = dataService.subscribeToTrades((payload) => {
      if (payload.eventType === 'INSERT') {
        setTrades(prev => [payload.new, ...prev].slice(0, 50))
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchData, enableRealtime])

  return {
    trades,
    metrics,
    loading,
    error,
    refresh: fetchData,
    enableRealtime,
    setEnableRealtime
  }
}
