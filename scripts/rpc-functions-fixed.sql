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
    -- Sonraki sayfalar: created_at'den küçük olanlar (DESC sıralama için)
    br.created_at < p_last_created_at
    OR
    -- Aynı created_at'te run_id ile sırala
    (br.created_at = p_last_created_at AND br.run_id < p_last_run_id)
  )
  GROUP BY br.run_id
  ORDER BY MIN(br.created_at) DESC, br.run_id DESC
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

-- 2. Belirli run_id'ler için detaylı symbol verilerini getiren RPC (SYMBOL-LEVEL STATS)
CREATE OR REPLACE FUNCTION get_backtest_details_by_runs(run_ids uuid[])
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
    -- Trade-level istatistikleri hesapla
    SELECT 
      sa.run_id,
      sa.symbol,
      sa.avg_winrate,
      sa.avg_sum_ret,
      sa.total_trades,
      sa.avg_sharpe,
      sa.min_max_dd,
      sa.avg_mean_ret,
      -- Kazanan trade sayısı
      ROUND(sa.total_trades * sa.avg_winrate) as win_count,
      -- Kaybeden trade sayısı
      sa.total_trades - ROUND(sa.total_trades * sa.avg_winrate) as loss_count,
      -- Matematiksel hesaplama:
      -- sum_ret = win_count * avg_win + loss_count * avg_loss
      -- mean_ret = sum_ret / total_trades
      -- avg_win ve avg_loss'u hesaplamak için:
      -- Varsayım: avg_win ≈ mean_ret * (1 / winrate) (kazanan trade'ler daha büyük)
      -- avg_loss ≈ mean_ret * (1 / (1 - winrate)) (kaybeden trade'ler daha küçük)
      CASE 
        WHEN sa.avg_winrate > 0 AND sa.avg_winrate < 1 THEN
          -- Kazanan trade ortalaması (pozitif tarafın contribution'ı)
          CASE 
            WHEN sa.avg_mean_ret > 0 THEN
              sa.avg_mean_ret / sa.avg_winrate
            ELSE
              -- Negatif mean_ret için farklı hesaplama
              sa.avg_mean_ret * (1 - sa.avg_winrate) / sa.avg_winrate
          END
        ELSE NULL
      END as calculated_avg_win,
      CASE 
        WHEN sa.avg_winrate > 0 AND sa.avg_winrate < 1 THEN
          -- Kaybeden trade ortalaması (negatif tarafın contribution'ı)
          CASE 
            WHEN sa.avg_mean_ret < 0 THEN
              sa.avg_mean_ret / (1 - sa.avg_winrate)
            ELSE
              -- Pozitif mean_ret için farklı hesaplama
              -1 * sa.avg_mean_ret * sa.avg_winrate / (1 - sa.avg_winrate)
          END
        ELSE NULL
      END as calculated_avg_loss
    FROM symbol_aggregates sa
  )
  SELECT 
    tlc.run_id,
    tlc.symbol,
    ROUND(tlc.avg_winrate::numeric, 2) as winrate,
    ROUND(tlc.avg_sum_ret::numeric, 4) as pnl,
    tlc.total_trades::int as trades_count,
    ROUND(tlc.avg_sharpe::numeric, 2) as sharpe,
    ROUND(tlc.min_max_dd::numeric, 2) as max_dd,
    -- Hesaplanan kazanan trade ortalaması
    ROUND(tlc.calculated_avg_win::numeric, 4) as avg_pnl_positive,
    -- Hesaplanan kaybeden trade ortalaması  
    ROUND(tlc.calculated_avg_loss::numeric, 4) as avg_pnl_negative
  FROM trade_level_calcs tlc
  WHERE tlc.avg_sum_ret IS NOT NULL
  ORDER BY tlc.run_id, tlc.avg_sum_ret DESC;
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
