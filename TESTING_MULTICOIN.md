# Multi-Coin Dashboard - Testing Guide

## Quick Start Testing

### 1. Start Development Server
```powershell
npm run dev
```

### 2. Navigate to Live Actions
Open browser: `http://localhost:5173/live-actions`

## Expected Visual Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 Market Overview - Latest Trades        [123 total trades]    │
│  Real-time comparison of recent bot trades with 4-hour charts    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────┬────────────────────────────────┐
│  │ 🟧 Bitcoin (BTC)            │ 🟪 Ethereum (ETH)             │
│  │ BTCUSDT        +2.34%  3h   │ ETHUSDT       -1.12%  2h      │
│  │ ─────────────────────────── │ ────────────────────────────── │
│  │  Score: 0.85 | BREAKOUT     │  Score: 0.72 | TREND          │
│  │ ─────────────────────────── │ ────────────────────────────── │
│  │                             │                                │
│  │      📈 [4h Chart]          │      📈 [4h Chart]            │
│  │           🎯                │           🎯                   │
│  │                             │                                │
│  │ ─────────────────────────── │ ────────────────────────────── │
│  │ Score: 0.85  R1M: 1.23      │ Score: 0.72  R1M: 0.89        │
│  │ ATR5M: 0.0012               │ ATR5M: 0.0034                 │
│  │                             │                                │
│  │   Click for full details →  │   Click for full details →    │
│  └─────────────────────────────┴────────────────────────────────┘
│                                                                   │
│  ┌─────────────────────────────┬────────────────────────────────┐
│  │ 🔵 Latest Trade             │ 🟢 2nd Latest Trade           │
│  │ SOLUSDT        +5.67%  1h   │ ADAUSDT       +3.21%  45m     │
│  │ ─────────────────────────── │ ────────────────────────────── │
│  │  Score: 0.91 | MOMENTUM     │  Score: 0.78 | SUPPORT        │
│  │ ─────────────────────────── │ ────────────────────────────── │
│  │                             │                                │
│  │      📈 [4h Chart]          │      📈 [4h Chart]            │
│  │           🎯                │           🎯                   │
│  │                             │                                │
│  │ ─────────────────────────── │ ────────────────────────────── │
│  │ Score: 0.91  R1M: 2.45      │ Score: 0.78  R1M: 1.67        │
│  │ ATR5M: 0.0089               │ ATR5M: 0.0023                 │
│  │                             │                                │
│  │   Click for full details →  │   Click for full details →    │
│  └─────────────────────────────┴────────────────────────────────┘
│                                                                   │
│  💡 How it works: This section shows the 4 most recent trades... │
└──────────────────────────────────────────────────────────────────┘
```

## Test Scenarios

### Scenario 1: Normal Operation (All Trades Available)
**Setup**: Database has BTC, ETH, and other coin trades

**Expected Results**:
- ✅ Top-left shows latest BTCUSDT trade (orange border)
- ✅ Top-right shows latest ETHUSDT trade (purple border)
- ✅ Bottom-left shows most recent non-BTC/ETH trade (cyan)
- ✅ Bottom-right shows 2nd most recent non-BTC/ETH trade (green)
- ✅ All charts display 4-hour candle data
- ✅ Trade markers (🎯) appear at correct time
- ✅ PnL colors correct (green for positive, red for negative)

**Console Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TradeDetailPopup OPENED (x4 for mini charts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Coin cache HIT: bitcoin (instant load)
📦 Coin cache HIT: ethereum (instant load)
📦 Coin cache MISS: solana (fetching 7 days...)
⚠️ This is the ONLY API call for this coin (rate limit safe)
💾 Coin cache SET: solana
   ├─ Raw 5m candles: 2016
   ├─ Range: 2025-10-05 → 2025-10-12
   ├─ TTL: 172800000ms (48h)
   └─ Timeframes: 5m, 15m, 1m, 3m
```

### Scenario 2: Missing BTC Trade
**Setup**: Database has no BTCUSDT trades

**Expected Results**:
- ✅ Top-left shows empty state: "No trades yet" with 📊 icon
- ✅ Other 3 slots work normally
- ✅ No errors in console
- ✅ Section remains functional

### Scenario 3: Missing ETH Trade
**Setup**: Database has no ETHUSDT trades

