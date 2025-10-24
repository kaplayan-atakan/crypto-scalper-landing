-- ============================================================================
-- V2: DIRECT AGGREGATE APPROACH (Trade-Weighted Stats)
-- ============================================================================
-- Örnek sorgudaki mantığı kullanarak trade-weighted istatistikler hesaplar
-- Avantaj: Daha doğru, daha hızlı (tek seviye aggregate)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_backtest_run_summary_v2(p_run_id uuid)
RETURNS TABLE (
  run_id uuid,
  created_at timestamptz,
  total_symbols int,
  total_trades bigint,
  overall_winrate numeric,
  positive_pnl_count int,
  negative_pnl_count int,
  neutral_pnl_count int,
  -- All trades statistics (trade-weighted)
  avg_pnl_all numeric,
  min_pnl_all numeric,
  max_pnl_all numeric,
  -- Positive trades statistics
  avg_pnl_positive numeric,
  min_pnl_positive numeric,
  max_pnl_positive numeric,
  -- Negative trades statistics
  avg_pnl_negative numeric,
  min_pnl_negative numeric,
  max_pnl_negative numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH symbol_aggregates AS (
    -- Her symbol için tek bir değer (avg of all parameter sets)
    SELECT 
      br.run_id,
      br.symbol,
      MAX(br.created_at) as latest_created_at,  -- ✅ En yeni test (eskiden MIN idi)
      AVG(br.sum_ret) as symbol_avg_pnl,
      SUM(br.sum_ret) as symbol_total_pnl,  -- ✅ Toplam PNL (örnek sorgu: SUM(sum_ret))
      AVG(br.winrate) as symbol_avg_winrate,
      SUM(br.trades) as symbol_total_trades
    FROM backtest_resultsv1 br
    WHERE br.run_id = p_run_id
    GROUP BY br.run_id, br.symbol
  )
  SELECT 
    sa.run_id,
    MAX(sa.latest_created_at)::timestamptz as created_at,  -- ✅ En yeni test (eskiden MIN idi)
    
    -- Symbol count
    COUNT(DISTINCT sa.symbol)::int as total_symbols,
    
    -- ✅ Trade-weighted total trades
    SUM(sa.symbol_total_trades)::bigint as total_trades,
    
    -- ✅ Trade-weighted winrate (örnek sorgudaki mantık)
    ROUND(
      (SUM(COALESCE(sa.symbol_avg_winrate, 0) * sa.symbol_total_trades) / NULLIF(SUM(sa.symbol_total_trades), 0))::numeric, 
      4
    ) as overall_winrate,
    
    -- Symbol-level positive/negative/neutral counts
    COUNT(DISTINCT CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol END)::int as positive_pnl_count,
    COUNT(DISTINCT CASE WHEN sa.symbol_avg_pnl < 0 THEN sa.symbol END)::int as negative_pnl_count,
    COUNT(DISTINCT CASE WHEN sa.symbol_avg_pnl = 0 THEN sa.symbol END)::int as neutral_pnl_count,
    
    -- ✅ All trades statistics - PNL per trade (örnek sorgudaki pnl_per_trade mantığı)
    -- avg_pnl_all = SUM(sum_ret) / SUM(trades)
    ROUND(
      (SUM(sa.symbol_total_pnl) / NULLIF(SUM(sa.symbol_total_trades), 0))::numeric,
      4
    ) as avg_pnl_all,
    ROUND(MIN(sa.symbol_avg_pnl)::numeric, 4) as min_pnl_all,
    ROUND(MAX(sa.symbol_avg_pnl)::numeric, 4) as max_pnl_all,
    
    -- ✅ Positive trades statistics (trade-weighted)
    ROUND(
      (SUM(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_avg_pnl * sa.symbol_total_trades END) / 
       NULLIF(SUM(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_total_trades END), 0))::numeric,
      4
    ) as avg_pnl_positive,
    ROUND(MIN(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_avg_pnl END)::numeric, 4) as min_pnl_positive,
    ROUND(MAX(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_avg_pnl END)::numeric, 4) as max_pnl_positive,
    
    -- ✅ Negative trades statistics (trade-weighted)
    ROUND(
      (SUM(CASE WHEN sa.symbol_avg_pnl < 0 THEN sa.symbol_avg_pnl * sa.symbol_total_trades END) / 
       NULLIF(SUM(CASE WHEN sa.symbol_avg_pnl < 0 THEN sa.symbol_total_trades END), 0))::numeric,
      4
    ) as avg_pnl_negative,
    ROUND(MIN(CASE WHEN sa.symbol_avg_pnl < 0 THEN sa.symbol_avg_pnl END)::numeric, 4) as min_pnl_negative,
    ROUND(MAX(CASE WHEN sa.symbol_avg_pnl < 0 THEN sa.symbol_avg_pnl END)::numeric, 4) as max_pnl_negative
    
  FROM symbol_aggregates sa
  GROUP BY sa.run_id;
END;
$$;

-- ============================================================================
-- KULLANIM ÖRNEĞİ
-- ============================================================================
-- SELECT * FROM get_backtest_run_summary_v2('<run_id_here>'::uuid);

-- ============================================================================
-- V1 vs V2 KARŞILAŞTIRMA
-- ============================================================================
-- V1 (Eski): Symbol-level AVG → Run-level AVG (eşit ağırlık)
-- V2 (Yeni): Symbol-level AVG → Trade-weighted Run-level AVG (trade sayısıyla ağırlıklandırma)
--
-- Örnek:
-- Symbol A: 100 trade, 0.60 winrate, 10% PNL
-- Symbol B: 10 trade, 0.40 winrate, -5% PNL
--
-- V1 Overall Winrate: (0.60 + 0.40) / 2 = 0.50 (50%) ❌ Yanlış
-- V2 Overall Winrate: (0.60 * 100 + 0.40 * 10) / 110 = 0.58 (58%) ✅ Doğru
--
-- V1 Avg PNL: (10% + (-5%)) / 2 = 2.5% ❌ Yanlış
-- V2 Avg PNL: (10% * 100 + (-5%) * 10) / 110 = 8.6% ✅ Doğru
-- ============================================================================
