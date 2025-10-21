# NAORISUSDT Verification Script
# Run ID: 55bce7b0-6d7b-417c-9a72-054db267727d
# Purpose: Verify positive/negative PNL calculations

$ErrorActionPreference = "Stop"

# Supabase credentials
$SUPABASE_URL = "https://jrdiedgyizhrkmrcaqns.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZGllZGd5aXpocmttcmNhcW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTAwMDgsImV4cCI6MjA3Mzg4NjAwOH0.1ka5rFreRcNDI-YnltGzVcVy8dR6DUo2p9N8YX5sEmQ"

$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

$runId = "55bce7b0-6d7b-417c-9a72-054db267727d"
$symbol = "NAORISUSDT"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🔍 NAORISUSDT VERIFICATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run ID: $runId" -ForegroundColor Yellow
Write-Host "Symbol: $symbol" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 1: Fetch raw data from backtest_resultsv1
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📊 STEP 1: Fetching raw parameter sets" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

try {
    $query = "run_id=eq.$runId&symbol=eq.$symbol&select=run_id,symbol,len1,mult1,rr,winrate,sum_ret,mean_ret,trades,sharpe_like,max_dd"
    $uri = "$SUPABASE_URL/rest/v1/backtest_resultsv1?$query"
    
    $rawData = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
    
    Write-Host "✅ Found $($rawData.Count) parameter sets" -ForegroundColor Green
    Write-Host ""
    
    if ($rawData.Count -eq 0) {
        Write-Host "❌ No data found for NAORISUSDT in this run_id!" -ForegroundColor Red
        exit 1
    }
    
    # Display all parameter sets
    Write-Host "📋 All Parameter Sets:" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "Len1 | Mult1 | RR   | Winrate | Sum_Ret   | Mean_Ret  | Trades" -ForegroundColor White
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
    
    foreach ($row in $rawData) {
        $sumRetColor = if ($row.sum_ret -gt 0) { "Green" } else { "Red" }
        $meanRetColor = if ($row.mean_ret -gt 0) { "Green" } else { "Red" }
        
        Write-Host "$($row.len1.ToString().PadRight(4)) | $($row.mult1.ToString().PadRight(5)) | $($row.rr.ToString().PadRight(4)) | $($row.winrate.ToString('0.00').PadRight(7)) | " -NoNewline
        Write-Host "$($row.sum_ret.ToString('0.0000').PadRight(9)) " -NoNewline -ForegroundColor $sumRetColor
        Write-Host "| " -NoNewline
        Write-Host "$($row.mean_ret.ToString('0.0000').PadRight(9)) " -NoNewline -ForegroundColor $meanRetColor
        Write-Host "| $($row.trades)"
    }
    
    Write-Host ""
    
} catch {
    Write-Host "❌ Failed to fetch raw data!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 2: Calculate Manual Averages
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "🧮 STEP 2: Manual Calculations" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

# Overall Symbol PNL (average of all sum_ret)
$overallPNL = ($rawData | Measure-Object -Property sum_ret -Average).Average
Write-Host "📊 Overall Symbol PNL (Avg sum_ret): " -NoNewline
$overallColor = if ($overallPNL -gt 0) { "Green" } else { "Red" }
Write-Host "$($overallPNL.ToString('0.0000'))" -ForegroundColor $overallColor
Write-Host ""

# Overall Winrate
$overallWinrate = ($rawData | Measure-Object -Property winrate -Average).Average
Write-Host "🎯 Overall Winrate: $($overallWinrate.ToString('0.00%'))" -ForegroundColor Cyan
Write-Host ""

# Total trades across all parameter sets
$totalTrades = ($rawData | Measure-Object -Property trades -Sum).Sum
Write-Host "📈 Total Trades (all param sets): $totalTrades" -ForegroundColor Cyan
Write-Host ""

# Overall Mean_Ret (average of all mean_ret)
$overallMeanRet = ($rawData | Measure-Object -Property mean_ret -Average).Average
Write-Host "📊 Overall Mean_Ret (Avg mean_ret): $($overallMeanRet.ToString('0.0000'))" -ForegroundColor Cyan
Write-Host ""

Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# STEP 2.5: RECONSTRUCT INDIVIDUAL TRADES (Manual Calculation)
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "🔧 STEP 2.5: Reconstructing Individual Trades" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

Write-Host "🧮 Trade-by-Trade Reconstruction:" -ForegroundColor Cyan
Write-Host ""

$allTrades = @()

foreach ($paramSet in $rawData) {
    Write-Host "   Parameter Set: Len1=$($paramSet.len1), Mult1=$($paramSet.mult1), RR=$($paramSet.rr)" -ForegroundColor Yellow
    Write-Host "   ├─ Winrate: $($paramSet.winrate.ToString('0.00%'))" -ForegroundColor Gray
    Write-Host "   ├─ Total Trades: $($paramSet.trades)" -ForegroundColor Gray
    Write-Host "   ├─ Sum_Ret: $($paramSet.sum_ret.ToString('0.0000'))" -ForegroundColor Gray
    Write-Host "   └─ Mean_Ret: $($paramSet.mean_ret.ToString('0.0000'))" -ForegroundColor Gray
    
    # Calculate individual trades for this parameter set
    $winCount = [Math]::Round($paramSet.trades * $paramSet.winrate)
    $lossCount = $paramSet.trades - $winCount
    
    Write-Host "      ├─ Estimated Winning Trades: $winCount" -ForegroundColor Green
    Write-Host "      └─ Estimated Losing Trades: $lossCount" -ForegroundColor Red
    
    # Reconstruct PNL per trade type
    # We know: sum_ret = total PNL
    # We know: mean_ret = average PNL per trade
    # We know: trades = total trade count
    # We know: winrate = percentage of winning trades
    
    # For each parameter set, we can calculate:
    # sum_ret = win_count * avg_win + loss_count * avg_loss
    # mean_ret = sum_ret / trades
    
    # Using winrate to estimate:
    # If winrate > 0 and < 1, we can estimate avg_win and avg_loss
    
    if ($paramSet.winrate -gt 0 -and $paramSet.winrate -lt 1) {
        # Use mathematical approach
        if ($paramSet.mean_ret -gt 0) {
            $avgWinForParam = $paramSet.mean_ret / $paramSet.winrate
            $avgLossForParam = -1 * $paramSet.mean_ret * $paramSet.winrate / (1 - $paramSet.winrate)
        } elseif ($paramSet.mean_ret -lt 0) {
            $avgWinForParam = $paramSet.mean_ret * (1 - $paramSet.winrate) / $paramSet.winrate
            $avgLossForParam = $paramSet.mean_ret / (1 - $paramSet.winrate)
        } else {
            $avgWinForParam = 0
            $avgLossForParam = 0
        }
        
        Write-Host "      ├─ Estimated Avg Win: $($avgWinForParam.ToString('0.0000'))" -ForegroundColor Green
        Write-Host "      └─ Estimated Avg Loss: $($avgLossForParam.ToString('0.0000'))" -ForegroundColor Red
        
        # Create individual trade records
        for ($i = 0; $i -lt $winCount; $i++) {
            $allTrades += [PSCustomObject]@{
                Type = "Win"
                PNL = $avgWinForParam
                ParamSet = "Len1=$($paramSet.len1), Mult1=$($paramSet.mult1), RR=$($paramSet.rr)"
            }
        }
        
        for ($i = 0; $i -lt $lossCount; $i++) {
            $allTrades += [PSCustomObject]@{
                Type = "Loss"
                PNL = $avgLossForParam
                ParamSet = "Len1=$($paramSet.len1), Mult1=$($paramSet.mult1), RR=$($paramSet.rr)"
            }
        }
    } else {
        Write-Host "      └─ Cannot calculate (winrate boundary)" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "📊 Total Reconstructed Trades: $($allTrades.Count)" -ForegroundColor Cyan
Write-Host ""

# Calculate averages from reconstructed trades
$winningTrades = $allTrades | Where-Object { $_.Type -eq "Win" }
$losingTrades = $allTrades | Where-Object { $_.Type -eq "Loss" }

Write-Host "📈 Reconstructed Trade Statistics:" -ForegroundColor Yellow
Write-Host "   ├─ Total Winning Trades: $($winningTrades.Count)" -ForegroundColor Green
Write-Host "   └─ Total Losing Trades: $($losingTrades.Count)" -ForegroundColor Red
Write-Host ""

# ============================================================================
# LIST ALL WINNING TRADES
# ============================================================================

if ($winningTrades.Count -gt 0) {
    $manualAvgWin = ($winningTrades | Measure-Object -Property PNL -Average).Average
    $totalWinPNL = ($winningTrades | Measure-Object -Property PNL -Sum).Sum
    
    Write-Host "   ✓ Winning Trades Details:" -ForegroundColor Green
    Write-Host "   ├─ Count: $($winningTrades.Count)" -ForegroundColor Green
    Write-Host "   ├─ Total PNL: $($totalWinPNL.ToString('0.0000'))" -ForegroundColor Green
    Write-Host "   └─ Average PNL: $($manualAvgWin.ToString('0.0000'))" -ForegroundColor Green
    Write-Host ""
    
    # Show first 10 and last 10 winning trades
    $showCount = [Math]::Min(10, $winningTrades.Count)
    Write-Host "   📋 First $showCount Winning Trades:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $showCount; $i++) {
        $trade = $winningTrades[$i]
        Write-Host "      $($i+1). PNL: $($trade.PNL.ToString('0.0000')) | $($trade.ParamSet)" -ForegroundColor DarkGreen
    }
    
    if ($winningTrades.Count -gt 20) {
        Write-Host "      ..." -ForegroundColor Gray
        Write-Host "   📋 Last 10 Winning Trades:" -ForegroundColor Cyan
        for ($i = [Math]::Max(0, $winningTrades.Count - 10); $i -lt $winningTrades.Count; $i++) {
            $trade = $winningTrades[$i]
            Write-Host "      $($i+1). PNL: $($trade.PNL.ToString('0.0000')) | $($trade.ParamSet)" -ForegroundColor DarkGreen
        }
    } elseif ($winningTrades.Count -gt 10) {
        for ($i = $showCount; $i -lt $winningTrades.Count; $i++) {
            $trade = $winningTrades[$i]
            Write-Host "      $($i+1). PNL: $($trade.PNL.ToString('0.0000')) | $($trade.ParamSet)" -ForegroundColor DarkGreen
        }
    }
    
    Write-Host ""
    Write-Host "   🔍 Winning Trade Statistics:" -ForegroundColor Yellow
    Write-Host "      ├─ Min Win: $(($winningTrades | Measure-Object -Property PNL -Minimum).Minimum.ToString('0.0000'))" -ForegroundColor Gray
    Write-Host "      ├─ Max Win: $(($winningTrades | Measure-Object -Property PNL -Maximum).Maximum.ToString('0.0000'))" -ForegroundColor Gray
    Write-Host "      └─ Avg Win: $($manualAvgWin.ToString('0.0000'))" -ForegroundColor Gray
    Write-Host ""
} else {
    $manualAvgWin = $null
    Write-Host "   ✓ Manual Avg Win: N/A (no winning trades)" -ForegroundColor Gray
    Write-Host ""
}

# ============================================================================
# LIST ALL LOSING TRADES
# ============================================================================

if ($losingTrades.Count -gt 0) {
    $manualAvgLoss = ($losingTrades | Measure-Object -Property PNL -Average).Average
    $totalLossPNL = ($losingTrades | Measure-Object -Property PNL -Sum).Sum
    
    Write-Host "   ✗ Losing Trades Details:" -ForegroundColor Red
    Write-Host "   ├─ Count: $($losingTrades.Count)" -ForegroundColor Red
    Write-Host "   ├─ Total PNL: $($totalLossPNL.ToString('0.0000'))" -ForegroundColor Red
    Write-Host "   └─ Average PNL: $($manualAvgLoss.ToString('0.0000'))" -ForegroundColor Red
    Write-Host ""
    
    # Show first 10 and last 10 losing trades
    $showCount = [Math]::Min(10, $losingTrades.Count)
    Write-Host "   📋 First $showCount Losing Trades:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $showCount; $i++) {
        $trade = $losingTrades[$i]
        Write-Host "      $($i+1). PNL: $($trade.PNL.ToString('0.0000')) | $($trade.ParamSet)" -ForegroundColor DarkRed
    }
    
    if ($losingTrades.Count -gt 20) {
        Write-Host "      ..." -ForegroundColor Gray
        Write-Host "   📋 Last 10 Losing Trades:" -ForegroundColor Cyan
        for ($i = [Math]::Max(0, $losingTrades.Count - 10); $i -lt $losingTrades.Count; $i++) {
            $trade = $losingTrades[$i]
            Write-Host "      $($i+1). PNL: $($trade.PNL.ToString('0.0000')) | $($trade.ParamSet)" -ForegroundColor DarkRed
        }
    } elseif ($losingTrades.Count -gt 10) {
        for ($i = $showCount; $i -lt $losingTrades.Count; $i++) {
            $trade = $losingTrades[$i]
            Write-Host "      $($i+1). PNL: $($trade.PNL.ToString('0.0000')) | $($trade.ParamSet)" -ForegroundColor DarkRed
        }
    }
    
    Write-Host ""
    Write-Host "   🔍 Losing Trade Statistics:" -ForegroundColor Yellow
    Write-Host "      ├─ Min Loss: $(($losingTrades | Measure-Object -Property PNL -Minimum).Minimum.ToString('0.0000'))" -ForegroundColor Gray
    Write-Host "      ├─ Max Loss: $(($losingTrades | Measure-Object -Property PNL -Maximum).Maximum.ToString('0.0000'))" -ForegroundColor Gray
    Write-Host "      └─ Avg Loss: $($manualAvgLoss.ToString('0.0000'))" -ForegroundColor Gray
    Write-Host ""
} else {
    $manualAvgLoss = $null
    Write-Host "   ✗ Manual Avg Loss: N/A (no losing trades)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""

# Verify total PNL
$totalReconstructedPNL = ($allTrades | Measure-Object -Property PNL -Sum).Sum
Write-Host "🔍 Verification:" -ForegroundColor Yellow
Write-Host "   ├─ Original Total PNL (sum of sum_ret): $(($rawData | Measure-Object -Property sum_ret -Sum).Sum.ToString('0.0000'))" -ForegroundColor Cyan
Write-Host "   └─ Reconstructed Total PNL: $($totalReconstructedPNL.ToString('0.0000'))" -ForegroundColor Cyan

$pnlDiff = [Math]::Abs((($rawData | Measure-Object -Property sum_ret -Sum).Sum) - $totalReconstructedPNL)
if ($pnlDiff -lt 0.0001) {
    Write-Host "      ✅ PNL Match! (difference: $($pnlDiff.ToString('0.0000')))" -ForegroundColor Green
} else {
    Write-Host "      ⚠️  PNL Differs by: $($pnlDiff.ToString('0.0000'))" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# Separate positive and negative parameter sets (by sum_ret)
$positiveParams = $rawData | Where-Object { $_.sum_ret -gt 0 }
$negativeParams = $rawData | Where-Object { $_.sum_ret -lt 0 }
$zeroParams = $rawData | Where-Object { $_.sum_ret -eq 0 }

Write-Host "📊 Parameter Set Classification (by sum_ret):" -ForegroundColor Yellow
Write-Host "   ✓ Positive parameter sets: $($positiveParams.Count)" -ForegroundColor Green
Write-Host "   ✗ Negative parameter sets: $($negativeParams.Count)" -ForegroundColor Red
Write-Host "   = Zero parameter sets: $($zeroParams.Count)" -ForegroundColor Gray
Write-Host ""

# Calculate positive trades average (RPC logic)
if ($positiveParams.Count -gt 0) {
    $avgPnlPositive = ($positiveParams | Measure-Object -Property mean_ret -Average).Average
    Write-Host "✓ Positive Parameter Sets (sum_ret > 0):" -ForegroundColor Green
    Write-Host "   └─ Avg mean_ret: $($avgPnlPositive.ToString('0.0000'))" -ForegroundColor Green
    
    # Show each positive param
    foreach ($p in $positiveParams) {
        Write-Host "      • Len1=$($p.len1), Mult1=$($p.mult1), RR=$($p.rr): sum_ret=$($p.sum_ret.ToString('0.0000')), mean_ret=$($p.mean_ret.ToString('0.0000'))" -ForegroundColor DarkGreen
    }
} else {
    $avgPnlPositive = $null
    Write-Host "✓ Positive Parameter Sets: None (N/A)" -ForegroundColor Gray
}
Write-Host ""

# Calculate negative trades average (RPC logic)
if ($negativeParams.Count -gt 0) {
    $avgPnlNegative = ($negativeParams | Measure-Object -Property mean_ret -Average).Average
    Write-Host "✗ Negative Parameter Sets (sum_ret < 0):" -ForegroundColor Red
    Write-Host "   └─ Avg mean_ret: $($avgPnlNegative.ToString('0.0000'))" -ForegroundColor Red
    
    # Show each negative param
    foreach ($p in $negativeParams) {
        Write-Host "      • Len1=$($p.len1), Mult1=$($p.mult1), RR=$($p.rr): sum_ret=$($p.sum_ret.ToString('0.0000')), mean_ret=$($p.mean_ret.ToString('0.0000'))" -ForegroundColor DarkRed
    }
} else {
    $avgPnlNegative = $null
    Write-Host "✗ Negative Parameter Sets: None (N/A)" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# STEP 3: Mathematically Calculated Trade Averages (winrate based)
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "🧮 STEP 3: Mathematical Trade-Level Calculation" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

# Using the formula from RPC
if ($overallWinrate -gt 0 -and $overallWinrate -lt 1) {
    if ($overallMeanRet -gt 0) {
        $calculatedAvgWin = $overallMeanRet / $overallWinrate
        Write-Host "✓ Calculated Avg Win (mean_ret / winrate):" -ForegroundColor Green
        Write-Host "   = $($overallMeanRet.ToString('0.0000')) / $($overallWinrate.ToString('0.00'))" -ForegroundColor Gray
        Write-Host "   = $($calculatedAvgWin.ToString('0.0000'))" -ForegroundColor Green
    } else {
        $calculatedAvgWin = $overallMeanRet * (1 - $overallWinrate) / $overallWinrate
        Write-Host "✓ Calculated Avg Win (adjusted for negative mean_ret):" -ForegroundColor Green
        Write-Host "   = $($calculatedAvgWin.ToString('0.0000'))" -ForegroundColor Green
    }
} else {
    $calculatedAvgWin = $null
    Write-Host "✓ Calculated Avg Win: N/A (winrate boundary)" -ForegroundColor Gray
}
Write-Host ""

if ($overallWinrate -gt 0 -and $overallWinrate -lt 1) {
    if ($overallMeanRet -lt 0) {
        $calculatedAvgLoss = $overallMeanRet / (1 - $overallWinrate)
        Write-Host "✗ Calculated Avg Loss (mean_ret / (1 - winrate)):" -ForegroundColor Red
        Write-Host "   = $($overallMeanRet.ToString('0.0000')) / $((1 - $overallWinrate).ToString('0.00'))" -ForegroundColor Gray
        Write-Host "   = $($calculatedAvgLoss.ToString('0.0000'))" -ForegroundColor Red
    } else {
        $calculatedAvgLoss = -1 * $overallMeanRet * $overallWinrate / (1 - $overallWinrate)
        Write-Host "✗ Calculated Avg Loss (adjusted for positive mean_ret):" -ForegroundColor Red
        Write-Host "   = $($calculatedAvgLoss.ToString('0.0000'))" -ForegroundColor Red
    }
} else {
    $calculatedAvgLoss = $null
    Write-Host "✗ Calculated Avg Loss: N/A (winrate boundary)" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# STEP 4: Call RPC Function and Compare
# ============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "🔄 STEP 4: RPC Function Results" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""

try {
    $uri = "$SUPABASE_URL/rest/v1/rpc/get_backtest_details_by_runs"
    
    $body = @{
        run_ids = @($runId)
    } | ConvertTo-Json
    
    $rpcResult = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    
    $naorisData = $rpcResult | Where-Object { $_.symbol -eq $symbol }
    
    if ($naorisData) {
        Write-Host "✅ RPC Function returned:" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Symbol: $($naorisData.symbol)" -ForegroundColor Cyan
        Write-Host "   Winrate: $($naorisData.winrate.ToString('0.00%'))" -ForegroundColor Cyan
        Write-Host "   PNL: $($naorisData.pnl.ToString('0.0000'))" -ForegroundColor $(if ($naorisData.pnl -gt 0) { "Green" } else { "Red" })
        Write-Host "   Trades: $($naorisData.trades_count)" -ForegroundColor Cyan
        Write-Host "   Sharpe: $($naorisData.sharpe.ToString('0.00'))" -ForegroundColor Cyan
        Write-Host "   Max DD: $($naorisData.max_dd.ToString('0.00'))" -ForegroundColor Cyan
        Write-Host ""
        
        if ($null -ne $naorisData.avg_pnl_positive) {
            Write-Host "   ✓ Avg PNL Positive: $($naorisData.avg_pnl_positive.ToString('0.0000'))" -ForegroundColor Green
        } else {
            Write-Host "   ✓ Avg PNL Positive: N/A" -ForegroundColor Gray
        }
        
        if ($null -ne $naorisData.avg_pnl_negative) {
            Write-Host "   ✗ Avg PNL Negative: $($naorisData.avg_pnl_negative.ToString('0.0000'))" -ForegroundColor Red
        } else {
            Write-Host "   ✗ Avg PNL Negative: N/A" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ NAORISUSDT not found in RPC results!" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ RPC call failed!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# STEP 5: Comparison Summary
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📋 COMPARISON SUMMARY" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Method 1 - Parameter-based (OLD method):" -ForegroundColor White
Write-Host "   ✓ Positive params avg: $(if ($null -ne $avgPnlPositive) { $avgPnlPositive.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Green
Write-Host "   ✗ Negative params avg: $(if ($null -ne $avgPnlNegative) { $avgPnlNegative.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Red
Write-Host ""

Write-Host "Method 2 - Trade Reconstruction (MANUAL from all trades):" -ForegroundColor White
Write-Host "   ✓ Reconstructed win avg: $(if ($null -ne $manualAvgWin) { $manualAvgWin.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Green
Write-Host "   ✗ Reconstructed loss avg: $(if ($null -ne $manualAvgLoss) { $manualAvgLoss.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Red
Write-Host ""

Write-Host "Method 3 - Mathematical (Trade-based formula):" -ForegroundColor White
Write-Host "   ✓ Calculated win avg: $(if ($null -ne $calculatedAvgWin) { $calculatedAvgWin.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Green
Write-Host "   ✗ Calculated loss avg: $(if ($null -ne $calculatedAvgLoss) { $calculatedAvgLoss.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Red
Write-Host ""

if ($naorisData) {
    Write-Host "Method 4 - RPC Function Results:" -ForegroundColor White
    Write-Host "   ✓ RPC positive: $(if ($null -ne $naorisData.avg_pnl_positive) { $naorisData.avg_pnl_positive.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Green
    Write-Host "   ✗ RPC negative: $(if ($null -ne $naorisData.avg_pnl_negative) { $naorisData.avg_pnl_negative.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Red
    Write-Host ""
    
    # Verification between reconstructed and RPC
    $posMatchRecon = ($null -eq $manualAvgWin -and $null -eq $naorisData.avg_pnl_positive) -or 
                     ($null -ne $manualAvgWin -and $null -ne $naorisData.avg_pnl_positive -and 
                      [Math]::Abs($manualAvgWin - $naorisData.avg_pnl_positive) -lt 0.0001)
    
    $negMatchRecon = ($null -eq $manualAvgLoss -and $null -eq $naorisData.avg_pnl_negative) -or 
                     ($null -ne $manualAvgLoss -and $null -ne $naorisData.avg_pnl_negative -and 
                      [Math]::Abs($manualAvgLoss - $naorisData.avg_pnl_negative) -lt 0.0001)
    
    Write-Host "🔍 Verification (Manual Reconstruction vs RPC):" -ForegroundColor Yellow
    if ($posMatchRecon) {
        Write-Host "   ✅ Positive values MATCH!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Positive values DIFFER!" -ForegroundColor Red
        Write-Host "      Manual Reconstructed: $(if ($null -ne $manualAvgWin) { $manualAvgWin.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Gray
        Write-Host "      RPC: $(if ($null -ne $naorisData.avg_pnl_positive) { $naorisData.avg_pnl_positive.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Gray
        if ($null -ne $manualAvgWin -and $null -ne $naorisData.avg_pnl_positive) {
            $diff = [Math]::Abs($manualAvgWin - $naorisData.avg_pnl_positive)
            Write-Host "      Difference: $($diff.ToString('0.0000'))" -ForegroundColor Gray
        }
    }
    
    if ($negMatchRecon) {
        Write-Host "   ✅ Negative values MATCH!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Negative values DIFFER!" -ForegroundColor Red
        Write-Host "      Manual Reconstructed: $(if ($null -ne $manualAvgLoss) { $manualAvgLoss.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Gray
        Write-Host "      RPC: $(if ($null -ne $naorisData.avg_pnl_negative) { $naorisData.avg_pnl_negative.ToString('0.0000') } else { 'N/A' })" -ForegroundColor Gray
        if ($null -ne $manualAvgLoss -and $null -ne $naorisData.avg_pnl_negative) {
            $diff = [Math]::Abs($manualAvgLoss - $naorisData.avg_pnl_negative)
            Write-Host "      Difference: $($diff.ToString('0.0000'))" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Verification Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