**Expected Results**:
- ✅ Top-right shows empty state: "No trades yet" with 📊 icon
- ✅ Other 3 slots work normally

### Scenario 4: Only BTC and ETH Trades (No Other Coins)
**Setup**: Database only has BTCUSDT and ETHUSDT trades

**Expected Results**:
- ✅ Top row shows BTC and ETH
- ✅ Bottom row shows 2 empty states: "No trades yet"
- ✅ No JavaScript errors

### Scenario 5: Less Than 4 Total Trades
**Setup**: Database has only 2 trades (e.g., 1 BTC, 1 SOL)

**Expected Results**:
- ✅ BTC in top-left (orange)
- ✅ ETH in top-right (empty state)
- ✅ SOL in bottom-left (cyan)
- ✅ Bottom-right empty state (green border)

### Scenario 6: First Load (No Cache)
**Setup**: Clear localStorage before test

**Expected Results**:
- ✅ Loading spinners appear in all 4 slots
- ✅ Console shows "⚠️ Coin cache MISS" for each coin
- ✅ API calls execute (1 per unique coin)
- ✅ Charts render after data loads
- ✅ Data saved to localStorage

**Performance**:
- Initial load: 1-2 seconds (depends on API)
- Chart render: <100ms after data arrives

### Scenario 7: Subsequent Load (Cache Hit)
**Setup**: Reload page after Scenario 6

**Expected Results**:
- ✅ Console shows "📦 Coin cache HIT" for all coins
- ✅ No API calls made
- ✅ Charts appear instantly (<50ms)
- ✅ No loading spinners (or very brief)

**Performance**:
- Load time: <50ms (instant from cache)
- No network requests to CoinGecko

### Scenario 8: Click Mini Chart Card
**Setup**: Click any of the 4 mini charts

**Expected Results**:
- ✅ TradeDetailPopup opens with full trade details
- ✅ Full-size chart displays
- ✅ All trade metrics visible
- ✅ Timeframe selector works (1m/3m/5m/15m)
- ✅ ESC key closes popup

### Scenario 9: Responsive Mobile View
**Setup**: Resize browser to <1024px width

**Expected Results**:
- ✅ Grid changes from 2×2 to 1×1 (single column)
- ✅ Charts stack vertically
- ✅ All functionality remains
- ✅ Touch interactions work
- ✅ No horizontal scroll

### Scenario 10: Chart Data Error
**Setup**: Simulate CoinGecko API failure (disconnect network, then load)

**Expected Results**:
- ✅ Error state displays: ⚠️ "Chart unavailable"
- ✅ Trade info still displays (PnL, score, reason)
- ✅ No console errors thrown
- ✅ Other charts unaffected

## Console Commands for Testing

### Clear Cache (Force Fresh API Calls)
```javascript
// Run in browser console
localStorage.clear();
location.reload();
```

### Inspect Cache for Specific Coin
```javascript
// Check Bitcoin cache
const btcCache = localStorage.getItem('coin_data_bitcoin');
console.log(JSON.parse(btcCache));

// Check all coin caches
Object.keys(localStorage)
  .filter(key => key.startsWith('coin_data_'))
  .forEach(key => {
    const cache = JSON.parse(localStorage.getItem(key));
    console.log(`${key}:`, {
      candles: cache.rawOHLC.length,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      timeframes: Object.keys(cache.aggregated)
    });
  });
```

### Simulate Trade Data
```javascript
// If database is empty, check component handles empty states
// (No simulation needed - component designed for graceful degradation)
```

## Performance Benchmarks

### Expected Metrics
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Initial load (4 coins, no cache) | <2s | Network tab, CoinGecko API calls |
| Initial load (4 coins, cached) | <50ms | Console timestamps |
| Chart render time | <100ms | React DevTools Profiler |
| Canvas FPS | 60 FPS | Browser performance monitor |
| Bundle size impact | <50KB | Build output diff |
| Memory usage per chart | <1MB | Browser memory profiler |

### Measure in Browser
1. Open DevTools → Performance tab
2. Start recording
3. Navigate to Live Actions page
4. Stop recording after charts load
5. Look for:
   - `useCoinGecko` execution time
   - `SimpleCandlestickChart` canvas paint time
   - Layout shift (should be minimal)

## Common Issues & Solutions

### Issue 1: Charts Not Appearing
**Symptoms**: Empty slots or loading spinners forever

