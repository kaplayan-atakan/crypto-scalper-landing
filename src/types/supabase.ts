export interface ClosedTradeSimple {
  id: string
  bot_id: string
  symbol: string
  strategy: string
  entry_time: string
  exit_time: string
  entry_price: number
  exit_price: number
  position_size: number
  pnl_percentage: number
  pnl_amount: number
  exit_reason: string
  created_at: string
  updated_at: string
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

// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      closed_trades_simple: {
        Row: ClosedTradeSimple
        Insert: Omit<ClosedTradeSimple, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ClosedTradeSimple, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_trade_metrics: {
        Args: {
          p_bot_id: string
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
