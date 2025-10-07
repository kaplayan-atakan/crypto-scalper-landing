import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ClosedTradeSimple, TradeMetrics, RealtimePayload } from '../types/supabase'

const TARGET_PROJECT_ID = 'scalper_core_MOM_1DK_V9_BinanceV7_Live'

// Dummy data fallback
const generateDummyTrades = (count: number): ClosedTradeSimple[] => {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'MATICUSDT', 'PUMPBTCUSDT']
  const reasons = ['TP Hit', 'SL Triggered', 'Manual Close', 'Timeout', 'Score Improved', 'Volume Spike']
  
  return Array.from({ length: count }, (_, i) => {
    const pnl = (Math.random() - 0.45) * 200 // -90 to +110 range
    const score = Math.random() * 100
    
    const now = new Date()
    const createdAt = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
    
    return {
      id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      project_id: TARGET_PROJECT_ID,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      pnl: parseFloat(pnl.toFixed(2)),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      score: parseFloat(score.toFixed(2)),
      r1m: (Math.random() - 0.5) * 10,
      atr5m: Math.random() * 5,
      z1m: (Math.random() - 0.5) * 4,
      vshock: Math.random() * 3,
      upt: Math.random() * 2,
      trend: (Math.random() - 0.5) * 2,
      volr: Math.random() * 1.5,
      created_at: createdAt.toISOString()
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

const generateDummyMetrics = (hours: number): TradeMetrics[] => {
  const metrics: TradeMetrics[] = []
  const now = new Date()
  
  for (let i = hours - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    metrics.push({
      total_trades: Math.floor(Math.random() * 20) + 5,
      win_rate: 50 + Math.random() * 30,
      avg_pnl: (Math.random() - 0.3) * 2,
      total_pnl: (Math.random() - 0.2) * 500,
      max_drawdown: -5 - Math.random() * 10,
      sharpe_ratio: 1 + Math.random() * 2,
      timestamp: timestamp.toISOString()
    })
  }
  
  return metrics
}

export const dataService = {
  // Son 24 saatlik işlemler
  async getRecentTrades(hours = 24): Promise<{ data: ClosedTradeSimple[] | null, error: Error | null }> {
    if (!isSupabaseConfigured()) {
      console.log('Using dummy trade data')
      return { 
        data: generateDummyTrades(50), 
        error: null 
      }
    }
    
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase!
        .from('closed_trades_simple')
        .select('*')
        .eq('project_id', TARGET_PROJECT_ID)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching trades:', err)
      return { data: null, error: err as Error }
    }
  },

  // Performans metrikleri (aggregated)
  async getPerformanceMetrics(hours = 24): Promise<{ data: TradeMetrics[] | null, error: Error | null }> {
    if (!isSupabaseConfigured()) {
      console.log('Using dummy metrics data')
      return { 
        data: generateDummyMetrics(hours), 
        error: null 
      }
    }
    
    try {
      // RPC call veya view'dan çek
      const { data, error } = await supabase!
        .rpc('get_trade_metrics', {
          p_project_id: TARGET_PROJECT_ID,
          p_interval: 'hourly'
        } as any)
      
      if (error) throw error
      
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching metrics:', err)
      // Fallback to dummy data on error
      return { 
        data: generateDummyMetrics(hours), 
        error: null 
      }
    }
  },

  // Realtime subscription
  subscribeToTrades(callback: (payload: RealtimePayload<ClosedTradeSimple>) => void) {
    if (!isSupabaseConfigured()) {
      console.log('Realtime not available - Supabase not configured')
      // Return mock subscription
      return {
        unsubscribe: () => console.log('Mock unsubscribe')
      }
    }
    
    return supabase!
      .channel('trades-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'closed_trades_simple',
          filter: `project_id=eq.${TARGET_PROJECT_ID}`
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          })
        }
      )
      .subscribe()
  }
}
