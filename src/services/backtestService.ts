import { supabase } from '../lib/supabase'
import type { BacktestResult, RunOverview, RunColumn, SymbolMetrics } from '../types/supabase'

// ============================================================================
// CACHE MANAGEMENT (v2.0 - Timestamp-Based Incremental Loading)
// ============================================================================

const CACHE_KEY = 'backtest_strategy_overalls_v2'
const CACHE_VERSION = 'v2'

interface CacheData {
  version: string
  last_created_at: string | null  // IMPORTANT: Track last fetched timestamp
  run_columns: RunColumn[]
  cached_at: string
}

/**
 * Load cached data from localStorage
 */
function loadCache(): CacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      console.log('💾 No cache found')
      return null
    }
    
    const data: CacheData = JSON.parse(cached)
    
    // Version check
    if (data.version !== CACHE_VERSION) {
      console.log('🔄 Cache version mismatch, clearing...')
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    // Age check: max 30 days
    const age = Date.now() - new Date(data.cached_at).getTime()
    const maxAge = 30 * 24 * 60 * 60 * 1000
    
    if (age > maxAge) {
      console.log('⏰ Cache expired (> 30 days), clearing...')
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    console.log(`💾 Cache loaded:`, {
      runs: data.run_columns.length,
      last_created_at: data.last_created_at,
      age_hours: (age / (1000 * 60 * 60)).toFixed(1)
    })
    
    return data
  } catch (err) {
    console.error('❌ Error loading cache:', err)
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

/**
 * Save cache to localStorage
 */
function saveCache(lastCreatedAt: string | null, runColumns: RunColumn[]) {
  try {
    const data: CacheData = {
      version: CACHE_VERSION,
      last_created_at: lastCreatedAt,
      run_columns: runColumns,
      cached_at: new Date().toISOString()
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    
    const sizeKB = (new Blob([JSON.stringify(data)]).size / 1024).toFixed(2)
    console.log(`💾 Cache saved:`, {
      runs: runColumns.length,
      last_created_at: lastCreatedAt,
      size_kb: sizeKB
    })
  } catch (err) {
    console.error('❌ Error saving cache:', err)
  }
}

// ============================================================================
// FETCH RAW DATA WITH PAGINATION (Timestamp-Based Incremental)
// ============================================================================

/**
 * Fetch raw backtest data with pagination
 * - If afterTimestamp is provided: fetch only rows WHERE created_at > afterTimestamp
 * - Always orders by created_at ASC (oldest → newest)
 * - Fetches in batches of 1000 (Supabase hard limit)
 */
async function fetchRawData(afterTimestamp: string | null = null): Promise<BacktestResult[]> {
  console.log(`📥 Fetching raw data${afterTimestamp ? ` (after: ${afterTimestamp})` : ' (all data)'}...`)
  
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }
  
  let allRows: BacktestResult[] = []
  let offset = 0
  const limit = 1000
  let page = 1
  
  while (true) {
    console.log(`   [Page ${page}] Fetching ${limit} rows (offset: ${offset})...`)
    
    let query = supabase
      .from('backtest_resultsv1')
      .select('run_id, created_at, symbol, winrate, sum_ret')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)
    
    // Incremental loading: filter by timestamp
    if (afterTimestamp) {
      query = query.gt('created_at', afterTimestamp)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error(`❌ Error fetching page ${page}:`, error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log(`   ✅ No more data. Stopping.`)
      break
    }
    
    allRows = allRows.concat(data as any[])
    console.log(`   ✅ Fetched ${data.length} rows (total: ${allRows.length})`)
    
    // If less than limit, we've reached the end
    if (data.length < limit) {
      console.log(`   ✅ Reached end of data (last page had ${data.length} rows)`)
      break
    }
    
    offset += limit
    page++
  }
  
  console.log(`✅ Total rows fetched: ${allRows.length}`)
  return allRows
}

// ============================================================================
// AGGREGATE DATA BY RUN_ID → SYMBOL
// ============================================================================

/**
 * Aggregate raw data by run_id and symbol
 * Returns RunColumn[] with aggregated metrics
 */
function aggregateData(rawData: BacktestResult[]): RunColumn[] {
  console.log(`📊 Aggregating ${rawData.length} rows by run_id → symbol...`)
  
  // Group by run_id first
  const runGroups = new Map<string, BacktestResult[]>()
  
  rawData.forEach(row => {
    const existing = runGroups.get(row.run_id) || []
    existing.push(row)
    runGroups.set(row.run_id, existing)
  })
  
  console.log(`   ✅ Found ${runGroups.size} unique run_ids`)
  
  // Process each run_id
  const runColumns: RunColumn[] = []
  
  for (const [runId, rows] of runGroups.entries()) {
    // Find max created_at for this run
    const maxCreatedAt = rows.reduce((max, row) => 
      row.created_at > max ? row.created_at : max, rows[0].created_at
    )
    
    // Group by symbol
    const symbolGroups = new Map<string, BacktestResult[]>()
    
    rows.forEach(row => {
      const existing = symbolGroups.get(row.symbol) || []
      existing.push(row)
      symbolGroups.set(row.symbol, existing)
    })
    
    // Calculate symbol metrics
    const symbols: SymbolMetrics[] = []
    
    for (const [symbol, trades] of symbolGroups.entries()) {
      const avgWinrate = trades.reduce((sum, t) => sum + (t.winrate || 0), 0) / trades.length
      const avgPnl = trades.reduce((sum, t) => sum + (t.sum_ret || 0), 0) / trades.length
      
      symbols.push({
        symbol,
        winrate: avgWinrate,
        pnl: avgPnl
      })
    }
    
    // Sort symbols by PNL descending
    symbols.sort((a, b) => b.pnl - a.pnl)
    
    // Calculate positive/negative counts
    const positiveCount = rows.filter(r => (r.sum_ret || 0) > 0).length
    const negativeCount = rows.filter(r => (r.sum_ret || 0) <= 0).length
    
    runColumns.push({
      run_id: runId,
      created_at: maxCreatedAt,
      positive_count: positiveCount,
      negative_count: negativeCount,
      symbols
    })
    
    console.log(`   ✅ Run ${runId.slice(0, 8)}... → ${symbols.length} symbols (PNL: ${symbols[0]?.pnl.toFixed(4)})`)
  }
  
  return runColumns
}

// ============================================================================
// MERGE CACHED + NEW DATA
// ============================================================================

/**
 * Merge cached run columns with new run columns
 * - If run_id exists in both: use new data (overwrite)
 * - Otherwise: keep both
 */
function mergeRunColumns(cached: RunColumn[], newData: RunColumn[]): RunColumn[] {
  const merged = new Map<string, RunColumn>()
  
  // Add cached data first
  cached.forEach(run => merged.set(run.run_id, run))
  
  // Overwrite with new data
  newData.forEach(run => {
    if (merged.has(run.run_id)) {
      console.log(`   🔄 Updated run: ${run.run_id.slice(0, 8)}...`)
    } else {
      console.log(`   ➕ New run: ${run.run_id.slice(0, 8)}...`)
    }
    merged.set(run.run_id, run)
  })
  
  return Array.from(merged.values())
}

// ============================================================================
// MAIN EXPORT: FETCH ALL RUN COLUMNS WITH CACHE
// ============================================================================

/**
 * Fetch all run columns with smart caching
 * 
 * Strategy:
 * 1. Load cache (if exists)
 * 2. Fetch NEW data only (WHERE created_at > last_cached_timestamp)
 * 3. Aggregate new data
 * 4. Merge with cached data
 * 5. Save updated cache
 * 6. Return combined data
 * 
 * Performance:
 * - First load: ~5-10 minutes (fetch all 422K rows)
 * - Subsequent loads: < 1 second (if no new data)
 * - With new data: only fetches new rows (incremental)
 */
export async function fetchAllRunColumns(): Promise<RunColumn[]> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 STRATEGY OVERALLS: Incremental Loading v2.0')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    // STEP 1: Load cache
    console.log('\n🔍 Step 1: Loading cache...')
    const cache = loadCache()
    
    // STEP 2: Fetch new data (timestamp-based incremental)
    console.log('\n🔍 Step 2: Fetching new data...')
    const afterTimestamp = cache?.last_created_at || null
    
    if (afterTimestamp) {
      console.log(`📌 Using incremental loading (after: ${afterTimestamp})`)
    } else {
      console.log(`📌 No cache found. Fetching all data...`)
    }
    
    const newRawData = await fetchRawData(afterTimestamp)
    
    if (newRawData.length === 0) {
      console.log('\n✅ No new data to process. Cache is up-to-date!')
      return cache?.run_columns || []
    }
    
    // STEP 3: Aggregate new data
    console.log('\n🔍 Step 3: Aggregating new data...')
    const newRunColumns = aggregateData(newRawData)
    
    // STEP 4: Merge with cache
    console.log('\n🔍 Step 4: Merging cached + new data...')
    const finalRunColumns = cache 
      ? mergeRunColumns(cache.run_columns, newRunColumns)
      : newRunColumns
    
    console.log(`   ✅ Total runs after merge: ${finalRunColumns.length}`)
    
    // STEP 5: Find latest timestamp
    const lastCreatedAt = newRawData.reduce((max, row) => 
      row.created_at > max ? row.created_at : max, newRawData[0].created_at
    )
    
    // STEP 6: Save cache
    console.log('\n🔍 Step 5: Saving cache...')
    saveCache(lastCreatedAt, finalRunColumns)
    
    // STEP 7: Sort by created_at (oldest → newest)
    finalRunColumns.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ FETCH COMPLETE!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📊 Total runs: ${finalRunColumns.length}`)
    console.log(`📊 New rows fetched: ${newRawData.length}`)
    console.log(`📊 Last timestamp: ${lastCreatedAt}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    return finalRunColumns
    
  } catch (error) {
    console.error('❌ Error in fetchAllRunColumns:', error)
    throw error
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY (DEPRECATED FUNCTIONS)
// ============================================================================

/**
 * @deprecated Use fetchAllRunColumns() instead
 */
export async function fetchRunIds(): Promise<RunOverview[]> {
  const runColumns = await fetchAllRunColumns()
  return runColumns.map(col => ({
    run_id: col.run_id,
    created_at: col.created_at,
    positive_count: col.positive_count,
    negative_count: col.negative_count
  }))
}

/**
 * @deprecated Use fetchAllRunColumns() instead - data is already aggregated
 */
export async function fetchRunSymbols(runId: string): Promise<SymbolMetrics[]> {
  const runColumns = await fetchAllRunColumns()
  const found = runColumns.find(col => col.run_id === runId)
  return found?.symbols || []
}
