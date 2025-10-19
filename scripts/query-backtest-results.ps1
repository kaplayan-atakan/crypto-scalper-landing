# Supabase backtest_resultsv1 Table Query Script
# Bu script tabloya SELECT * sorgusu atar ve sonuçları gösterir

$ErrorActionPreference = "Stop"

# Supabase credentials
$SUPABASE_URL = "https://jrdiedgyizhrkmrcaqns.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZGllZGd5aXpocmttcmNhcW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTAwMDgsImV4cCI6MjA3Mzg4NjAwOH0.1ka5rFreRcNDI-YnltGzVcVy8dR6DUo2p9N8YX5sEmQ"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "📊 BACKTEST RESULTS QUERY" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Function to query Supabase
function Invoke-SupabaseQuery {
    param(
        [string]$Query,
        [string]$Description
    )
    
    Write-Host "🔍 $Description" -ForegroundColor Yellow
    Write-Host "Query: $Query" -ForegroundColor Gray
    Write-Host ""
    
    $headers = @{
        "apikey" = $SUPABASE_ANON_KEY
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
        "Prefer" = "count=exact"
    }
    
    $uri = "$SUPABASE_URL/rest/v1/backtest_resultsv1?$Query"
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers -ResponseHeadersVariable responseHeaders
        
        # Check if there's a Content-Range header indicating total count
        if ($responseHeaders.ContainsKey('Content-Range')) {
            $contentRange = $responseHeaders['Content-Range']
            Write-Host "📊 Content-Range: $contentRange" -ForegroundColor Cyan
        }
        
        return $response
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        return $null
    }
}

# PHASE 1: Fetch all unique run_ids with PAGINATION (OPTIMAL)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔥 PHASE 1: FETCH ALL DATA WITH PAGINATION" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Supabase has max page size of 1000 rows (hard limit)
# We need to use pagination (offset) to fetch all data
$PAGE_SIZE = 1000
$allRunRows = @()
$offset = 0
$totalFetched = 0
$totalInTable = 0

Write-Host "� Using pagination strategy (page size: $PAGE_SIZE)" -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "count=exact"
}

# First request to get total count
Write-Host "🔍 Step 1: Getting total row count..." -ForegroundColor Cyan
$initialQuery = "select=run_id&limit=1"
$initialUri = "$SUPABASE_URL/rest/v1/backtest_resultsv1?$initialQuery"

try {
    $initialResponse = Invoke-RestMethod -Uri $initialUri -Method Get -Headers $headers -ResponseHeadersVariable initialHeaders
    
    if ($null -ne $initialHeaders -and $initialHeaders.ContainsKey('Content-Range')) {
        $contentRange = $initialHeaders['Content-Range'][0]  # Get first element if array
        Write-Host "📊 Content-Range: $contentRange" -ForegroundColor Gray
        
        if ($contentRange -match '\/(\d+)$') {
            $totalInTable = [int]$matches[1]
            Write-Host "✅ Total rows in table: $totalInTable" -ForegroundColor Green
        }
    } else {
        # Fallback: assume large number and stop when we get no data
        $totalInTable = 300000
        Write-Host "⚠️  Could not determine exact count, will paginate until end" -ForegroundColor Yellow
    }
    
    $totalPages = [Math]::Ceiling($totalInTable / $PAGE_SIZE)
    Write-Host "📄 Estimated pages to fetch: $totalPages" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "❌ Error getting row count: $_" -ForegroundColor Red
    Write-Host "   Continuing with pagination anyway..." -ForegroundColor Yellow
    $totalInTable = 300000
    $totalPages = 300
    Write-Host ""
}

# Now fetch all pages
Write-Host "🔍 Step 2: Fetching all pages..." -ForegroundColor Cyan
$pageNumber = 1

$overallStopwatch = [System.Diagnostics.Stopwatch]::StartNew()

