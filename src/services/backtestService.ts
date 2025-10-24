import { supabase } from '../lib/supabase';

// ============================================================================
// RETRY UTILITY: 500 Internal Server Error için otomatik retry
// ============================================================================
async function retryOnServerError<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // 500 Internal Server Error veya network hatası mı kontrol et
      const is500Error = error?.message?.includes('500') || 
                         error?.code === '500' ||
                         error?.status === 500 ||
                         error?.message?.includes('Internal Server Error');
      
      if (!is500Error || attempt === maxRetries) {
        // 500 değilse veya son deneme ise hatayı fırlat
        throw error;
      }
      
      // 500 hatası - retry yapacağız
      console.warn(`⚠️ Server error (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Her denemede delay'i artır (exponential backoff)
      delayMs *= 1.5;
    }
  }
  
  throw lastError;
}

export interface SymbolData {
  symbol: string;
  winrate: number;
  pnl: number;
  trades_count: number;
  sharpe: number;
  max_dd: number;
  avg_pnl_positive: number;  // Symbol-level: positive trades avg
  avg_pnl_negative: number;  // Symbol-level: negative trades avg
}

export interface RunColumn {
  run_id: string;
  created_at: string;
  total_symbols: number;
  total_trades: number;         // NEW
  overall_winrate: number;       // NEW
  positive_count: number;
  negative_count: number;
  neutral_count: number;         // NEW
  // Run-level statistics
  avg_pnl_all: number;
  min_pnl_all: number;
  max_pnl_all: number;
  avg_pnl_positive: number;
  min_pnl_positive: number;
  max_pnl_positive: number;
  avg_pnl_negative: number;
  min_pnl_negative: number;
  max_pnl_negative: number;
  // Symbol details
  symbols: SymbolData[];
}

// Fetch run IDs only (lightweight - for pagination)
export async function fetchRunIdsLight(
  limit: number = 20, 
  lastCreatedAt: string | null = null,
  lastRunId: string | null = null
) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  console.log(`🔄 Fetching run IDs - limit: ${limit}, cursor: ${lastCreatedAt ? 'NEXT' : 'START'}...`);
  
  // ✅ Retry wrapper: 500 hatası alırsa otomatik yeniden dene
  return retryOnServerError(async () => {
    const { data, error } = await (supabase as any).rpc('get_backtest_run_ids_light', {
      p_limit: limit,
      p_last_created_at: lastCreatedAt,
      p_last_run_id: lastRunId
    });
    
    if (error) throw error;
    
    console.log(`✅ Got ${data?.length || 0} run IDs`);
    return data || [];
  });
}

// Fetch summary for a specific run_id
export async function fetchRunSummary(runId: string) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  console.log(`🔄 Fetching summary for run: ${runId.substring(0, 8)}...`);
  
  const { data, error } = await (supabase as any).rpc('get_backtest_run_summary', {
    p_run_id: runId
  });
  
  if (error) throw error;
  
  const summary = data && data.length > 0 ? data[0] : null;
  console.log(`✅ Got summary for run: ${runId.substring(0, 8)}`);
  return summary;
}

// V2: Trade-weighted statistics (more accurate)
export async function fetchRunSummaryV2(runId: string) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  console.log(`🔄 [V2] Fetching trade-weighted summary for run: ${runId.substring(0, 8)}...`);
  
  const { data, error } = await (supabase as any).rpc('get_backtest_run_summary_v2', {
    p_run_id: runId
  });
  
  if (error) throw error;
  
  const summary = data && data.length > 0 ? data[0] : null;
  console.log(`✅ [V2] Got trade-weighted summary for run: ${runId.substring(0, 8)}`);
  return summary;
}

// Fetch run summaries with cursor-based pagination (for UI control) - LIGHTWEIGHT
export async function fetchRunSummaries(
  limit: number = 20, 
  lastCreatedAt: string | null = null,
  lastRunId: string | null = null
) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  console.log(`🔄 Fetching run IDs (light) - limit: ${limit}, cursor: ${lastCreatedAt ? lastCreatedAt.substring(0, 10) : 'START'}...`);
  
  const { data: runIds, error } = await (supabase as any).rpc('get_backtest_run_ids_light', {
    p_limit: limit,
    p_last_created_at: lastCreatedAt,
    p_last_run_id: lastRunId
  });
  
  if (error) {
    console.error('❌ Error fetching run IDs:', error);
    throw error;
  }
  
  console.log(`✅ Got ${runIds?.length || 0} run IDs`);
  
  if (!runIds || runIds.length === 0) return [];
  
  // Now fetch detailed summaries for each run_id
  console.log(`🔄 Fetching detailed summaries for ${runIds.length} runs...`);
  const summaries = [];
  
  for (let i = 0; i < runIds.length; i++) {
    const { run_id, created_at } = runIds[i];
    console.log(`  📄 Fetching summary ${i + 1}/${runIds.length}: ${run_id.substring(0, 8)}...`);
    
    try {
      const { data, error: summaryError } = await (supabase as any).rpc('get_backtest_run_summary', {
        p_run_id: run_id
      });
      
      if (summaryError) {
        console.error(`    ❌ Error for run ${run_id}:`, summaryError);
      } else if (data && data.length > 0) {
        summaries.push(data[0]);
        console.log(`    ✅ Got summary`);
      }
    } catch (error) {
      console.error(`    ❌ Error for run ${run_id}:`, error);
    }
  }
  
  console.log(`✅ Got ${summaries.length} detailed summaries`);
  return summaries;
}

// Fetch details for specific run_ids
export async function fetchRunDetails(runIds: string[]) {
  if (!supabase) throw new Error('Supabase not initialized');
  if (runIds.length === 0) return new Map();
  
  console.log(`🔄 Fetching details for ${runIds.length} runs...`);
  
  const grouped = new Map();
  
  for (let i = 0; i < runIds.length; i++) {
    const runId = runIds[i];
    console.log(`  📄 Fetching run ${i + 1}/${runIds.length}: ${runId.substring(0, 8)}...`);
    
    try {
      const { data: details, error } = await (supabase as any).rpc('get_backtest_details_by_runs', {
        run_ids: [runId]
      });
      
      if (error) {
        console.error(`    ❌ Error for run ${runId}:`, error);
      } else {
        const symbols: any[] = details || [];
        grouped.set(runId, symbols);
        console.log(`    ✅ Got ${symbols.length} symbols`);
      }
    } catch (error) {
      console.error(`    ❌ Error for run ${runId}:`, error);
    }
  }
  
  console.log(`✅ Details fetched for ${grouped.size} runs`);
  return grouped;
}

// Legacy function for backward compatibility (loads ALL runs)
export async function fetchAllRunColumns() {
  if (!supabase) throw new Error('Supabase not initialized');
  
  console.log('🔄 Fetching run summaries with pagination...');
  
  // Fetch ALL runs with pagination (20 per page)
  let allRuns: any[] = [];
  let offset = 0;
  const limit = 20;
  let pageCount = 0;
  
  while (true) {
    pageCount++;
    console.log(`  📄 Fetching page ${pageCount} (offset: ${offset}, limit: ${limit})...`);
    
    const { data: summaries, error: e1 } = await (supabase as any).rpc('get_backtest_run_ids', {
      p_limit: limit,
      p_offset: offset
    });
    
    if (e1) throw e1;
    
    const runs: any[] = summaries || [];
    allRuns = allRuns.concat(runs);
    
    console.log(`    ✅ Got ${runs.length} runs (total: ${allRuns.length})`);
    
    // If less than limit, we're done
    if (runs.length < limit) {
      break;
    }
    
    // Move to next page
    offset += limit;
  }
  
  if (allRuns.length === 0) {
    console.log('No runs found');
    return [];
  }
  
  console.log(`✅ Found ${allRuns.length} runs (${pageCount} pages)`);
  console.log('🔄 Fetching details for each run individually...');
  
  // Fetch details for each run one by one (fallback to original approach)
  const grouped = new Map();
  const runIds = allRuns.map(r => r.run_id);
  
  for (let i = 0; i < runIds.length; i++) {
    const runId = runIds[i];
    console.log(`  📄 Fetching run ${i + 1}/${runIds.length}: ${runId}`);
    
    try {
      const { data: details, error } = await (supabase as any).rpc('get_backtest_details_by_runs', {
        run_ids: [runId]  // Single run_id at a time
      });
      
      if (error) {
        console.error(`    ❌ Error for run ${runId}:`, error);
      } else {
        const symbols: any[] = details || [];
        grouped.set(runId, symbols);
        console.log(`    ✅ Got ${symbols.length} symbols`);
      }
    } catch (error) {
      console.error(`    ❌ Error for run ${runId}:`, error);
    }
  }
  
  console.log(`  ✅ Total: ${Array.from(grouped.values()).flat().length} symbols for ${grouped.size} runs`);
  
  console.log('✅ All details fetched!');

  
  // Fetch top 40 overall statistics
  console.log('🔄 Fetching top 40 overall stats...');
  const top40Map = new Map();
  try {
    const { data: top40Data, error: e3 } = await (supabase as any).rpc('get_top40_overall_by_runs', {
      run_ids: runIds
    });
    
    if (e3) {
      console.error('  ❌ Error fetching top 40 stats:', e3);
    } else {
      const top40Results: any[] = top40Data || [];
      top40Results.forEach(item => {
        top40Map.set(item.run_id, item);
      });
      console.log(`  ✅ Got top 40 stats for ${top40Results.length} runs`);
    }
  } catch (error) {
    console.error('  ❌ Error fetching top 40 stats:', error);
  }
  
  // Build result columns with full run statistics
  return allRuns.map((s: any) => {
    const top40 = top40Map.get(s.run_id);
    return {
      run_id: s.run_id,
      created_at: s.created_at,
      total_symbols: s.total_symbols,
      total_trades: s.total_trades,           // NEW
      overall_winrate: s.overall_winrate,     // NEW
      positive_count: s.positive_pnl_count,
      negative_count: s.negative_pnl_count,
      neutral_count: s.neutral_pnl_count,     // NEW
      // Run-level statistics (ALL symbols)
      avg_pnl_all: s.avg_pnl_all,
      min_pnl_all: s.min_pnl_all,
      max_pnl_all: s.max_pnl_all,
      avg_pnl_positive: s.avg_pnl_positive,
      min_pnl_positive: s.min_pnl_positive,
      max_pnl_positive: s.max_pnl_positive,
      avg_pnl_negative: s.avg_pnl_negative,
      min_pnl_negative: s.min_pnl_negative,
      max_pnl_negative: s.max_pnl_negative,
      // Top 40 statistics
      top40_total_trades: top40?.top40_total_trades,
      top40_overall_winrate: top40?.top40_overall_winrate,
      top40_avg_pnl: top40?.top40_avg_pnl,
      top40_min_pnl: top40?.top40_min_pnl,
      top40_max_pnl: top40?.top40_max_pnl,
      top40_avg_pnl_positive: top40?.top40_avg_pnl_positive,
      top40_avg_pnl_negative: top40?.top40_avg_pnl_negative,
      top40_positive_count: top40?.top40_positive_count,
      top40_negative_count: top40?.top40_negative_count,
      top40_neutral_count: top40?.top40_neutral_count,
      // Symbol details
      symbols: grouped.get(s.run_id) || []
    };
  });
}

// Delete a backtest run by run_id
export async function deleteBacktestRun(runId: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase not initialized');
  
  try {
    // Delete from backtest_resultsv1 (cascade will handle trade_summaries and run_notes)
    const { error } = await supabase
      .from('backtest_resultsv1')
      .delete()
      .eq('run_id', runId);
    
    if (error) throw error;
    
    console.log(`✅ Deleted run: ${runId}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to delete run:', err);
    return false;
  }
}

export function clearCache() { console.log('Cache cleared'); }
