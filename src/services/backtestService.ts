import { supabase } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface BacktestRow {
  id: string;
  run_id: string;
  symbol: string;
  winrate: number;
  sum_ret: number;
  created_at: string;
}

export interface SymbolData {
  symbol: string;
  winrate: number;
  pnl: number;
}

export interface RunColumn {
  run_id: string;
  created_at: string;
  positive_count: number;
  negative_count: number;
  symbols: SymbolData[];
}

export interface BacktestCache {
  version: string;
  last_id: string;
  total_rows: number;
  columns: RunColumn[];
  timestamp: number;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const CACHE_KEY = 'backtest_strategy_overalls_v3';
const CACHE_VERSION = 'v3';

// Clean up old cache versions
function cleanupOldCaches(): void {
  const oldKeys = [
    'backtest_strategy_overalls',
    'backtest_strategy_overalls_v1',
    'backtest_strategy_overalls_v2',
  ];

  oldKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`Removing old cache: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

function loadCache(): BacktestCache | null {
  // Clean up old versions first
  cleanupOldCaches();

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as BacktestCache;
    
    // Validate cache version
    if (data.version !== CACHE_VERSION) {
      console.log('Cache version mismatch, clearing cache');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function saveCache(cache: BacktestCache): void {
  try {
    const json = JSON.stringify(cache);
    const sizeKB = json.length / 1024;
    
    console.log(`Saving cache: ${sizeKB.toFixed(2)} KB`);
    
    if (sizeKB > 5120) {
      console.warn('Cache size > 5MB! Consider using IndexedDB');
    }
    
    localStorage.setItem(CACHE_KEY, json);
  } catch (error) {
    console.error('Error saving cache:', error);
    // If quota exceeded, clear and retry
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old cache');
      localStorage.removeItem(CACHE_KEY);
    }
  }
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('Cache cleared');
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchPage(
  pageNum: number,
  lastId: string | null,
  signal?: AbortSignal
): Promise<BacktestRow[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('backtest_resultsv1')
    .select('id,run_id,symbol,winrate,sum_ret,created_at');

  if (pageNum === 1) {
    // First page: ORDER BY id ASC
    query = query.order('id', { ascending: true }).limit(1000);
  } else {
    // Subsequent pages: id > last_id ORDER BY id ASC
    query = query
      .gt('id', lastId!)
      .order('id', { ascending: true })
      .limit(1000);
  }

  // Add abort signal if provided
  if (signal) {
    const { data, error } = await query.abortSignal(signal).returns<BacktestRow[]>();
    if (error) throw error;
    return data || [];
  } else {
    const { data, error } = await query.returns<BacktestRow[]>();
    if (error) throw error;
    return data || [];
  }
}

async function fetchAllData(
  onProgress?: (fetched: number, total: number) => void,
  signal?: AbortSignal
): Promise<BacktestRow[]> {
  const allData: BacktestRow[] = [];
  let pageNum = 1;
  let lastId: string | null = null;
  const pageSize = 1000;

  console.log('Starting ID-based pagination...');

  while (true) {
    // Check if aborted
    if (signal?.aborted) {
      throw new DOMException('Fetch aborted', 'AbortError');
    }

    try {
      const startTime = performance.now();
      const rows = await fetchPage(pageNum, lastId, signal);
      const duration = performance.now() - startTime;

      if (rows.length === 0) {
        console.log('No more data');
        break;
      }

      allData.push(...rows);
      lastId = rows[rows.length - 1].id;

      console.log(
        `Page ${pageNum}: ${rows.length} rows | Total: ${allData.length} | ${duration.toFixed(0)}ms`
      );

      // Report progress
      if (onProgress) {
        // Estimate total (we don't know exact count, use 422K as estimate)
        const estimatedTotal = 422820;
        onProgress(allData.length, estimatedTotal);
      }

      // Safety: if we got less than page size, it's the last page
      if (rows.length < pageSize) {
        console.log('Last page reached');
        break;
      }

      pageNum++;

      // Safety limit: stop after 500 pages (500K rows)
      if (pageNum > 500) {
        console.warn('Safety limit reached (500 pages)');
        break;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      console.error(`Error fetching page ${pageNum}:`, error);

      // Retry logic for timeout errors
      if (error && typeof error === 'object' && 'code' in error && error.code === '57014') {
        console.log('Timeout error, stopping pagination (data fetched so far will be used)');
        break;
      }

      throw error;
    }
  }

  console.log(`Pagination complete: ${allData.length} total rows`);
  return allData;
}

// ============================================================================
// DATA AGGREGATION
// ============================================================================

function aggregateData(rows: BacktestRow[]): RunColumn[] {
  console.log(`Aggregating ${rows.length} rows...`);

  // Group by run_id
  const runGroups = new Map<string, BacktestRow[]>();

  for (const row of rows) {
    const existing = runGroups.get(row.run_id);
    if (existing) {
      existing.push(row);
    } else {
      runGroups.set(row.run_id, [row]);
    }
  }

  console.log(`Found ${runGroups.size} unique run_ids`);

  const columns: RunColumn[] = [];

  for (const [runId, runRows] of runGroups) {
    // Get earliest created_at for this run
    const createdAt = runRows.reduce((min, row) => {
      return row.created_at < min ? row.created_at : min;
    }, runRows[0].created_at);

    // Group by symbol within this run
    const symbolGroups = new Map<string, BacktestRow[]>();

    for (const row of runRows) {
      const existing = symbolGroups.get(row.symbol);
      if (existing) {
        existing.push(row);
      } else {
        symbolGroups.set(row.symbol, [row]);
      }
    }

    // Aggregate each symbol
    const symbols: SymbolData[] = [];

    for (const [symbol, symbolRows] of symbolGroups) {
      const avgWinrate = symbolRows.reduce((sum, r) => sum + r.winrate, 0) / symbolRows.length;
      const avgPnl = symbolRows.reduce((sum, r) => sum + r.sum_ret, 0) / symbolRows.length;

      symbols.push({
        symbol,
        winrate: avgWinrate,
        pnl: avgPnl,
      });
    }

    // Sort symbols by PNL descending
    symbols.sort((a, b) => b.pnl - a.pnl);

    // Count positive/negative
    const positiveCount = symbols.filter(s => s.pnl > 0).length;
    const negativeCount = symbols.filter(s => s.pnl <= 0).length;

    columns.push({
      run_id: runId,
      created_at: createdAt,
      positive_count: positiveCount,
      negative_count: negativeCount,
      symbols,
    });
  }

  // Sort columns by created_at ascending (oldest to newest)
  columns.sort((a, b) => a.created_at.localeCompare(b.created_at));

  console.log(`Aggregated into ${columns.length} columns`);

  return columns;
}

// ============================================================================
// COLUMN MERGING (for incremental updates)
// ============================================================================

function mergeColumns(existing: RunColumn[], newColumns: RunColumn[]): RunColumn[] {
  console.log(`Merging columns: ${existing.length} existing + ${newColumns.length} new`);

  // Create a map of existing columns by run_id
  const columnMap = new Map<string, RunColumn>();

  for (const col of existing) {
    columnMap.set(col.run_id, col);
  }

  // Merge or add new columns
  for (const newCol of newColumns) {
    const existingCol = columnMap.get(newCol.run_id);

    if (existingCol) {
      // Merge: combine symbols and recalculate
      const mergedSymbolMap = new Map<string, SymbolData>();

      // Add existing symbols
      for (const sym of existingCol.symbols) {
        mergedSymbolMap.set(sym.symbol, sym);
      }

      // Add/update with new symbols (new data takes precedence)
      for (const sym of newCol.symbols) {
        mergedSymbolMap.set(sym.symbol, sym);
      }

      const mergedSymbols = Array.from(mergedSymbolMap.values());
      mergedSymbols.sort((a, b) => b.pnl - a.pnl);

      const positiveCount = mergedSymbols.filter(s => s.pnl > 0).length;
      const negativeCount = mergedSymbols.filter(s => s.pnl <= 0).length;

      columnMap.set(newCol.run_id, {
        run_id: newCol.run_id,
        created_at: existingCol.created_at, // Keep original created_at
        positive_count: positiveCount,
        negative_count: negativeCount,
        symbols: mergedSymbols,
      });
    } else {
      // New run_id, just add it
      columnMap.set(newCol.run_id, newCol);
    }
  }

  // Convert back to array and sort by created_at
  const merged = Array.from(columnMap.values());
  merged.sort((a, b) => a.created_at.localeCompare(b.created_at));

  console.log(`Merged result: ${merged.length} columns`);

  return merged;
}

// ============================================================================
// MAIN API
// ============================================================================

export async function fetchAllRunColumns(
  onProgress?: (fetched: number, total: number) => void,
  signal?: AbortSignal
): Promise<RunColumn[]> {
  console.log('='.repeat(50));
  console.log('FETCHING STRATEGY OVERALLS DATA');
  console.log('='.repeat(50));

  // Check cache first
  const cache = loadCache();

  if (cache) {
    console.log(`Cache hit! ${cache.columns.length} columns cached`);
    console.log(`Cache timestamp: ${new Date(cache.timestamp).toLocaleString()}`);
    console.log(`Last ID: ${cache.last_id}`);

    // Check for new data since last_id
    try {
      const newRows = await fetchNewDataSinceLastId(cache.last_id, onProgress, signal);

      if (newRows.length === 0) {
        console.log('No new data, using cache');
        return cache.columns;
      }

      console.log(`Found ${newRows.length} new rows, updating cache...`);

      // Combine old + new data
      const allRows: BacktestRow[] = [];
      
      // Reconstruct old rows from cache columns (simplified - just for aggregation)
      // We don't store raw rows in cache, so we need to re-fetch if we want to merge
      // For now, let's just re-aggregate the new data with cached data
      
      // Actually, easier approach: aggregate new rows separately, then merge columns
      const newColumns = aggregateData(newRows);
      
      // Merge with existing columns
      const mergedColumns = mergeColumns(cache.columns, newColumns);

      // Update cache
      const updatedCache: BacktestCache = {
        version: CACHE_VERSION,
        last_id: newRows[newRows.length - 1].id,
        total_rows: cache.total_rows + newRows.length,
        columns: mergedColumns,
        timestamp: Date.now(),
      };

      saveCache(updatedCache);

      console.log(`Cache updated: ${mergedColumns.length} columns total`);
      return mergedColumns;

    } catch (error) {
      console.error('Error checking for new data:', error);
      console.log('Falling back to cached data');
      return cache.columns;
    }
  }

  console.log('Cache miss, fetching all data...');

  // Fetch all data with pagination
  const allRows = await fetchAllData(onProgress, signal);

  if (allRows.length === 0) {
    console.log('No data found');
    return [];
  }

  // Aggregate into columns
  const columns = aggregateData(allRows);

  // Save to cache
  const lastId = allRows[allRows.length - 1].id;

  const cacheData: BacktestCache = {
    version: CACHE_VERSION,
    last_id: lastId,
    total_rows: allRows.length,
    columns,
    timestamp: Date.now(),
  };

  saveCache(cacheData);

  console.log('='.repeat(50));
  console.log('FETCH COMPLETE');
  console.log('='.repeat(50));

  return columns;
}

// ============================================================================
// INCREMENTAL UPDATE
// ============================================================================

async function fetchNewDataSinceLastId(
  lastId: string,
  onProgress?: (fetched: number, total: number) => void,
  signal?: AbortSignal
): Promise<BacktestRow[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  console.log(`Fetching new data since last_id: ${lastId}...`);

  const allData: BacktestRow[] = [];
  let pageNum = 1;
  let currentLastId = lastId;
  const pageSize = 1000;

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Fetch aborted', 'AbortError');
    }

    try {
      const startTime = performance.now();
      
      // Fetch rows with id > last_id
      const { data, error } = await supabase
        .from('backtest_resultsv1')
        .select('id,run_id,symbol,winrate,sum_ret,created_at')
        .gt('id', currentLastId)
        .order('id', { ascending: true })
        .limit(pageSize)
        .returns<BacktestRow[]>();

      const duration = performance.now() - startTime;

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No new data found');
        break;
      }

      allData.push(...data);
      currentLastId = data[data.length - 1].id;

      console.log(
        `New data page ${pageNum}: ${data.length} rows | Total new: ${allData.length} | ${duration.toFixed(0)}ms`
      );

      if (onProgress) {
        onProgress(allData.length, allData.length); // Unknown total for incremental
      }

      if (data.length < pageSize) {
        console.log('Last page of new data reached');
        break;
      }

      pageNum++;

      // Safety limit
      if (pageNum > 100) {
        console.warn('Safety limit reached (100 pages of new data)');
        break;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      console.error(`Error fetching new data page ${pageNum}:`, error);

      if (error && typeof error === 'object' && 'code' in error && error.code === '57014') {
        console.log('Timeout error, stopping incremental fetch');
        break;
      }

      throw error;
    }
  }

  console.log(`Incremental fetch complete: ${allData.length} new rows`);
  return allData;
}

async function checkForNewRuns(
  cachedRunIds: string[]
): Promise<string[]> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  console.log(`Checking for new run_ids (cache has ${cachedRunIds.length} runs)...`);

  const { data, error } = await supabase
    .from('backtest_resultsv1')
    .select('run_id')
    .not('run_id', 'in', `(${cachedRunIds.join(',')})`)
    .limit(1000)
    .returns<{ run_id: string }[]>();

  if (error) {
    console.error('Error checking for new runs:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('No new run_ids found');
    return [];
  }

  const newRunIds = [...new Set(data.map(r => r.run_id))];
  console.log(`Found ${newRunIds.length} new run_ids!`);

  return newRunIds;
}
