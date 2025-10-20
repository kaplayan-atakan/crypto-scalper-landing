-- ============================================================================
-- FIXED RPC FUNCTIONS FOR STRATEGY OVERALLS
-- ============================================================================

-- 1. Tüm run_id'leri ve özet bilgilerini getiren RPC (FIXED)
CREATE OR REPLACE FUNCTION get_backtest_run_ids()
RETURNS TABLE (
  run_id uuid,
  created_at timestamptz,
  total_symbols int,
  positive_pnl_count int,
  negative_pnl_count int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH symbol_averages AS (
    -- Önce her run_id + symbol kombinasyonu için ortalama PNL hesapla
    SELECT 
      br.run_id,
      br.symbol,
      MIN(br.created_at) as created_at,
      AVG(br.sum_ret) as avg_pnl
    FROM backtest_resultsv1 br
    GROUP BY br.run_id, br.symbol
  )
  SELECT 
    sa.run_id,
    MIN(sa.created_at) as created_at,
    COUNT(DISTINCT sa.symbol)::int as total_symbols,
    COUNT(DISTINCT CASE WHEN sa.avg_pnl > 0 THEN sa.symbol END)::int as positive_pnl_count,
    COUNT(DISTINCT CASE WHEN sa.avg_pnl <= 0 THEN sa.symbol END)::int as negative_pnl_count
  FROM symbol_averages sa
  GROUP BY sa.run_id
  ORDER BY MIN(sa.created_at) ASC;
END;
$$;

-- 2. Belirli run_id'ler için detaylı symbol verilerini getiren RPC (FIXED + ENHANCED)
CREATE OR REPLACE FUNCTION get_backtest_details_by_runs(run_ids uuid[])
RETURNS TABLE (
  run_id uuid,
  symbol text,
  winrate numeric,
  pnl numeric,
  trades_count int,
  sharpe numeric,
  max_dd numeric,
  avg_pnl_all numeric,
  avg_pnl_positive numeric,
  avg_pnl_negative numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.run_id,
    br.symbol,
    ROUND(AVG(br.winrate)::numeric, 2) as winrate,
    ROUND(AVG(br.sum_ret)::numeric, 4) as pnl,
    SUM(br.trades)::int as trades_count,
    ROUND(AVG(br.sharpe_like)::numeric, 2) as sharpe,
    ROUND(MIN(br.max_dd)::numeric, 2) as max_dd,
    -- All trades average PNL
    ROUND(AVG(br.sum_ret)::numeric, 4) as avg_pnl_all,
    -- Positive trades average PNL
    ROUND(AVG(CASE WHEN br.sum_ret > 0 THEN br.sum_ret END)::numeric, 4) as avg_pnl_positive,
    -- Negative trades average PNL
    ROUND(AVG(CASE WHEN br.sum_ret <= 0 THEN br.sum_ret END)::numeric, 4) as avg_pnl_negative
  FROM backtest_resultsv1 br
  WHERE br.run_id = ANY(run_ids)
  GROUP BY br.run_id, br.symbol
  HAVING AVG(br.sum_ret) IS NOT NULL
  ORDER BY br.run_id, AVG(br.sum_ret) DESC;
END;
$$;

-- ============================================================================
-- KULLANIM ÖRNEKLERİ
-- ============================================================================

-- Test 1: Tüm run_id'leri getir
-- SELECT * FROM get_backtest_run_ids();

-- Test 2: Belirli run_id için detayları getir
-- SELECT * FROM get_backtest_details_by_runs(ARRAY['<run_id_here>'::uuid]);

-- Test 3: Birden fazla run_id için detayları getir
-- SELECT * FROM get_backtest_details_by_runs(ARRAY[
--   '<run_id_1>'::uuid,
--   '<run_id_2>'::uuid
-- ]);