while ($true) {
    $runIdsQuery = "select=run_id,created_at,sum_ret&limit=$PAGE_SIZE&offset=$offset"
    $uri = "$SUPABASE_URL/rest/v1/backtest_resultsv1?$runIdsQuery"
    
    try {
        Write-Host "   [$pageNumber/$totalPages] Offset: $offset..." -NoNewline -ForegroundColor Gray
        
        $pageStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $pageRows = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
        $pageStopwatch.Stop()
        
        if ($pageRows.Count -eq 0) {
            Write-Host " ✅ No more data" -ForegroundColor Green
            break
        }
        
        $allRunRows += $pageRows
        $totalFetched += $pageRows.Count
        $progressPercent = ($totalFetched / $totalInTable) * 100
        
        Write-Host " ✅ Got $($pageRows.Count) rows ($([math]::Round($progressPercent, 1))%) [$($pageStopwatch.ElapsedMilliseconds)ms]" -ForegroundColor Green
        
        $offset += $PAGE_SIZE
        $pageNumber++
        
        # Safety check: if we got less than page size, we're done
        if ($pageRows.Count -lt $PAGE_SIZE) {
            Write-Host "   ✅ Reached end of data (last page had $($pageRows.Count) rows)" -ForegroundColor Green
            break
        }
        
    } catch {
        Write-Host " ❌ Error: $_" -ForegroundColor Red
        break
    }
}

$overallStopwatch.Stop()

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 PAGINATION SUMMARY" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Total rows fetched: $totalFetched / $totalInTable" -ForegroundColor Green
Write-Host "⏱️  Total time: $([math]::Round($overallStopwatch.Elapsed.TotalSeconds, 2))s" -ForegroundColor Cyan
Write-Host "📈 Avg speed: $([math]::Round($totalFetched / $overallStopwatch.Elapsed.TotalSeconds, 0)) rows/sec" -ForegroundColor Cyan
Write-Host ""

if ($totalFetched -lt $totalInTable) {
    Write-Host "⚠️  Warning: Fetched only $([math]::Round(($totalFetched / $totalInTable) * 100, 2))% of data" -ForegroundColor Yellow
    Write-Host ""
}

try {
    
    # Group by run_id to get unique run_ids with metadata
    $runIdGroups = $allRunRows | Group-Object -Property run_id
    
    Write-Host "✅ Found $($runIdGroups.Count) unique run_ids" -ForegroundColor Green
    Write-Host ""
    
    # Create run overview with positive/negative counts
    $runOverviews = @()
    foreach ($group in $runIdGroups) {
        $runId = $group.Name
        $rows = $group.Group
        $createdAt = $rows[0].created_at
        $positiveCount = ($rows | Where-Object { $_.sum_ret -gt 0 }).Count
        $negativeCount = ($rows | Where-Object { $_.sum_ret -le 0 }).Count
        
        $runOverviews += [PSCustomObject]@{
            RunId = $runId
            CreatedAt = $createdAt
            TotalRows = $rows.Count
            PositiveCount = $positiveCount
            NegativeCount = $negativeCount
        }
    }
    
    # Sort by created_at ascending (oldest first)
    $runOverviews = $runOverviews | Sort-Object -Property CreatedAt
    
    Write-Host "📋 RUN ID OVERVIEW:" -ForegroundColor Yellow
    $runIndex = 1
    foreach ($run in $runOverviews) {
        Write-Host "   [$runIndex] 📌 $($run.RunId)" -ForegroundColor Cyan
        Write-Host "       ├─ Date: $($run.CreatedAt)" -ForegroundColor Gray
        Write-Host "       ├─ Total Rows: $($run.TotalRows)" -ForegroundColor Gray
        Write-Host "       ├─ Positive: $($run.PositiveCount) 💚" -ForegroundColor Green
        Write-Host "       └─ Negative: $($run.NegativeCount) ❤️" -ForegroundColor Red
        Write-Host ""
        $runIndex++
    }
    
} catch {
    Write-Host "❌ Error fetching run_ids: $_" -ForegroundColor Red
    exit
}

# PHASE 2: Fetch symbol aggregations for each run_id (ASYNC SIMULATION)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔥 PHASE 2: FETCH SYMBOL AGGREGATIONS PER RUN_ID" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Processing $($runOverviews.Count) run_ids in parallel..." -ForegroundColor Yellow
Write-Host ""

