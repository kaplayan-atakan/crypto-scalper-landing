# Cache Strategy Test - Incremental Loading with Timestamp
# Tests the new cache mechanism before implementing in frontend

$ErrorActionPreference = "Stop"

# Supabase credentials
$SUPABASE_URL = "https://jrdiedgyizhrkmrcaqns.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZGllZGd5aXpocmttcmNhcW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTAwMDgsImV4cCI6MjA3Mzg4NjAwOH0.1ka5rFreRcNDI-YnltGzVcVy8dR6DUo2p9N8YX5sEmQ"

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

# ============================================================================
# CACHE STRUCTURE
# ============================================================================

$CACHE_FILE = Join-Path $PSScriptRoot "cache_test.json"

function Load-Cache {
    if (Test-Path $CACHE_FILE) {
        $cache = Get-Content $CACHE_FILE -Raw | ConvertFrom-Json
        Write-Host "💾 Loaded cache: last_created_at = $($cache.last_created_at)" -ForegroundColor Cyan
        Write-Host "   Run columns: $($cache.run_columns.Count)" -ForegroundColor Gray
        return $cache
    }
    
    Write-Host "💾 No cache found, will fetch all data" -ForegroundColor Yellow
    return $null
}

function Save-Cache {
    param($cache)
    
    $cache | ConvertTo-Json -Depth 10 | Out-File $CACHE_FILE -Encoding UTF8
    Write-Host "💾 Cache saved: $($cache.run_columns.Count) run columns" -ForegroundColor Green
}

# ============================================================================
# FETCH WITH PAGINATION (1000 row limit)
# ============================================================================

function Fetch-IncrementalData {
    param(
        [string]$afterTimestamp = $null
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🔍 FETCHING DATA (Incremental)" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    if ($afterTimestamp) {
        Write-Host "📅 After timestamp: $afterTimestamp" -ForegroundColor Yellow
    } else {
        Write-Host "📅 Fetching ALL data (no cache)" -ForegroundColor Yellow
    }
    Write-Host ""
    
    $PAGE_SIZE = 1000
    $offset = 0
    $allData = @()
    $pageNumber = 1
    
    while ($true) {
        # Build query
        $query = "select=run_id,created_at,symbol,winrate,sum_ret&limit=$PAGE_SIZE&offset=$offset&order=created_at.asc"
        
        # Add timestamp filter if we have cached data
        if ($afterTimestamp) {
            $query += "&created_at=gt.$afterTimestamp"
        }
        
        $uri = "$SUPABASE_URL/rest/v1/backtest_resultsv1?$query"
        
        Write-Host "   [$pageNumber] Offset: $offset..." -NoNewline -ForegroundColor Gray
        
        try {
            $pageData = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
            
            if ($pageData.Count -eq 0) {
                Write-Host " ✅ No more data" -ForegroundColor Green
                break
            }
            
            $allData += $pageData
            Write-Host " ✅ Got $($pageData.Count) rows (Total: $($allData.Count))" -ForegroundColor Green
            
            # Safety check: if we got less than PAGE_SIZE, we're done
            if ($pageData.Count -lt $PAGE_SIZE) {
                Write-Host "   ✅ Reached end (last page had $($pageData.Count) rows)" -ForegroundColor Green
                break
            }
            
            $offset += $PAGE_SIZE
            $pageNumber++
            
        } catch {
            Write-Host " ❌ Error: $_" -ForegroundColor Red
            break
        }
    }
    
    Write-Host ""
    Write-Host "✅ Total rows fetched: $($allData.Count)" -ForegroundColor Green
    Write-Host ""
    
    return $allData
}

# ============================================================================
# AGGREGATE DATA BY RUN_ID AND SYMBOL
# ============================================================================

function Aggregate-Data {
    param($rawData)
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📊 AGGREGATING DATA" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    # Group by run_id first
    $runGroups = $rawData | Group-Object -Property run_id
    
    Write-Host "Found $($runGroups.Count) unique run_ids" -ForegroundColor Yellow
    Write-Host ""
    
    $runColumns = @()
    
    foreach ($runGroup in $runGroups) {
        $runId = $runGroup.Name
        $runData = $runGroup.Group
        
        Write-Host "🔹 Processing run_id: $($runId.Substring(0, 8))..." -ForegroundColor Cyan
        Write-Host "   Rows: $($runData.Count)" -ForegroundColor Gray
        
        # Get created_at (earliest)
        $createdAt = ($runData | Sort-Object -Property created_at | Select-Object -First 1).created_at
        
        # Group by symbol within this run
        $symbolGroups = $runData | Group-Object -Property symbol
        
        $symbols = @()
        foreach ($symbolGroup in $symbolGroups) {
            $symbolName = $symbolGroup.Name
            $symbolData = $symbolGroup.Group
            
            # Calculate averages
            $avgWinrate = ($symbolData | Measure-Object -Property winrate -Average).Average
            $avgPnl = ($symbolData | Measure-Object -Property sum_ret -Average).Average
            
            $symbols += [PSCustomObject]@{
                symbol = $symbolName
                avg_winrate = $avgWinrate
                avg_pnl = $avgPnl
                test_count = $symbolData.Count
            }
        }
        
        # Sort symbols by avg_pnl descending
        $symbols = $symbols | Sort-Object -Property avg_pnl -Descending
        
        Write-Host "   Symbols: $($symbols.Count) (top: $($symbols[0].symbol) = $([math]::Round($symbols[0].avg_pnl, 4)))" -ForegroundColor Green
        Write-Host ""
        
        $runColumns += [PSCustomObject]@{
            run_id = $runId
            created_at = $createdAt
            symbols = $symbols
        }
    }
    
    # Sort run_columns by created_at ascending (oldest first)
    $runColumns = $runColumns | Sort-Object -Property created_at
    
    Write-Host "✅ Aggregation complete: $($runColumns.Count) run columns" -ForegroundColor Green
    Write-Host ""
    
    return $runColumns
}

