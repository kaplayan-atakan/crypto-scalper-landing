import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ClosedTradeSimple, TradeMetrics, RealtimePayload } from '../types/supabase'

const TARGET_BOT_ID = 'scalper_core_MOM_1DK_V9_BinanceV7_Live'

// Dummy data fallback
const generateDummyTrades = (count: number): ClosedTradeSimple[] => {
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'MATIC/USDT']
  const strategies = ['Momentum', 'Mean Reversion', 'Breakout', 'Scalp']
  const exitReasons = ['TP', 'SL', 'Manual', 'Timeout']
  
  return Array.from({ length: count }, (_, i) => {
    const entryPrice = 45000 + Math.random() * 10000
    const exitPrice = entryPrice * (1 + (Math.random() - 0.48) * 0.05)
    const pnlPercentage = ((exitPrice - entryPrice) / entryPrice) * 100
    const positionSize = Math.random() * 0.5 + 0.1
    
    const now = new Date()
    const exitTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
    const entryTime = new Date(exitTime.getTime() - Math.random() * 60 * 60 * 1000)
    
    return {
      id: `TRD${1000 + i}`,
      bot_id: TARGET_BOT_ID,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      entry_time: entryTime.toISOString(),
      exit_time: exitTime.toISOString(),
      entry_price: entryPrice,
      exit_price: exitPrice,
      position_size: positionSize,
      pnl_percentage: pnlPercentage,
      pnl_amount: pnlPercentage * positionSize * entryPrice / 100,
      exit_reason: exitReasons[Math.floor(Math.random() * exitReasons.length)],
      created_at: entryTime.toISOString(),
      updated_at: exitTime.toISOString()
    }
  }).sort((a, b) => new Date(b.exit_time).getTime() - new Date(a.exit_time).getTime())
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
        .eq('bot_id', TARGET_BOT_ID)
        .gte('exit_time', since)
        .order('exit_time', { ascending: false })
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
          p_bot_id: TARGET_BOT_ID,
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
          filter: `bot_id=eq.${TARGET_BOT_ID}`
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