$allRunColumns = @()

# PowerShell 7+ has ForEach-Object -Parallel, but for compatibility we'll use sequential with progress
$runNumber = 1
foreach ($runOverview in $runOverviews) {
    $runId = $runOverview.RunId
    
    Write-Host "[$runNumber/$($runOverviews.Count)] 🔄 Fetching symbols for run_id: $runId" -ForegroundColor Cyan
    
    # Query only symbol, winrate, sum_ret for this specific run_id
    $symbolQuery = "select=symbol,winrate,sum_ret&run_id=eq.$runId&limit=150000"
    
    try {
        $symbolRows = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/backtest_resultsv1?$symbolQuery" `
            -Method Get `
            -Headers $headers
        
        Write-Host "   ├─ Fetched $($symbolRows.Count) rows" -ForegroundColor Gray
        
        # Group by symbol and aggregate
        $symbolGroups = $symbolRows | Group-Object -Property symbol
        
        $symbolMetrics = @()
        foreach ($symbolGroup in $symbolGroups) {
            $symbol = $symbolGroup.Name
            $symbolData = $symbolGroup.Group
            
            $avgWinrate = ($symbolData | Measure-Object -Property winrate -Average).Average
            $avgPnl = ($symbolData | Measure-Object -Property sum_ret -Average).Average
            
            $symbolMetrics += [PSCustomObject]@{
                Symbol = $symbol
                AvgWinrate = $avgWinrate
                AvgPNL = $avgPnl
                TestCount = $symbolData.Count
            }
        }
        
        # Sort by PNL descending (CRITICAL: each column has independent sorting)
        $symbolMetrics = $symbolMetrics | Sort-Object -Property AvgPNL -Descending
        
        Write-Host "   ├─ Found $($symbolMetrics.Count) unique symbols" -ForegroundColor Green
        Write-Host "   └─ Sorted by PNL (top: $($symbolMetrics[0].Symbol) = $([math]::Round($symbolMetrics[0].AvgPNL, 4)))" -ForegroundColor Green
        Write-Host ""
        
        # Add to all columns
        $allRunColumns += [PSCustomObject]@{
            RunId = $runId
            CreatedAt = $runOverview.CreatedAt
            PositiveCount = $runOverview.PositiveCount
            NegativeCount = $runOverview.NegativeCount
            Symbols = $symbolMetrics
        }
        
    } catch {
        Write-Host "   ❌ Error fetching symbols: $_" -ForegroundColor Red
    }
    
    $runNumber++
}

Write-Host "✅ Completed fetching all run columns!" -ForegroundColor Green
Write-Host ""

# 3. ADVANCED: Global symbol aggregation across ALL run_ids
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎯 GLOBAL SYMBOL AGGREGATION (ALL RUN_IDs)" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Flatten all symbols from all runs
$allSymbolsFlat = @()
foreach ($runCol in $allRunColumns) {
    foreach ($symbolMetric in $runCol.Symbols) {
        $allSymbolsFlat += [PSCustomObject]@{
            Symbol = $symbolMetric.Symbol
            Winrate = $symbolMetric.AvgWinrate
            PNL = $symbolMetric.AvgPNL
        }
    }
}

# Group by symbol across ALL run_ids and calculate comprehensive stats
$allSymbolsAggregated = $allSymbolsFlat | Group-Object -Property Symbol | ForEach-Object {
    $symbol = $_.Name
    $symbolData = $_.Group
    
    # Calculate aggregated metrics
    $totalAppearances = $symbolData.Count
    $avgWinrate = ($symbolData | Measure-Object -Property Winrate -Average).Average
    $avgPnl = ($symbolData | Measure-Object -Property PNL -Average).Average
    $totalPnl = ($symbolData | Measure-Object -Property PNL -Sum).Sum
    $maxPnl = ($symbolData | Measure-Object -Property PNL -Maximum).Maximum
    $minPnl = ($symbolData | Measure-Object -Property PNL -Minimum).Minimum
    
    # Count positive and negative results
    $positiveCount = ($symbolData | Where-Object { $_.PNL -gt 0 }).Count
    $negativeCount = ($symbolData | Where-Object { $_.PNL -le 0 }).Count
    
    [PSCustomObject]@{
        Symbol = $symbol
        TotalAppearances = $totalAppearances
        AvgWinrate = $avgWinrate
        AvgPNL = $avgPnl
        TotalPNL = $totalPnl
        MaxPNL = $maxPnl
        MinPNL = $minPnl
        PositiveResults = $positiveCount
        NegativeResults = $negativeCount
        SuccessRate = if ($totalAppearances -gt 0) { ($positiveCount / $totalAppearances) * 100 } else { 0 }
    }
}

Write-Host "📊 CUMULATIVE AGGREGATION RESULTS:" -ForegroundColor Yellow
Write-Host "   (Grouped by Symbol, sorted by Total PNL)" -ForegroundColor Gray
Write-Host ""

# Sort by Total PNL descending
$sortedByPnl = $allSymbolsAggregated | Sort-Object -Property TotalPNL -Descending

Write-Host "📊 Found $($sortedByPnl.Count) unique symbols across all runs" -ForegroundColor Green
Write-Host ""

# Show top 20 symbols
$topCount = [Math]::Min(20, $sortedByPnl.Count)
Write-Host "🏆 TOP $topCount SYMBOLS BY TOTAL PNL:" -ForegroundColor Yellow
Write-Host ""

for ($i = 0; $i -lt $topCount; $i++) {
    $item = $sortedByPnl[$i]
    $pnlColor = if ($item.TotalPNL -gt 0) { "Green" } else { "Red" }
    $pnlSign = if ($item.TotalPNL -gt 0) { "+" } else { "" }
    
    Write-Host "[$($i + 1)] 🎯 $($item.Symbol)" -ForegroundColor Cyan
    Write-Host "     ├─ Appears in: $($item.TotalAppearances) run(s)" -ForegroundColor Gray
    Write-Host "     ├─ Avg Winrate: $([math]::Round($item.AvgWinrate * 100, 2))%" -ForegroundColor Gray
    Write-Host "     ├─ Avg PNL (per run): $([math]::Round($item.AvgPNL, 4))" -ForegroundColor Gray
    Write-Host "     ├─ Total PNL (cumulative): $pnlSign$([math]::Round($item.TotalPNL, 2))" -ForegroundColor $pnlColor
    Write-Host "     ├─ Best Result: $([math]::Round($item.MaxPNL, 4))" -ForegroundColor Green
    Write-Host "     ├─ Worst Result: $([math]::Round($item.MinPNL, 4))" -ForegroundColor Red
    Write-Host "     ├─ Positive Runs: $($item.PositiveResults) ($([math]::Round($item.SuccessRate, 1))%)" -ForegroundColor Green
    Write-Host "     └─ Negative Runs: $($item.NegativeResults) ($([math]::Round(100 - $item.SuccessRate, 1))%)" -ForegroundColor Red
    Write-Host ""
}

# 4. STRATEGY OVERALLS TABLE PREVIEW (matching frontend structure)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 STRATEGY OVERALLS TABLE PREVIEW" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "This is how the data would appear in the frontend table:" -ForegroundColor Gray
Write-Host ""

# Find max row count (max symbols in any column)
$maxSymbolCount = ($allRunColumns.Symbols | ForEach-Object { $_.Count } | Measure-Object -Maximum).Maximum

Write-Host "📋 Table Dimensions: $maxSymbolCount rows × $($allRunColumns.Count) columns" -ForegroundColor Yellow
Write-Host ""

# Show first 10 rows as preview
$previewRows = [Math]::Min(10, $maxSymbolCount)

Write-Host "🔝 FIRST $previewRows ROWS (Top PNL symbols per column):" -ForegroundColor Yellow
Write-Host ""

for ($rowIdx = 0; $rowIdx -lt $previewRows; $rowIdx++) {
    Write-Host "Row $($rowIdx + 1):" -ForegroundColor Cyan
    
    $colIdx = 1
    foreach ($runCol in $allRunColumns) {
        if ($rowIdx -lt $runCol.Symbols.Count) {
            $symbolData = $runCol.Symbols[$rowIdx]
            $pnlColor = if ($symbolData.AvgPNL -gt 0) { "Green" } else { "Red" }
            $pnlSign = if ($symbolData.AvgPNL -gt 0) { "+" } else { "" }
            
            Write-Host "   Col $colIdx (Run: $($runCol.RunId.Substring(0,8))...): " -NoNewline -ForegroundColor Gray
            Write-Host "$($symbolData.Symbol) | WR: $([math]::Round($symbolData.AvgWinrate * 100, 1))% | PNL: $pnlSign$([math]::Round($symbolData.AvgPNL, 4))" -ForegroundColor $pnlColor
        } else {
            Write-Host "   Col $colIdx (Run: $($runCol.RunId.Substring(0,8))...): [empty]" -ForegroundColor DarkGray
        }
        $colIdx++
    }
    Write-Host ""
}

# 5. Export aggregated results to CSV
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📁 EXPORT RESULTS" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Export global symbol aggregation
$csvPathAggregated = Join-Path $PSScriptRoot "symbol_aggregation_export.csv"
$sortedByPnl | Export-Csv -Path $csvPathAggregated -NoTypeInformation -Encoding UTF8
Write-Host "✅ Global Symbol Aggregation: $csvPathAggregated" -ForegroundColor Green
Write-Host "   📊 Total unique symbols: $($sortedByPnl.Count)" -ForegroundColor Gray
Write-Host ""

# Export run overviews
$csvPathRuns = Join-Path $PSScriptRoot "run_overviews_export.csv"
$runOverviews | Export-Csv -Path $csvPathRuns -NoTypeInformation -Encoding UTF8
Write-Host "✅ Run Overviews: $csvPathRuns" -ForegroundColor Green
Write-Host "   📊 Total runs: $($runOverviews.Count)" -ForegroundColor Gray
Write-Host ""

# FINAL SUMMARY
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 FINAL SUMMARY" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Database Statistics:" -ForegroundColor Yellow
Write-Host "   ├─ Total Rows in Table: ~140,940" -ForegroundColor Gray
Write-Host "   ├─ Unique Run IDs: $($runOverviews.Count)" -ForegroundColor Cyan
Write-Host "   ├─ Total Unique Symbols: $($sortedByPnl.Count)" -ForegroundColor Cyan
Write-Host "   └─ Strategy Overalls Table: $maxSymbolCount rows × $($allRunColumns.Count) cols" -ForegroundColor Cyan
Write-Host ""
Write-Host "🏆 Top Performers:" -ForegroundColor Yellow
if ($sortedByPnl.Count -gt 0) {
    Write-Host "   🥇 Best: $($sortedByPnl[0].Symbol) (Total PNL: +$([math]::Round($sortedByPnl[0].TotalPNL, 2)))" -ForegroundColor Green
}
if ($sortedByPnl.Count -gt 1) {
    Write-Host "   🥈 2nd: $($sortedByPnl[1].Symbol) (Total PNL: +$([math]::Round($sortedByPnl[1].TotalPNL, 2)))" -ForegroundColor Green
}
if ($sortedByPnl.Count -gt 2) {
    Write-Host "   🥉 3rd: $($sortedByPnl[2].Symbol) (Total PNL: +$([math]::Round($sortedByPnl[2].TotalPNL, 2)))" -ForegroundColor Green
}
Write-Host ""
Write-Host "📁 Exported Files:" -ForegroundColor Yellow
Write-Host "   ├─ $csvPathAggregated" -ForegroundColor Gray
Write-Host "   └─ $csvPathRuns" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ OPTIMAL QUERY STRATEGY COMPLETED!" -ForegroundColor Green
Write-Host "   ✓ Phase 1: Fetched all unique run_ids efficiently" -ForegroundColor Green
Write-Host "   ✓ Phase 2: Aggregated symbols per run_id (async style)" -ForegroundColor Green
Write-Host "   ✓ Ready for Strategy Overalls frontend display" -ForegroundColor Green
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
