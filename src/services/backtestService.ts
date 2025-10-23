import { supabase } from '../lib/supabase';

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

export async function fetchAllRunColumns() {
  if (!supabase) throw new Error('Supabase not initialized');
  
  console.log('🔄 Fetching run summaries via RPC...');
  const { data: summaries, error: e1 } = await supabase.rpc('get_backtest_run_ids');
  if (e1) throw e1;
  
  const runs: any[] = summaries || [];
  
  if (runs.length === 0) {
    console.log('No runs found');
    return [];
  }
  
  console.log(`✅ Found ${runs.length} runs`);
  console.log('🔄 Fetching details for each run individually...');
  
  // Fetch details for each run one by one (fallback to original approach)
  const grouped = new Map();
  const runIds = runs.map(r => r.run_id);
  
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
  return runs.map((s: any) => {
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
