# Test Script: Supabase RPC Functions for Strategy Overalls
# Tests the new RPC functions: get_backtest_run_ids and get_backtest_details_by_runs

$ErrorActionPreference = "Stop"

# Supabase credentials
$SUPABASE_URL = "https://jrdiedgyizhrkmrcaqns.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZGllZGd5aXpocmttcmNhcW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTAwMDgsImV4cCI6MjA3Mzg4NjAwOH0.1ka5rFreRcNDI-YnltGzVcVy8dR6DUo2p9N8YX5sEmQ"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🧪 RPC FUNCTIONS TEST" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

# ============================================================================
# TEST 1: get_backtest_run_ids RPC
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📊 TEST 1: get_backtest_run_ids()" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔄 Calling RPC function..." -ForegroundColor Cyan

$rpc1Timer = [System.Diagnostics.Stopwatch]::StartNew()

try {
    $uri = "$SUPABASE_URL/rest/v1/rpc/get_backtest_run_ids"
    
    $response1 = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body "{}"
    
    $rpc1Timer.Stop()
    
    Write-Host "✅ RPC call successful!" -ForegroundColor Green
    Write-Host "   └─ Time: $($rpc1Timer.ElapsedMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    if ($response1 -is [Array]) {
        Write-Host "📋 Results:" -ForegroundColor Cyan
        Write-Host "   ├─ Total runs: $($response1.Count)" -ForegroundColor Gray
        Write-Host ""
        
        # Display each run summary
        $runIndex = 1
        foreach ($run in $response1) {
            Write-Host "   Run #${runIndex}:" -ForegroundColor Yellow
            Write-Host "   ├─ run_id: $($run.run_id)" -ForegroundColor Gray
            Write-Host "   ├─ created_at: $($run.created_at)" -ForegroundColor Gray
            Write-Host "   ├─ total_symbols: $($run.total_symbols)" -ForegroundColor Gray
            Write-Host "   ├─ positive_pnl_count: $($run.positive_pnl_count)" -ForegroundColor Green
            Write-Host "   └─ negative_pnl_count: $($run.negative_pnl_count)" -ForegroundColor Red
            Write-Host ""
            $runIndex++
        }
        
        # Store for next test
        $runSummaries = $response1
        
    } else {
        Write-Host "⚠️  Unexpected response format" -ForegroundColor Yellow
        Write-Host "   Response: $($response1 | ConvertTo-Json -Depth 5)" -ForegroundColor Gray
        $runSummaries = @()
    }
    
} catch {
    Write-Host "❌ RPC call failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Response: $errorBody" -ForegroundColor Red
    }
    
    exit 1
}

# ============================================================================
# TEST 2: get_backtest_details_by_runs RPC
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📊 TEST 2: get_backtest_details_by_runs()" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

if ($runSummaries.Count -eq 0) {
    Write-Host "⚠️  No run_ids available from Test 1, skipping Test 2" -ForegroundColor Yellow
    exit 0
}

# Test with first run_id
$testRunId = $runSummaries[0].run_id
Write-Host "🔍 Testing with run_id: $testRunId" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔄 Calling RPC function with 1 run_id..." -ForegroundColor Cyan

$rpc2Timer = [System.Diagnostics.Stopwatch]::StartNew()

