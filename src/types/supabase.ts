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

// Run Notes Types
export interface RunNote {
  id: string
  run_id: string
  note: string
  created_at: string
  is_pinned: boolean
}

// Backtest Result Types
export interface BacktestResult {
  id: string
  run_id: string
  symbol: string
  len1: number
  mult1: number
  rr: number
  min_bw_pct: number
  min_count: number
  max_count: number
  early_tp: boolean
  trades: number
  winrate: number | null
  payoff: number | null
  mean_ret: number | null
  sharpe_like: number | null
  sum_ret: number | null
  equity: number | null
  max_dd: number | null
  created_at: string
}

export interface SymbolMetrics {
  symbol: string
  winrate: number
  pnl: number
  equity: number  // ✅ Equity değeri
  trades_count: number
  sharpe: number
  max_dd: number
  return_per_trade: number  // ✅ İşlem Başı Getiri: (equity - 1) / trades
}

export interface RunOverview {
  run_id: string
  created_at: string
  total_symbols: number
  total_trades: number         // NEW: Toplam trade sayısı
  overall_winrate: number       // NEW: Overall winrate
  positive_count: number
  negative_count: number
  neutral_count: number         // NEW: PNL = 0 olan symbol sayısı
  // Run-level statistics (ALL symbols)
  avg_pnl_all: number
  min_pnl_all: number
  max_pnl_all: number
  avg_pnl_positive: number
  min_pnl_positive: number
  max_pnl_positive: number
  avg_pnl_negative: number
  min_pnl_negative: number
  max_pnl_negative: number
  // Top 40 symbols statistics
  top40_total_trades?: number
  top40_overall_winrate?: number
  top40_avg_pnl?: number
  top40_min_pnl?: number
  top40_max_pnl?: number
  top40_avg_pnl_positive?: number
  top40_avg_pnl_negative?: number
  top40_positive_count?: number
  top40_negative_count?: number
  top40_neutral_count?: number
}

export interface OverallMetricsV1Enhanced {
  run_id: string
  last_created_at: string
  total_trades: number
  avg_equity: number
  avg_net_return: number
  backoff_rate: number
  avg_winrate_pct: number
  coins_total: number
  coins_pos: number
  coins_neg: number
  coins_flat: number
  max_count: number
  min_count: number
  pos_pct: number
  neg_pct: number
}

export interface RunColumn extends RunOverview {
  symbols: SymbolMetrics[] // Sorted by PNL descending
  v1_enhanced?: OverallMetricsV1Enhanced | null  // V1 Enhanced overall metrics
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
      run_notes: {
        Row: RunNote
        Insert: Omit<RunNote, 'id' | 'created_at'>
        Update: Partial<Omit<RunNote, 'id' | 'created_at'>>
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
      get_distinct_bots: {
        Args: Record<string, never>
        Returns: BotInfo[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
