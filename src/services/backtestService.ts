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
  console.log('🔄 Fetching details for each run...');
  
  // Fetch details for each run_id separately
  const grouped = new Map();
  
  for (let i = 0; i < runs.length; i++) {
    const summary = runs[i];
    const runId = summary.run_id;
    
    console.log(`  [${i + 1}/${runs.length}] Fetching run: ${runId.substring(0, 8)}...`);
    
    try {
      const { data: details, error: e2 } = await (supabase as any).rpc('get_backtest_details_by_runs', {
        run_ids: [runId]  // Single run_id at a time
      });
      
      if (e2) {
        console.error(`  ❌ Error fetching run ${runId}:`, e2);
        continue;  // Skip this run, continue with others
      }
      
      const symbols: any[] = details || [];
      
      if (symbols.length > 0) {
        grouped.set(runId, symbols);
        console.log(`  ✅ Got ${symbols.length} symbols`);
      }
    } catch (error) {
      console.error(`  ❌ Error fetching run ${runId}:`, error);
      continue;
    }
  }
  
  console.log('✅ All details fetched!');
  
  // Build result columns with full run statistics
  return runs.map((s: any) => ({
    run_id: s.run_id,
    created_at: s.created_at,
    total_symbols: s.total_symbols,
    total_trades: s.total_trades,           // NEW
    overall_winrate: s.overall_winrate,     // NEW
    positive_count: s.positive_pnl_count,
    negative_count: s.negative_pnl_count,
    neutral_count: s.neutral_pnl_count,     // NEW
    // Run-level statistics
    avg_pnl_all: s.avg_pnl_all,
    min_pnl_all: s.min_pnl_all,
    max_pnl_all: s.max_pnl_all,
    avg_pnl_positive: s.avg_pnl_positive,
    min_pnl_positive: s.min_pnl_positive,
    max_pnl_positive: s.max_pnl_positive,
    avg_pnl_negative: s.avg_pnl_negative,
    min_pnl_negative: s.min_pnl_negative,
    max_pnl_negative: s.max_pnl_negative,
    // Symbol details
    symbols: grouped.get(s.run_id) || []
  }));
}

export function clearCache() { console.log('Cache cleared'); }
