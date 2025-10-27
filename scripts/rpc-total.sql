-- ============================================================================
-- FIXED RPC FUNCTIONS FOR STRATEGY OVERALLS
-- ============================================================================

-- 1A. LIGHTWEIGHT: Sadece run_id listesi ve created_at (ID-BASED PAGINATION)
CREATE OR REPLACE FUNCTION get_backtest_run_ids_light(
  p_limit int DEFAULT 20,
  p_last_created_at timestamptz DEFAULT NULL,
  p_last_run_id uuid DEFAULT NULL
)
RETURNS TABLE (
  run_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.run_id,
    MIN(br.created_at) as created_at
  FROM backtest_resultsv1 br
  WHERE (
    -- İlk sayfa: tüm kayıtlar
    p_last_created_at IS NULL
    OR
    -- Sonraki sayfalar: created_at'den büyük olanlar (ASC sıralama için - eskiden yeniye)
    br.created_at > p_last_created_at
    OR
    -- Aynı created_at'te run_id ile sırala
    (br.created_at = p_last_created_at AND br.run_id > p_last_run_id)
  )
  GROUP BY br.run_id
  ORDER BY MIN(br.created_at) ASC, br.run_id ASC
  LIMIT p_limit;
END;
$$;

-- 1B. DETAILED: Belirli bir run_id için özet bilgiler
CREATE OR REPLACE FUNCTION get_backtest_run_summary(p_run_id uuid)
RETURNS TABLE (
  run_id uuid,
  created_at timestamptz,
  total_symbols int,
  total_trades bigint,
  overall_winrate numeric,
  positive_pnl_count int,
  negative_pnl_count int,
  neutral_pnl_count int,
  -- All trades statistics
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
  WITH symbol_averages AS (
    -- Her run_id + symbol kombinasyonu için ortalama PNL hesapla
    SELECT 
      br.run_id,
      br.symbol,
      MIN(br.created_at) as created_at,
      AVG(br.sum_ret) as avg_pnl,
      AVG(br.winrate) as avg_winrate,
      SUM(br.trades) as total_symbol_trades
    FROM backtest_resultsv1 br
    WHERE br.run_id = p_run_id
    GROUP BY br.run_id, br.symbol
  )
  SELECT 
    sa.run_id,
    MIN(sa.created_at) as created_at,
    COUNT(DISTINCT sa.symbol)::int as total_symbols,
    SUM(sa.total_symbol_trades)::bigint as total_trades,
    ROUND(AVG(sa.avg_winrate)::numeric, 4) as overall_winrate,
    COUNT(DISTINCT CASE WHEN sa.avg_pnl > 0 THEN sa.symbol END)::int as positive_pnl_count,
    COUNT(DISTINCT CASE WHEN sa.avg_pnl < 0 THEN sa.symbol END)::int as negative_pnl_count,
    COUNT(DISTINCT CASE WHEN sa.avg_pnl = 0 THEN sa.symbol END)::int as neutral_pnl_count,
    -- All trades statistics
    ROUND(AVG(sa.avg_pnl)::numeric, 4) as avg_pnl_all,
    ROUND(MIN(sa.avg_pnl)::numeric, 4) as min_pnl_all,
    ROUND(MAX(sa.avg_pnl)::numeric, 4) as max_pnl_all,
    -- Positive trades statistics
    ROUND(AVG(CASE WHEN sa.avg_pnl > 0 THEN sa.avg_pnl END)::numeric, 4) as avg_pnl_positive,
    ROUND(MIN(CASE WHEN sa.avg_pnl > 0 THEN sa.avg_pnl END)::numeric, 4) as min_pnl_positive,
    ROUND(MAX(CASE WHEN sa.avg_pnl > 0 THEN sa.avg_pnl END)::numeric, 4) as max_pnl_positive,
    -- Negative trades statistics
    ROUND(AVG(CASE WHEN sa.avg_pnl < 0 THEN sa.avg_pnl END)::numeric, 4) as avg_pnl_negative,
    ROUND(MIN(CASE WHEN sa.avg_pnl < 0 THEN sa.avg_pnl END)::numeric, 4) as min_pnl_negative,
    ROUND(MAX(CASE WHEN sa.avg_pnl < 0 THEN sa.avg_pnl END)::numeric, 4) as max_pnl_negative
  FROM symbol_averages sa
  GROUP BY sa.run_id;
END;
$$;

-- 1C. V1 ENHANCED: Overall card with comprehensive metrics
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

-- 2. Belirli run_id'ler için detaylı symbol verilerini getiren RPC (SYMBOL-LEVEL STATS)
CREATE OR REPLACE FUNCTION get_backtest_details_by_runs(run_ids uuid[])
RETURNS TABLE (
  run_id uuid,
  symbol text,
  winrate numeric,
  pnl numeric,
  equity numeric,  -- ✅ Equity değeri
  trades_count int,
  sharpe numeric,
  max_dd numeric,
  return_per_trade numeric  -- ✅ İşlem Başı Getiri: (equity - 1) / trades
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
      br.equity,
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
      AVG(sp.equity) as avg_equity,
      SUM(sp.trades) as total_trades,
      AVG(sp.sharpe_like) as avg_sharpe,
      MIN(sp.max_dd) as min_max_dd
    FROM symbol_params sp
    GROUP BY sp.run_id, sp.symbol
  )
  SELECT 
    sa.run_id,
    sa.symbol,
    ROUND(sa.avg_winrate::numeric, 2) as winrate,
    ROUND(sa.avg_sum_ret::numeric, 4) as pnl,
    ROUND(sa.avg_equity::numeric, 4) as equity,  -- ✅ Equity değeri
    sa.total_trades::int as trades_count,
    ROUND(sa.avg_sharpe::numeric, 2) as sharpe,
    ROUND(sa.min_max_dd::numeric, 2) as max_dd,
    -- ✅ İşlem Başı Getiri: (equity - 1) / trades
    ROUND(((sa.avg_equity - 1) / NULLIF(sa.total_trades, 0))::numeric, 6) as return_per_trade
  FROM symbol_aggregates sa
  WHERE sa.avg_sum_ret IS NOT NULL
  ORDER BY sa.run_id, sa.avg_sum_ret DESC;
END;
$$;

-- ============================================================================
-- V1 RPC: get_backtest_run_summary_v2 (Trade-Weighted Stats)
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
      MAX(br.created_at) as latest_created_at,
      AVG(br.sum_ret) as symbol_avg_pnl,
      SUM(br.sum_ret) as symbol_total_pnl,
      AVG(br.winrate) as symbol_avg_winrate,
      SUM(br.trades) as symbol_total_trades
    FROM backtest_resultsv1 br
    WHERE br.run_id = p_run_id
    GROUP BY br.run_id, br.symbol
  )
  SELECT 
    sa.run_id,
    MAX(sa.latest_created_at)::timestamptz as created_at,
    COUNT(DISTINCT sa.symbol)::int as total_symbols,
    SUM(sa.symbol_total_trades)::bigint as total_trades,
    ROUND(
      (SUM(COALESCE(sa.symbol_avg_winrate, 0) * sa.symbol_total_trades) / NULLIF(SUM(sa.symbol_total_trades), 0))::numeric, 
      4
    ) as overall_winrate,
    COUNT(DISTINCT CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol END)::int as positive_pnl_count,
    COUNT(DISTINCT CASE WHEN sa.symbol_avg_pnl < 0 THEN sa.symbol END)::int as negative_pnl_count,
    COUNT(DISTINCT CASE WHEN sa.symbol_avg_pnl = 0 THEN sa.symbol END)::int as neutral_pnl_count,
    -- avg_pnl_all = SUM(sum_ret) / SUM(trades)
    ROUND(
      (SUM(sa.symbol_total_pnl) / NULLIF(SUM(sa.symbol_total_trades), 0))::numeric,
      4
    ) as avg_pnl_all,
    ROUND(MIN(sa.symbol_avg_pnl)::numeric, 4) as min_pnl_all,
    ROUND(MAX(sa.symbol_avg_pnl)::numeric, 4) as max_pnl_all,
    ROUND(
      (SUM(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_avg_pnl * sa.symbol_total_trades END) / 
       NULLIF(SUM(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_total_trades END), 0))::numeric,
      4
    ) as avg_pnl_positive,
    ROUND(MIN(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_avg_pnl END)::numeric, 4) as min_pnl_positive,
    ROUND(MAX(CASE WHEN sa.symbol_avg_pnl > 0 THEN sa.symbol_avg_pnl END)::numeric, 4) as max_pnl_positive,
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