**Solutions**:
1. Check console for CoinGecko API errors
2. Verify `symbolToCoinGeckoId` mapping in `coingecko.ts`
3. Check trade timestamps are valid dates
4. Verify Supabase data has required fields

### Issue 2: Trade Markers Not Showing
**Symptoms**: 🎯 emoji missing from charts

**Solutions**:
1. Verify `tradeExecutionTime` prop is passed correctly
2. Check trade timestamp is within chart data range
3. Inspect `SimpleCandlestickChart` canvas rendering logic
4. Ensure `compactMode` is true (shows smaller marker)

### Issue 3: Wrong Trades in Slots
**Symptoms**: Latest trade not showing, or wrong coin in slot

**Solutions**:
1. Check `getLatestTradeBySymbol` sorting logic
2. Verify `created_at` timestamps are correct in database
3. Inspect `useMemo` dependencies in `MultiCoinChartSection`
4. Console.log filtered trades to debug

### Issue 4: Slow Performance
**Symptoms**: Charts lag, slow to render

**Solutions**:
1. Check cache hit rate (should be >90%)
2. Verify canvas rendering not re-running on every prop change
3. Use React DevTools Profiler to find re-render causes
4. Check for memory leaks (unmount should cleanup canvas)

### Issue 5: API Rate Limit Hit
**Symptoms**: 429 errors in console

**Solutions**:
1. Verify unified cache is working (check localStorage)
2. Ensure cache TTL is respected (2 days)
3. Check multiple components aren't fetching same coin
4. Clear cache and reload - should only fetch once per coin

## Automated Testing (Future)

### Unit Tests (Vitest)
```typescript
// tests/utils/tradeFilters.test.ts
describe('getLatestTradeBySymbol', () => {
  it('returns latest BTC trade', () => {
    const trades = [
      { symbol: 'BTCUSDT', created_at: '2025-10-12T10:00:00Z', ... },
      { symbol: 'BTCUSDT', created_at: '2025-10-12T12:00:00Z', ... },
    ];
    const result = getLatestTradeBySymbol(trades, 'BTCUSDT');
    expect(result.created_at).toBe('2025-10-12T12:00:00Z');
  });
});
```

### Integration Tests (Playwright)
```typescript
// e2e/multicoin-dashboard.spec.ts
test('displays 4 mini charts on Live Actions page', async ({ page }) => {
  await page.goto('/live-actions');
  await expect(page.locator('.mini-chart-container')).toHaveCount(4);
  await expect(page.getByText('Bitcoin (BTC)')).toBeVisible();
  await expect(page.getByText('Ethereum (ETH)')).toBeVisible();
});
```

## Manual Testing Checklist

- [ ] Initial load with empty cache shows loading states
- [ ] Charts render with correct data after load
- [ ] BTC trade appears in orange-bordered card
- [ ] ETH trade appears in purple-bordered card
- [ ] Other trades fill cyan and green cards
- [ ] Empty states display for missing trades
- [ ] Trade markers (🎯) appear at correct time on charts
- [ ] PnL displays correct color (green positive, red negative)
- [ ] Relative time updates correctly ("5m ago", "2h ago")
- [ ] Score and reason display correctly
- [ ] Quick stats (R1M, ATR5M) show correct values
- [ ] Hover effect works (scale + shadow)
- [ ] Click opens TradeDetailPopup with correct trade
- [ ] Mobile view shows single column layout
- [ ] Desktop view shows 2×2 grid
- [ ] Console shows cache HIT messages on reload
- [ ] No API calls on cached reload
- [ ] Cache persists across page reloads
- [ ] No TypeScript errors in console
- [ ] No React warnings in console
- [ ] No layout shift during load
- [ ] Canvas renders smoothly (no jank)

## Sign-Off

### Testing Completed By
- Name: ________________
- Date: ________________
- Browser(s): ________________
- Device(s): ________________

### Test Results
- [ ] All scenarios passed
- [ ] Performance meets targets
- [ ] No critical bugs found
- [ ] Ready for production

### Notes
_____________________________________________
_____________________________________________
_____________________________________________

## Support
For issues or questions, check:
1. `MULTICOIN_DASHBOARD.md` - Full implementation guide
2. Console logs - Look for cache HIT/MISS messages
3. React DevTools - Component props and state
4. Network tab - CoinGecko API calls
