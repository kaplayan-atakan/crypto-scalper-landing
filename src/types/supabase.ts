export interface ClosedTradeSimple {
  id: string
  project_id: string // Bot ID (was bot_id)
  symbol: string
  pnl: number // Kar/Zarar miktarı
  reason: string // Trade açılma/kapanma nedeni
  score: number // Trade skor değeri
  r1m: number // 1 dakika momentum
  atr5m: number // 5 dakika ATR (volatilite)
  z1m: number // Z-score 1 dakika
  vshock: number // Volume şok göstergesi
  upt: number // Upturn göstergesi
  trend: number // Trend yönü
  volr: number // Volume oranı
  created_at: string // Kayıt oluşturma zamanı
}

export interface TradeMetrics {
  total_trades: number
  win_rate: number
  avg_pnl: number
  total_pnl: number
  max_drawdown: number
  sharpe_ratio: number
  timestamp: string
}

export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
}

export interface BotInfo {
  project_id: string
  last_trade_at: string
  // İsteğe bağlı: bot metadataları
  display_name?: string
  trade_count?: number
}

export interface BotSelectorState {
  selectedBot: string
  availableBots: BotInfo[]
  isLoading: boolean
  error: Error | null
}

// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      closed_trades_simple: {
        Row: ClosedTradeSimple
        Insert: Omit<ClosedTradeSimple, 'id' | 'created_at'>
        Update: Partial<Omit<ClosedTradeSimple, 'id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_trade_metrics: {
        Args: {
          p_project_id: string
          p_interval: string
        }
        Returns: TradeMetrics[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
