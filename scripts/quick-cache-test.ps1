# Quick Cache Test - Simplified Version
# Tests: Load cache → Fetch only new data (timestamp-based) → Merge → Save

param(
    [int]$MaxPages = 5  # Only fetch first 5 pages for quick test
)

$SUPABASE_URL = "https://jmpydgjfnctpzomgrbnu.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscHlkZ2pmbmN0cHpvbWdyYm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTg5MTEsImV4cCI6MjA1MTk5NDkxMX0.aB-ByFTVMrZEo8JhgCJkIm_j6C3eWcN3KxCJ2Cf1Pjo"
$CACHE_FILE = "cache_test.json"

# ========================================
# 1. LOAD CACHE
# ========================================
function Load-Cache {
    if (Test-Path $CACHE_FILE) {
        Write-Host "`n✅ Cache file found! Loading..." -ForegroundColor Green
        $cache = Get-Content $CACHE_FILE -Raw | ConvertFrom-Json
        Write-Host "   📊 Last cached timestamp: $($cache.last_created_at)" -ForegroundColor Cyan
        Write-Host "   📊 Cached run_ids: $($cache.run_columns.Count)" -ForegroundColor Cyan
        return $cache
    } else {
        Write-Host "`n⚠️  No cache found. Starting fresh..." -ForegroundColor Yellow
        return $null
    }
}

# ========================================
# 2. FETCH DATA (with timestamp filter)
# ========================================
function Fetch-Data {
    param([string]$AfterTimestamp = $null)
    
    $allRows = @()
    $offset = 0
    $limit = 1000
    
    Write-Host "`n🔄 Fetching data..." -ForegroundColor Cyan
    
    for ($page = 1; $page -le $MaxPages; $page++) {
        $query = "select=run_id,created_at,symbol,winrate,sum_ret&limit=$limit&offset=$offset&order=created_at.asc"
        
        if ($AfterTimestamp) {
            $query += "&created_at=gt.$AfterTimestamp"
        }
        
        $url = "$SUPABASE_URL/rest/v1/backtest_resultsv1?$query"
        
        try {
            $response = Invoke-RestMethod -Uri $url -Headers @{
                "apikey" = $SUPABASE_KEY
                "Authorization" = "Bearer $SUPABASE_KEY"
            }
            
            if ($response.Count -eq 0) {
                Write-Host "   ✅ No more data. Stopping." -ForegroundColor Green
                break
            }
            
            $allRows += $response
            Write-Host "   [$page/$MaxPages] Fetched $($response.Count) rows (offset: $offset)" -ForegroundColor Gray
            $offset += $limit
            
        } catch {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
            break
        }
    }
    
    Write-Host "   ✅ Total rows fetched: $($allRows.Count)" -ForegroundColor Green
    return $allRows
}

# ========================================
# 3. AGGREGATE DATA
# ========================================
function Aggregate-Data {
    param([array]$RawData)
    
    Write-Host "`n📊 Aggregating data by run_id..." -ForegroundColor Cyan
    
    $runGroups = $RawData | Group-Object -Property run_id
    $runColumns = @()
    
    foreach ($group in $runGroups) {
        $runId = $group.Name
        $rows = $group.Group
        
        # Get max created_at for this run
        $maxCreatedAt = ($rows.created_at | Sort-Object -Descending)[0]
        
        # Group by symbol
        $symbolGroups = $rows | Group-Object -Property symbol
        $symbols = @()
        
        foreach ($symGroup in $symbolGroups) {
            $symbol = $symGroup.Name
            $trades = $symGroup.Group
            
            $avgWinrate = ($trades.winrate | Measure-Object -Average).Average
            $avgPnl = ($trades.sum_ret | Measure-Object -Average).Average
            
            $symbols += [PSCustomObject]@{
                symbol = $symbol
                avg_winrate = [math]::Round($avgWinrate, 4)
                avg_pnl = [math]::Round($avgPnl, 4)
            }
        }
        
        # Sort symbols by PNL
        $symbols = $symbols | Sort-Object -Property avg_pnl -Descending
        
        $runColumns += [PSCustomObject]@{
            run_id = $runId
            created_at = $maxCreatedAt
            symbols = $symbols
        }
        
        Write-Host "   ✅ Run: $($runId.Substring(0,8))... → $($symbols.Count) symbols" -ForegroundColor Gray
    }
    
    return $runColumns
}

