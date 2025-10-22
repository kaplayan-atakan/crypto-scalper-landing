-- ============================================================================
-- TOP 40 COINS OVERALL STATISTICS RPC FUNCTION
-- ============================================================================
-- Her run için en başarılı 40 coin'in overall istatistiklerini hesaplar

CREATE OR REPLACE FUNCTION get_top40_overall_by_runs(run_ids uuid[])
RETURNS TABLE (
  run_id uuid,
  top40_total_trades bigint,
  top40_overall_winrate numeric,
  top40_avg_pnl numeric,
  top40_min_pnl numeric,
  top40_max_pnl numeric,
  top40_avg_pnl_positive numeric,
  top40_avg_pnl_negative numeric,
  top40_positive_count int,
  top40_negative_count int,
  top40_neutral_count int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH symbol_aggregates AS (
    -- Her symbol için aggregated değerler
    SELECT 
      br.run_id,
      br.symbol,
      AVG(br.winrate) as avg_winrate,
      AVG(br.sum_ret) as avg_pnl,
      SUM(br.trades) as total_trades
    FROM backtest_resultsv1 br
    WHERE br.run_id = ANY(run_ids)
    GROUP BY br.run_id, br.symbol
  ),
  ranked_symbols AS (
    -- Her run için symbol'leri PNL'e göre sırala ve rank ver
    SELECT 
      sa.*,
      ROW_NUMBER() OVER (PARTITION BY sa.run_id ORDER BY sa.avg_pnl DESC) as pnl_rank
    FROM symbol_aggregates sa
  ),
  top40_symbols AS (
    -- Her run için en iyi 40 symbol'ü al
    SELECT *
    FROM ranked_symbols
    WHERE pnl_rank <= 40
  ),
  top40_stats AS (
    -- Top 40 için overall istatistikler
    SELECT 
      t40.run_id,
      SUM(t40.total_trades) as total_trades,
      AVG(t40.avg_winrate) as overall_winrate,
      AVG(t40.avg_pnl) as avg_pnl,
      MIN(t40.avg_pnl) as min_pnl,
      MAX(t40.avg_pnl) as max_pnl,
      AVG(CASE WHEN t40.avg_pnl > 0 THEN t40.avg_pnl END) as avg_pnl_positive,
      AVG(CASE WHEN t40.avg_pnl < 0 THEN t40.avg_pnl END) as avg_pnl_negative,
      COUNT(CASE WHEN t40.avg_pnl > 0 THEN 1 END)::int as positive_count,
      COUNT(CASE WHEN t40.avg_pnl < 0 THEN 1 END)::int as negative_count,
      COUNT(CASE WHEN t40.avg_pnl = 0 THEN 1 END)::int as neutral_count
    FROM top40_symbols t40
    GROUP BY t40.run_id
  )
  SELECT 
    ts.run_id,
    ts.total_trades::bigint,  -- Explicit cast to bigint
    ROUND(ts.overall_winrate::numeric, 4) as top40_overall_winrate,
    ROUND(ts.avg_pnl::numeric, 4) as top40_avg_pnl,
    ROUND(ts.min_pnl::numeric, 4) as top40_min_pnl,
    ROUND(ts.max_pnl::numeric, 4) as top40_max_pnl,
    ROUND(ts.avg_pnl_positive::numeric, 4) as top40_avg_pnl_positive,
    ROUND(ts.avg_pnl_negative::numeric, 4) as top40_avg_pnl_negative,
    ts.positive_count,
    ts.negative_count,
    ts.neutral_count
  FROM top40_stats ts
  ORDER BY ts.run_id;
END;
$$;

-- ============================================================================
-- KULLANIM ÖRNEĞİ
-- ============================================================================

-- Test: Belirli run_id'ler için top 40 overall istatistikleri
-- SELECT * FROM get_top40_overall_by_runs(ARRAY[
--   '<run_id_1>'::uuid,
--   '<run_id_2>'::uuid
-- ]);
