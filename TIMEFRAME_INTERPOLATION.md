# Timeframe Resampling with Interpolation/Aggregation

## Problem
- CoinGecko API returns ~30-minute interval candles  
- User wants 1m/3m/5m/15m timeframe selector to show DIFFERENT candle granularities
- Can't split 30m candles into real 5m candles (data doesn't exist)

## Solution Implemented

### 1. Generate 5m Base Candles
From price points, create synthetic 5-minute candles:
- Linear interpolation between price points
- Add 0.1% variance for high/low realism

### 2. Smart Resampling
- **Upsampling** (5m → 1m or 3m): Use `interpolateCandles()` to split candles
- **Downsampling** (5m → 15m): Use `aggregateCandles()` to combine candles
- **No change** (5m → 5m): Return as-is

### 3. Functions Added

```typescript
interpolateCandles(candles, targetInterval)
// Splits larger candles into smaller ones
// E.g., 1 x 30m → 6 x 5m

aggregateCandles(candles, targetInterval)
// Combines smaller candles into larger ones
// E.g., 3 x 5m → 1 x 15m

resampleToTimeframe(candles, timeframe)
// Auto-detects if interpolation or aggregation needed
// Returns properly resampled candles
```

## Expected Results

For ~4 hour window:
- **1m**: ~240 candles (upsampled from 5m)
- **3m**: ~80 candles (upsampled from 5m)
- **5m**: ~48 candles (native)
- **15m**: ~16 candles (downsampled from 5m)

## Files Modified
- `src/hooks/useCoinGecko.ts`: Complete resampling system
- Removed `fetchOHLC` dependency
- Switched to `fetchMarketChartRange` for price data
- Generate synthetic 5m base candles
- Apply interpolation/aggregation dynamically

## Test
1. Open trade card → popup
2. Click 5m → see ~48 candles
3. Click 1m → see ~240 candles (much more!)
4. Click 15m → see ~16 candles (much fewer!)

Console will show: "🔀 Interpolated X → Y candles" or "📊 Aggregated X → Y candles"
