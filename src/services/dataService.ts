import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ClosedTradeSimple, TradeMetrics, RealtimePayload, BotInfo } from '../types/supabase'

// Dinamik bot ID - localStorage'dan yükle veya default kullan
let CURRENT_BOT_ID = localStorage.getItem('selectedBotId') || 'scalper_core_MOM_1DK_V9_BinanceV7_Live'

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
      project_id: CURRENT_BOT_ID,
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

// closed_trades_simple verisinden metrik hesaplama
const calculateMetricsFromTrades = (trades: ClosedTradeSimple[], intervalHours: number = 1): TradeMetrics[] => {
  if (!trades || trades.length === 0) return []
  
  // İşlemleri zaman aralıklarına göre grupla
  const now = new Date()
  const intervals: { [key: string]: ClosedTradeSimple[] } = {}
  
  // Son 24 saati saat bazında böl
  const totalHours = 24
  for (let i = 0; i < totalHours; i += intervalHours) {
    const intervalStart = new Date(now.getTime() - (i + intervalHours) * 60 * 60 * 1000)
    const intervalEnd = new Date(now.getTime() - i * 60 * 60 * 1000)
    const key = intervalStart.toISOString()
    
    intervals[key] = trades.filter(trade => {
      const tradeTime = new Date(trade.created_at)
      return tradeTime >= intervalStart && tradeTime < intervalEnd
    })
  }
  
  // Her interval için metrik hesapla
  const metrics: TradeMetrics[] = Object.entries(intervals).map(([timestamp, intervalTrades]) => {
    if (intervalTrades.length === 0) {
      return {
        total_trades: 0,
        win_rate: 0,
        avg_pnl: 0,
        total_pnl: 0,
        max_drawdown: 0,
        sharpe_ratio: 0,
        timestamp
      }
    }
    
    // Toplam işlem sayısı
    const total_trades = intervalTrades.length
    
    // Kazanan işlem sayısı (PnL > 0)
    const winningTrades = intervalTrades.filter(t => t.pnl > 0)
    const win_rate = (winningTrades.length / total_trades) * 100
    
    // Toplam PnL
    const total_pnl = intervalTrades.reduce((sum, t) => sum + t.pnl, 0)
    
    // Ortalama PnL
    const avg_pnl = total_pnl / total_trades
    
    // Max Drawdown (kümülatif PnL'deki en büyük düşüş)
    let cumulativePnl = 0
    let maxPnl = 0
    let maxDrawdown = 0
    
    intervalTrades.forEach(trade => {
      cumulativePnl += trade.pnl
      maxPnl = Math.max(maxPnl, cumulativePnl)
      const drawdown = cumulativePnl - maxPnl
      maxDrawdown = Math.min(maxDrawdown, drawdown)
    })
    
    // Sharpe Ratio (basitleştirilmiş: ortalama PnL / standart sapma)
    const pnlValues = intervalTrades.map(t => t.pnl)
    const mean = avg_pnl
    const variance = pnlValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / total_trades
    const stdDev = Math.sqrt(variance)
    const sharpe_ratio = stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(252) // Yıllık Sharpe
    
    return {
      total_trades,
      win_rate,
      avg_pnl,
      total_pnl,
      max_drawdown: maxDrawdown,
      sharpe_ratio,
      timestamp
    }
  })
  
  // Zamana göre sırala (eskiden yeniye)
  return metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export const dataService = {
  // Bot yönetimi
  setCurrentBot(botId: string) {
    CURRENT_BOT_ID = botId
    localStorage.setItem('selectedBotId', botId)
  },

  getCurrentBot(): string {
    return CURRENT_BOT_ID
  },

  // Bot listesini getir
  async getAvailableBots(): Promise<{ data: BotInfo[] | null, error: Error | null }> {
    if (!isSupabaseConfigured()) {
      console.log('Using dummy bot list')
      return {
        data: [
          { project_id: 'scalper_core_MOM_1DK_V9_BinanceV7_Live', last_trade_at: new Date().toISOString() },
          { project_id: 'scalper_test_bot_v1', last_trade_at: new Date(Date.now() - 3600000).toISOString() },
          { project_id: 'momentum_trader_v2', last_trade_at: new Date(Date.now() - 7200000).toISOString() }
        ],
        error: null
      }
    }

    try {
      const { data, error } = await supabase!.rpc('get_distinct_bots')
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching bot list:', err)
      // Fallback: closed_trades_simple'dan distinct project_id'leri çek
      try {
        const { data, error } = await supabase!
          .from('closed_trades_simple')
          .select('project_id, created_at')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        
        // Distinct project_id'leri ve son işlem zamanlarını bul
        const botMap = new Map<string, string>()
        data?.forEach((trade: { project_id: string; created_at: string }) => {
          if (!botMap.has(trade.project_id)) {
            botMap.set(trade.project_id, trade.created_at)
          }
        })
        
        const bots: BotInfo[] = Array.from(botMap.entries()).map(([project_id, last_trade_at]) => ({
          project_id,
          last_trade_at
        }))
        
        return { data: bots, error: null }
      } catch (fallbackErr) {
        console.error('Fallback bot list failed:', fallbackErr)
        return { data: null, error: fallbackErr as Error }
      }
    }
  },

  // Son 24 saatlik işlemler
  async getRecentTrades(limit = 50, hours = 24): Promise<{ data: ClosedTradeSimple[] | null, error: Error | null }> {
    if (!isSupabaseConfigured()) {
      console.log('Using dummy trade data')
      return { 
        data: generateDummyTrades(limit), 
        error: null 
      }
    }
    
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase!
        .from('closed_trades_simple')
        .select('*')
        .eq('project_id', CURRENT_BOT_ID)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit)
      
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
      // closed_trades_simple'dan veriyi çek
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      const { data: trades, error } = await supabase!
        .from('closed_trades_simple')
        .select('*')
        .eq('project_id', CURRENT_BOT_ID)
        .gte('created_at', since)
        .order('created_at', { ascending: true }) // Eski -> Yeni sıralama
      
      if (error) throw error
      
      // Trades'den metrikleri hesapla
      const metrics = calculateMetricsFromTrades(trades || [], 1) // 1 saatlik intervallerle
      
      return { data: metrics, error: null }
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
          filter: `project_id=eq.${CURRENT_BOT_ID}`
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
