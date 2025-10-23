-- Updated RPC function with LIMIT and OFFSET for pagination
-- Drop existing function first
DROP FUNCTION IF EXISTS get_backtest_details_by_runs(uuid[]);

-- Create new function with pagination parameters
CREATE OR REPLACE FUNCTION get_backtest_details_by_runs(
  run_ids uuid[],
  p_limit int DEFAULT 1000,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  run_id uuid,
  symbol text,
  winrate numeric,
  pnl numeric,
  trades_count int,
  sharpe numeric,
  max_dd numeric,
  avg_pnl_positive numeric,
  avg_pnl_negative numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH symbol_params AS (
    -- Her symbol'ün her bir parametre setini al
    SELECT 
      br.run_id,
      br.symbol,
      br.winrate,
      br.sum_ret,
      br.mean_ret,
      br.trades,
      br.sharpe_like,
      br.max_dd
    FROM backtest_resultsv1 br
    WHERE br.run_id = ANY(run_ids)
  ),
  symbol_aggregates AS (
    -- Her symbol için aggregated değerler
    SELECT 
      sp.run_id,
      sp.symbol,
      AVG(sp.winrate) as avg_winrate,
      AVG(sp.sum_ret) as avg_sum_ret,
      AVG(sp.mean_ret) as avg_mean_ret,
      SUM(sp.trades) as total_trades,
      AVG(sp.sharpe_like) as avg_sharpe,
      MIN(sp.max_dd) as min_max_dd
    FROM symbol_params sp
    GROUP BY sp.run_id, sp.symbol
  ),
  trade_level_calcs AS (
    -- Trade-level istatistikleri hesapla (backtest_resultsv1'den mean_ret kullan)
    SELECT 
      sa.run_id,
      sa.symbol,
      sa.avg_winrate,
      sa.avg_sum_ret,
      sa.total_trades,
      sa.avg_sharpe,
      sa.min_max_dd,
      -- Positive trades average (mean_ret > 0 olanların ortalaması)
      AVG(CASE WHEN sp.mean_ret > 0 THEN sp.mean_ret ELSE NULL END) as avg_pnl_positive,
      -- Negative trades average (mean_ret < 0 olanların ortalaması)
      AVG(CASE WHEN sp.mean_ret < 0 THEN sp.mean_ret ELSE NULL END) as avg_pnl_negative
    FROM symbol_aggregates sa
    JOIN symbol_params sp ON sa.run_id = sp.run_id AND sa.symbol = sp.symbol
    GROUP BY 
      sa.run_id, 
      sa.symbol, 
      sa.avg_winrate, 
      sa.avg_sum_ret, 
      sa.total_trades, 
      sa.avg_sharpe, 
      sa.min_max_dd
  )
  SELECT 
    tlc.run_id,
    tlc.symbol,
    tlc.avg_winrate as winrate,
    tlc.avg_sum_ret as pnl,
    tlc.total_trades::int as trades_count,
    tlc.avg_sharpe as sharpe,
    tlc.min_max_dd as max_dd,
    COALESCE(tlc.avg_pnl_positive, 0) as avg_pnl_positive,
    COALESCE(tlc.avg_pnl_negative, 0) as avg_pnl_negative
  FROM trade_level_calcs tlc
  ORDER BY tlc.run_id, tlc.symbol
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Test query
-- SELECT * FROM get_backtest_details_by_runs(
--   ARRAY['<run_id_here>'::uuid],
--   1000,  -- limit
--   0      -- offset
-- );
