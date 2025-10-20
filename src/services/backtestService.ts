import { supabase } from '../lib/supabase';

export interface SymbolData { symbol: string; winrate: number; pnl: number; trades_count: number; sharpe: number; max_dd: number; }

export interface RunColumn { run_id: string; created_at: string; positive_count: number; negative_count: number; symbols: SymbolData[]; }

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
  
  // Build result columns
  return runs.map((s: any) => ({
    run_id: s.run_id,
    created_at: s.created_at,
    positive_count: s.positive_pnl_count,
    negative_count: s.negative_pnl_count,
    symbols: grouped.get(s.run_id) || []
  }));
}

export function clearCache() { console.log('Cache cleared'); }