try {
    $uri = "$SUPABASE_URL/rest/v1/rpc/get_backtest_details_by_runs"
    
    $body = @{
        run_ids = @($testRunId)
    } | ConvertTo-Json
    
    $response2 = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    
    $rpc2Timer.Stop()
    
    Write-Host "✅ RPC call successful!" -ForegroundColor Green
    Write-Host "   └─ Time: $($rpc2Timer.ElapsedMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    if ($response2 -is [Array]) {
        Write-Host "📋 Results:" -ForegroundColor Cyan
        Write-Host "   ├─ Total symbol details: $($response2.Count)" -ForegroundColor Gray
        Write-Host ""
        
        # Group by run_id
        $grouped = $response2 | Group-Object -Property run_id
        
        foreach ($group in $grouped) {
            Write-Host "   Run: $($group.Name.Substring(0, 8))..." -ForegroundColor Yellow
            Write-Host "   ├─ Symbols: $($group.Count)" -ForegroundColor Gray
            
            # Show top 5 symbols by PNL
            $topSymbols = $group.Group | Sort-Object -Property pnl -Descending | Select-Object -First 5
            
            Write-Host "   ├─ Top 5 by PNL:" -ForegroundColor Cyan
            foreach ($sym in $topSymbols) {
                $pnlColor = if ($sym.pnl -gt 0) { "Green" } else { "Red" }
                Write-Host "   │  ├─ $($sym.symbol):" -ForegroundColor $pnlColor
                Write-Host "   │  │  ├─ PNL: $([math]::Round($sym.pnl, 4))" -ForegroundColor $pnlColor
                Write-Host "   │  │  ├─ Avg All: $([math]::Round($sym.avg_pnl_all, 4))" -ForegroundColor Cyan
                Write-Host "   │  │  ├─ Avg Positive: $([math]::Round($sym.avg_pnl_positive, 4))" -ForegroundColor Green
                Write-Host "   │  │  ├─ Avg Negative: $([math]::Round($sym.avg_pnl_negative, 4))" -ForegroundColor Red
                Write-Host "   │  │  ├─ WR: $([math]::Round($sym.winrate, 2))%" -ForegroundColor Gray
                Write-Host "   │  │  └─ Trades: $($sym.trades_count)" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
    } else {
        Write-Host "⚠️  Unexpected response format" -ForegroundColor Yellow
        Write-Host "   Response: $($response2 | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ RPC call failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Response: $errorBody" -ForegroundColor Red
    }
    
    exit 1
}

# ============================================================================
# TEST 3: Multiple run_ids (Batch Test)
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📊 TEST 3: Batch Test (All run_ids)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

$allRunIds = $runSummaries | Select-Object -ExpandProperty run_id

Write-Host "🔍 Testing with $($allRunIds.Count) run_ids..." -ForegroundColor Cyan
Write-Host ""

Write-Host "🔄 Calling RPC function with all run_ids..." -ForegroundColor Cyan

$rpc3Timer = [System.Diagnostics.Stopwatch]::StartNew()

try {
    $uri = "$SUPABASE_URL/rest/v1/rpc/get_backtest_details_by_runs"
    
    $body = @{
        run_ids = $allRunIds
    } | ConvertTo-Json
    
    $response3 = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    
    $rpc3Timer.Stop()
    
    Write-Host "✅ RPC call successful!" -ForegroundColor Green
    Write-Host "   └─ Time: $($rpc3Timer.ElapsedMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    if ($response3 -is [Array]) {
        Write-Host "📋 Results:" -ForegroundColor Cyan
        Write-Host "   ├─ Total symbol details: $($response3.Count)" -ForegroundColor Gray
        Write-Host ""
        
        # Group by run_id
        $grouped = $response3 | Group-Object -Property run_id
        
        Write-Host "   Breakdown by run_id:" -ForegroundColor Cyan
        foreach ($group in $grouped) {
            $symbols = $group.Group
            $positiveCount = ($symbols | Where-Object { $_.pnl -gt 0 }).Count
            $negativeCount = ($symbols | Where-Object { $_.pnl -le 0 }).Count
            $topSymbol = $symbols | Sort-Object -Property pnl -Descending | Select-Object -First 1
            
            Write-Host "   ├─ Run: $($group.Name.Substring(0, 8))..." -ForegroundColor Yellow
            Write-Host "   │  ├─ Total symbols: $($group.Count)" -ForegroundColor Gray
            Write-Host "   │  ├─ Positive PNL: $positiveCount" -ForegroundColor Green
            Write-Host "   │  ├─ Negative PNL: $negativeCount" -ForegroundColor Red
            Write-Host "   │  └─ Best: $($topSymbol.symbol) (PNL: $([math]::Round($topSymbol.pnl, 4)))" -ForegroundColor Cyan
            Write-Host ""
        }
        
        # Calculate payload size
        $jsonSize = ($response3 | ConvertTo-Json -Depth 5 -Compress).Length
        $sizeKB = [math]::Round($jsonSize / 1024, 2)
        
        Write-Host "   📦 Payload size: $sizeKB KB" -ForegroundColor Cyan
        Write-Host ""
        
    } else {
        Write-Host "⚠️  Unexpected response format" -ForegroundColor Yellow
        Write-Host "   Response: $($response3 | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ RPC call failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Response: $errorBody" -ForegroundColor Red
    }
    
    exit 1
}

# ============================================================================
# PERFORMANCE COMPARISON
# ============================================================================

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎯 PERFORMANCE SUMMARY" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⏱️  RPC Timings:" -ForegroundColor Yellow
Write-Host "   ├─ get_backtest_run_ids(): $($rpc1Timer.ElapsedMilliseconds)ms" -ForegroundColor Cyan
Write-Host "   ├─ get_details (1 run): $($rpc2Timer.ElapsedMilliseconds)ms" -ForegroundColor Cyan
Write-Host "   └─ get_details (all runs): $($rpc3Timer.ElapsedMilliseconds)ms" -ForegroundColor Cyan
Write-Host ""

$totalTime = $rpc1Timer.ElapsedMilliseconds + $rpc3Timer.ElapsedMilliseconds
Write-Host "📊 Total fetch time (full load): $totalTime ms ($([math]::Round($totalTime / 1000, 2))s)" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Recommendations:" -ForegroundColor Yellow
if ($totalTime -lt 1000) {
    Write-Host "   1. ✅ EXCELLENT! RPC is very fast (<1s)" -ForegroundColor Green
    Write-Host "   2. ✅ Use this approach for production" -ForegroundColor Green
    Write-Host "   3. ✅ Cache can be optional (already fast)" -ForegroundColor Green
} elseif ($totalTime -lt 3000) {
    Write-Host "   1. ✅ GOOD! RPC is fast (<3s)" -ForegroundColor Green
    Write-Host "   2. ✅ Add client-side cache for instant subsequent loads" -ForegroundColor Cyan
    Write-Host "   3. ✅ This is much better than REST API pagination" -ForegroundColor Green
} else {
    Write-Host "   1. ⚠️  RPC took >3s, but still better than REST pagination" -ForegroundColor Yellow
    Write-Host "   2. ✅ Definitely add client-side caching" -ForegroundColor Cyan
    Write-Host "   3. 🔍 Consider indexing database columns (run_id, symbol)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Ready for frontend integration!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