# ============================================================================
# MERGE NEW DATA WITH CACHED DATA
# ============================================================================

function Merge-CacheData {
    param(
        $existingCache,
        $newRunColumns
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🔄 MERGING CACHE DATA" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    if (!$existingCache) {
        Write-Host "No existing cache, using new data as cache" -ForegroundColor Yellow
        return $newRunColumns
    }
    
    $existingRunColumns = $existingCache.run_columns
    Write-Host "Existing run columns: $($existingRunColumns.Count)" -ForegroundColor Gray
    Write-Host "New run columns: $($newRunColumns.Count)" -ForegroundColor Gray
    Write-Host ""
    
    # Create a map of existing run_ids
    $existingMap = @{}
    foreach ($col in $existingRunColumns) {
        $existingMap[$col.run_id] = $col
    }
    
    $updatedCount = 0
    $addedCount = 0
    
    # Merge new data
    foreach ($newCol in $newRunColumns) {
        if ($existingMap.ContainsKey($newCol.run_id)) {
            # Update existing run_id (merge symbols)
            Write-Host "   🔄 Updating run_id: $($newCol.run_id.Substring(0, 8))..." -ForegroundColor Yellow
            $existingMap[$newCol.run_id] = $newCol
            $updatedCount++
        } else {
            # Add new run_id
            Write-Host "   ➕ Adding new run_id: $($newCol.run_id.Substring(0, 8))..." -ForegroundColor Green
            $existingMap[$newCol.run_id] = $newCol
            $addedCount++
        }
    }
    
    Write-Host ""
    Write-Host "✅ Merge complete:" -ForegroundColor Green
    Write-Host "   Updated: $updatedCount" -ForegroundColor Yellow
    Write-Host "   Added: $addedCount" -ForegroundColor Green
    Write-Host "   Total: $($existingMap.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    # Convert back to array and sort by created_at
    $mergedColumns = @($existingMap.Values) | Sort-Object -Property created_at
    
    return $mergedColumns
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 CACHE STRATEGY TEST" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Load cache
$cache = Load-Cache
Write-Host ""

# Step 2: Fetch incremental data
$afterTimestamp = $cache?.last_created_at
$newData = Fetch-IncrementalData -afterTimestamp $afterTimestamp

if ($newData.Count -eq 0) {
    Write-Host "✅ No new data, using cached data" -ForegroundColor Green
    $finalRunColumns = $cache.run_columns
} else {
    # Step 3: Aggregate new data
    $newRunColumns = Aggregate-Data -rawData $newData
    
    # Step 4: Merge with cache
    $finalRunColumns = Merge-CacheData -existingCache $cache -newRunColumns $newRunColumns
    
    # Step 5: Update last_created_at
    $lastCreatedAt = ($newData | Sort-Object -Property created_at -Descending | Select-Object -First 1).created_at
    
    # Step 6: Save cache
    $newCache = [PSCustomObject]@{
        last_created_at = $lastCreatedAt
        run_columns = $finalRunColumns
    }
    
    Save-Cache -cache $newCache
}

# ============================================================================
# DISPLAY RESULTS
# ============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 FINAL RESULTS" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Run Columns: $($finalRunColumns.Count)" -ForegroundColor Cyan
Write-Host ""

$colIdx = 1
foreach ($col in $finalRunColumns) {
    Write-Host "[$colIdx] Run ID: $($col.run_id.Substring(0, 8))..." -ForegroundColor Yellow
    Write-Host "    Created: $($col.created_at)" -ForegroundColor Gray
    Write-Host "    Symbols: $($col.symbols.Count)" -ForegroundColor Gray
    
    # Show top 3 symbols
    $topSymbols = $col.symbols | Select-Object -First 3
    foreach ($sym in $topSymbols) {
        $pnlColor = if ($sym.avg_pnl -gt 0) { "Green" } else { "Red" }
        $pnlSign = if ($sym.avg_pnl -gt 0) { "+" } else { "" }
        Write-Host "       • $($sym.symbol): WR=$([math]::Round($sym.avg_winrate * 100, 1))% | PNL=$pnlSign$([math]::Round($sym.avg_pnl, 4))" -ForegroundColor $pnlColor
    }
    
    Write-Host ""
    $colIdx++
}

Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ TEST COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run script again to test incremental loading (should be instant)" -ForegroundColor Gray
Write-Host "2. Check cache_test.json for stored data" -ForegroundColor Gray
Write-Host "3. Delete cache_test.json to test full reload" -ForegroundColor Gray
