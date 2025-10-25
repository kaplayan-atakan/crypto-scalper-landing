-- ============================================================================
-- V2 OVERALL METRICS: Enhanced run-level statistics
-- ============================================================================
-- İki ayrı sorgudan gelen verileri birleştiren RPC fonksiyonları

-- 1. Run-level equity ve backoff metrics
CREATE OR REPLACE FUNCTION get_backtest_equity_metrics(p_run_id uuid)
RETURNS TABLE (
  avg_equity numeric,
  avg_net_return numeric,
  backoff_rate numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(br.equity)::numeric, 4) AS avg_equity,
    ROUND((AVG(br.equity) - 1)::numeric, 4) AS avg_net_return,
    ROUND(AVG(br.max_dd)::numeric, 4) AS backoff_rate
  FROM backtest_resultsv1 br
  WHERE br.run_id = p_run_id;
END;
$$;

-- 2. Run-level trade statistics (enhanced)
CREATE OR REPLACE FUNCTION get_backtest_trade_metrics(p_run_id uuid)
RETURNS TABLE (
  run_id uuid,
  n_symbols int,
  total_trades bigint,
  total_sum_ret numeric,
  pnl_per_trade numeric,
  max_count int,
  winrate_trade_weighted numeric,
  winrate_simple_avg numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    br.run_id,
    COUNT(DISTINCT br.symbol)::int AS n_symbols,
    SUM(br.trades)::bigint AS total_trades,
    ROUND(SUM(br.sum_ret)::numeric, 4) AS total_sum_ret,
    ROUND((SUM(br.sum_ret) / NULLIF(SUM(br.trades), 0))::numeric, 4) AS pnl_per_trade,
    MIN(br.max_count)::int AS max_count,  -- tek değer ise MIN/MAX fark etmez
    -- Trade-ağırlıklı winrate (0-1 arası)
    ROUND(
      (SUM(COALESCE(br.winrate, 0) * br.trades) / NULLIF(SUM(br.trades), 0))::numeric,
      4
    ) AS winrate_trade_weighted,
    -- Satırların basit ortalaması (0-1 arası)
    ROUND(AVG(br.winrate)::numeric, 4) AS winrate_simple_avg
  FROM backtest_resultsv1 br
  WHERE br.run_id = p_run_id
  GROUP BY br.run_id
  HAVING SUM(br.trades) > 0;
END;
$$;

-- 3. Combined metrics (tek çağrıda her şey)
CREATE OR REPLACE FUNCTION get_backtest_overall_metrics_v2(p_run_id uuid)
RETURNS TABLE (
  run_id uuid,
  -- Equity metrics
  avg_equity numeric,
  avg_net_return numeric,
  backoff_rate numeric,
  -- Trade metrics
  n_symbols int,
  total_trades bigint,
  total_sum_ret numeric,
  pnl_per_trade numeric,
  max_count int,
  winrate_trade_weighted numeric,
  winrate_simple_avg numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH equity_metrics AS (
    SELECT
      AVG(br.equity) AS avg_equity,
      AVG(br.equity) - 1 AS avg_net_return,
      AVG(br.max_dd) AS backoff_rate
    FROM backtest_resultsv1 br
    WHERE br.run_id = p_run_id
  ),
  trade_metrics AS (
    SELECT
      br.run_id,
      COUNT(DISTINCT br.symbol) AS n_symbols,
      SUM(br.trades) AS total_trades,
      SUM(br.sum_ret) AS total_sum_ret,
      SUM(br.sum_ret) / NULLIF(SUM(br.trades), 0) AS pnl_per_trade,
      MIN(br.max_count) AS max_count,
      SUM(COALESCE(br.winrate, 0) * br.trades) / NULLIF(SUM(br.trades), 0) AS winrate_trade_weighted,
      AVG(br.winrate) AS winrate_simple_avg
    FROM backtest_resultsv1 br
    WHERE br.run_id = p_run_id
    GROUP BY br.run_id
    HAVING SUM(br.trades) > 0
  )
  SELECT
    tm.run_id,
    -- Equity metrics
    ROUND(em.avg_equity::numeric, 4) AS avg_equity,
    ROUND(em.avg_net_return::numeric, 4) AS avg_net_return,
    ROUND(em.backoff_rate::numeric, 4) AS backoff_rate,
    -- Trade metrics
    tm.n_symbols::int AS n_symbols,
    tm.total_trades::bigint AS total_trades,
    ROUND(tm.total_sum_ret::numeric, 4) AS total_sum_ret,
    ROUND(tm.pnl_per_trade::numeric, 4) AS pnl_per_trade,
    tm.max_count::int AS max_count,
    ROUND(tm.winrate_trade_weighted::numeric, 4) AS winrate_trade_weighted,
    ROUND(tm.winrate_simple_avg::numeric, 4) AS winrate_simple_avg
  FROM trade_metrics tm
  CROSS JOIN equity_metrics em;
END;
$$;

-- ============================================================================
-- KULLANIM ÖRNEĞİ
-- ============================================================================
-- SELECT * FROM get_backtest_overall_metrics_v2('7617f50f-5899-4422-8e08-1b90c77c50aa'::uuid);

-- ============================================================================
-- AÇIKLAMALAR
-- ============================================================================
-- avg_equity:               Ortalama equity (başlangıç sermayesi + kazanç)
-- avg_net_return:           Net getiri (equity - 1)
-- backoff_rate:             Ortalama maximum drawdown (risk göstergesi)
-- n_symbols:                Test edilen coin sayısı
-- total_trades:             Toplam trade sayısı
-- total_sum_ret:            Toplam PNL
-- pnl_per_trade:            Trade başına ortalama PNL
-- max_count:                Maksimum pozisyon sayısı
-- winrate_trade_weighted:   Trade-ağırlıklı kazanma oranı (0-1)
-- winrate_simple_avg:       Basit ortalama kazanma oranı (0-1)
