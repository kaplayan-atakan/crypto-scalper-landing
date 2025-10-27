-- ============================================================================
-- V1 ENHANCED: Overall card with comprehensive metrics
-- ============================================================================
-- V1 overall kartı için geliştirilmiş istatistikler
-- Equity-based coin counts, backoff rate, position limits
-- ============================================================================

CREATE OR REPLACE FUNCTION get_backtest_run_summary_v1_enhanced(p_run_id uuid)
RETURNS TABLE (
  run_id uuid,
  last_created_at timestamptz,
  total_trades bigint,
  avg_equity numeric,
  avg_net_return numeric,
  backoff_rate numeric,
  avg_winrate_pct numeric,
  coins_total bigint,
  coins_pos bigint,
  coins_neg bigint,
  coins_flat bigint,
  max_count int,
  min_count int,
  pos_pct numeric,
  neg_pct numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH per_symbol AS (
    SELECT
      br.run_id,
      br.symbol,
      AVG(br.equity)     AS equity_sym_avg,
      MAX(br.created_at) AS last_created_at
    FROM backtest_resultsv1 br
    WHERE br.run_id = p_run_id
    GROUP BY br.run_id, br.symbol
  ),
  counts AS (
    SELECT
      ps.run_id,
      MAX(ps.last_created_at) AS last_created_at,
      COUNT(*) AS coins_total,
      SUM(CASE WHEN ps.equity_sym_avg > 1.001 THEN 1 ELSE 0 END) AS coins_pos,
      SUM(CASE WHEN ps.equity_sym_avg < 0.999 THEN 1 ELSE 0 END) AS coins_neg,
      SUM(CASE WHEN ps.equity_sym_avg BETWEEN 0.999 AND 1.001 THEN 1 ELSE 0 END) AS coins_flat
    FROM per_symbol ps
    GROUP BY ps.run_id
  ),
  metrics AS (
    SELECT
      br.run_id,
      SUM(br.trades)            AS total_trades,
      AVG(br.equity)            AS avg_equity,
      AVG(br.equity) - 1        AS avg_net_return,
      AVG(br.max_dd) * 100.0    AS backoff_rate,
      AVG(br.winrate) * 100.0   AS avg_winrate_pct,
      MAX(br.created_at)        AS last_created_at,
      MAX(br.max_count)         AS max_count,
      MAX(br.min_count)         AS min_count
    FROM backtest_resultsv1 br
    WHERE br.run_id = p_run_id
    GROUP BY br.run_id
  )
  SELECT
    m.run_id,
    COALESCE(m.last_created_at, c.last_created_at)::timestamptz AS last_created_at,
    m.total_trades::bigint,
    ROUND(m.avg_equity::numeric, 4) AS avg_equity,
    ROUND(m.avg_net_return::numeric, 4) AS avg_net_return,
    ROUND(m.backoff_rate::numeric, 2) AS backoff_rate,
    ROUND(m.avg_winrate_pct::numeric, 2) AS avg_winrate_pct,
    c.coins_total::bigint,
    c.coins_pos::bigint,
    c.coins_neg::bigint,
    c.coins_flat::bigint,
    m.max_count::int,
    m.min_count::int,
    ROUND(100.0 * c.coins_pos / NULLIF(c.coins_total, 0), 2) AS pos_pct,
    ROUND(100.0 * c.coins_neg / NULLIF(c.coins_total, 0), 2) AS neg_pct
  FROM metrics m
  LEFT JOIN counts c USING (run_id);
END;
$$;

-- ============================================================================
-- KULLANIM ÖRNEĞİ
-- ============================================================================
-- SELECT * FROM get_backtest_run_summary_v1_enhanced('7617f50f-5899-4422-8e08-1b90c77c50aa'::uuid);

-- ============================================================================
-- AÇIKLAMALAR
-- ============================================================================
-- last_created_at:      En son test tarihi
-- total_trades:         Toplam trade sayısı
-- avg_equity:           Ortalama equity (sermaye + kazanç)
-- avg_net_return:       Net getiri (equity - 1)
-- backoff_rate:         Backoff oranı (avg max_dd * 100)
-- avg_winrate_pct:      Ortalama kazanma oranı (%)
-- coins_total:          Toplam test edilen coin sayısı
-- coins_pos:            Pozitif coin sayısı (equity > 1.001)
-- coins_neg:            Negatif coin sayısı (equity < 0.999)
-- coins_flat:           Flat coin sayısı (0.999 <= equity <= 1.001)
-- max_count:            Maksimum pozisyon sayısı
-- min_count:            Minimum pozisyon sayısı
-- pos_pct:              Pozitif coin yüzdesi
-- neg_pct:              Negatif coin yüzdesi