# ========================================
# 4. MERGE CACHE + NEW DATA
# ========================================
function Merge-Data {
    param(
        [array]$CachedRunColumns,
        [array]$NewRunColumns
    )
    
    Write-Host "`n🔀 Merging cached + new data..." -ForegroundColor Cyan
    
    $merged = @{}
    
    # Add cached data first
    foreach ($run in $CachedRunColumns) {
        $merged[$run.run_id] = $run
    }
    
    # Update with new data (overwrite if exists)
    foreach ($run in $NewRunColumns) {
        $merged[$run.run_id] = $run
        Write-Host "   ✅ Updated run: $($run.run_id.Substring(0,8))..." -ForegroundColor Gray
    }
    
    Write-Host "   📊 Total runs after merge: $($merged.Count)" -ForegroundColor Green
    
    return $merged.Values
}

# ========================================
# 5. SAVE CACHE
# ========================================
function Save-Cache {
    param(
        [string]$LastCreatedAt,
        [array]$RunColumns
    )
    
    Write-Host "`n💾 Saving cache..." -ForegroundColor Cyan
    
    $cacheObj = [PSCustomObject]@{
        last_created_at = $LastCreatedAt
        run_columns = $RunColumns
    }
    
    $cacheObj | ConvertTo-Json -Depth 10 | Set-Content $CACHE_FILE -Encoding UTF8
    
    Write-Host "   ✅ Cache saved to: $CACHE_FILE" -ForegroundColor Green
    Write-Host "   📊 Last timestamp: $LastCreatedAt" -ForegroundColor Cyan
    Write-Host "   📊 Total runs: $($RunColumns.Count)" -ForegroundColor Cyan
}

# ========================================
# MAIN EXECUTION
# ========================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "🚀 QUICK CACHE TEST" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta

$startTime = Get-Date

# Step 1: Load cache
$cache = Load-Cache

# Step 2: Fetch data (incremental if cache exists)
if ($cache) {
    Write-Host "`n📌 Using incremental loading (after: $($cache.last_created_at))" -ForegroundColor Yellow
    $newRawData = Fetch-Data -AfterTimestamp $cache.last_created_at
} else {
    Write-Host "`n📌 No cache found. Fetching all data..." -ForegroundColor Yellow
    $newRawData = Fetch-Data
}

if ($newRawData.Count -eq 0) {
    Write-Host "`n✅ No new data to process. Cache is up-to-date!" -ForegroundColor Green
    exit
}

# Step 3: Aggregate new data
$newRunColumns = Aggregate-Data -RawData $newRawData

# Step 4: Merge with cache
if ($cache) {
    $finalRunColumns = Merge-Data -CachedRunColumns $cache.run_columns -NewRunColumns $newRunColumns
} else {
    $finalRunColumns = $newRunColumns
}

# Step 5: Find latest timestamp
$lastCreatedAt = ($newRawData.created_at | Sort-Object -Descending)[0]

# Step 6: Save cache
Save-Cache -LastCreatedAt $lastCreatedAt -RunColumns $finalRunColumns

# ========================================
# FINAL SUMMARY
# ========================================
$elapsed = (Get-Date) - $startTime
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "🎉 TEST COMPLETE!" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "   ⏱️  Elapsed time: $($elapsed.TotalSeconds.ToString('F2'))s" -ForegroundColor Cyan
Write-Host "   📊 New rows fetched: $($newRawData.Count)" -ForegroundColor Cyan
Write-Host "   📊 Total runs in cache: $($finalRunColumns.Count)" -ForegroundColor Cyan
Write-Host "   💾 Cache file: $CACHE_FILE" -ForegroundColor Cyan

# Display sample data
Write-Host "`n📋 SAMPLE RUN COLUMNS:" -ForegroundColor Yellow
$finalRunColumns | Select-Object -First 2 | ForEach-Object {
    Write-Host "`n   Run ID: $($_.run_id.Substring(0,8))..." -ForegroundColor Gray
    Write-Host "   Created: $($_.created_at)" -ForegroundColor Gray
    Write-Host "   Symbols: $($_.symbols.Count)" -ForegroundColor Gray
    $_.symbols | Select-Object -First 3 | ForEach-Object {
        Write-Host "      - $($_.symbol): WR=$($_.avg_winrate), PNL=$($_.avg_pnl)" -ForegroundColor DarkGray
    }
}

Write-Host "`n✅ Next step: Run script again to test incremental loading!" -ForegroundColor Green
