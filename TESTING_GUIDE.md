# 🧪 CoinGecko Integration - Testing Guide

## 🚀 Quick Start

### 1. Dev Server Running
✅ Server: http://localhost:5174/crypto-scalper-landing/  
✅ Status: Ready for testing

### 2. Navigate to Live Actions
- Open the app in browser
- Go to "Live Actions" page (should be the main page)
- Wait for trades to load from Supabase

---

## 🎯 Testing Scenarios

### Scenario 1: Basic Popup Test
**Steps:**
1. See the list of trades in the table
2. Hover over any trade row → Should highlight with cyan glow
3. Click on a trade row
4. ✅ Popup should appear with:
   - Trade symbol (e.g., BTCUSDT)
   - PnL percentage (colored green/red)
   - Score value
   - Trade timestamp
   - Chart controls (Candlestick/Line toggle)
   - Refresh button

**Expected:**
- Popup opens smoothly (slideUp animation)
- Background blurs (glassmorphism effect)
- Trade info displays correctly

### Scenario 2: Chart Loading
**Steps:**
1. Open popup (click trade row)
2. Wait for chart to load

**Expected:**
- ⏳ Loading spinner appears with "Loading chart data..."
- 🔄 Console logs: "Fetching OHLC data for BTCUSDT (bitcoin)..."
- ✅ Console logs: "OHLC data fetched: X points"
- 📊 Chart renders with candlesticks
- ⚡ Red vertical line marks trade time ("⚡ Trade" label)
- X-axis shows time in HH:MM format
- Y-axis shows prices in $X.XX format

**Timing:**
- First load: ~1-2 seconds (API call)
- Cached load: <100ms instant

### Scenario 3: Chart Mode Toggle
**Steps:**
1. Open popup with chart loaded
2. Click "📈 Line Chart" button

**Expected:**
- Chart switches from candlestick to line chart
- Console logs: "Fetching line chart data..."
- Trade marker still visible
- Smooth transition

**Then:**
3. Click "📊 Candlestick" button

**Expected:**
- Chart switches back to OHLC
- Console logs show fetching OHLC again

### Scenario 4: Cache Testing
**Steps:**
1. Click trade row #1 → Chart loads (API call)
2. Close popup (ESC or overlay click)
3. Click same trade row #1 again within 30 seconds

**Expected:**
- Console logs: "📦 Cache HIT for key: bitcoin_..."
- Chart appears INSTANTLY (no loading)
- No new API call

**Then:**
4. Wait 31+ seconds
5. Click same trade row #1 again

**Expected:**
- Cache expired
- Console logs: New API fetch
- Chart loads with ~1-2s delay

### Scenario 5: Close Popup Tests
**Methods to close:**
1. **ESC Key**: Press ESC → Popup closes
2. **Overlay Click**: Click dark area outside popup → Popup closes
3. **Close Button**: Click ✕ button top-right → Popup closes

**Expected:**
- Smooth fadeOut animation
- Body scroll re-enabled
- selectedTrade state cleared

### Scenario 6: Multiple Trades
**Steps:**
1. Click trade row #1 (BTCUSDT) → Opens popup
2. Close popup
3. Click trade row #2 (ETHUSDT) → Opens new popup

**Expected:**
- Each trade shows correct symbol chart
- Each chart has correct time window (±5 min)
- Trade markers at correct positions
- Different cache keys for different symbols

### Scenario 7: Unsupported Symbol
**Steps:**
1. If there's a trade with unsupported symbol (not in mapping)
2. Click that trade row

**Expected:**
- Popup opens
- Error message: "Desteklenmeyen sembol: XXX"
- Retry button available
- No chart shown

### Scenario 8: Rate Limiting
**Steps:**
1. Quickly click 5 different trade rows (rapid fire)

**Expected:**
- First 3 requests: Process immediately
- Requests 4-5: Queued (console shows queue status)
- All popups eventually load
- No 429 errors

### Scenario 9: Refresh Button
**Steps:**
1. Open popup with chart
2. Click "🔄 Refresh" button

**Expected:**
- Button shows ⏳ (loading state)
- Button disabled during fetch
- Chart re-fetches from API (bypasses cache)
- Console logs new fetch
- Chart updates with fresh data

### Scenario 10: Hover Effects
**Steps:**
1. Hover over trade rows (don't click)

**Expected:**
- Row highlights with cyan border
- Row translates right with scale
- Box shadow appears
- Cursor changes to pointer
- Title tooltip shows "Click to view CoinGecko chart"

---

## 📊 Console Monitoring

### Expected Console Logs

**Cache Hit:**
```
📦 Cache HIT for key: bitcoin_1234567890_1234568190_ohlc
```

**Cache Set:**
```
💾 Cache SET for key: bitcoin_1234567890_1234568190_ohlc (TTL: 30000ms)
```

**API Fetch (OHLC):**
```
🔄 Fetching OHLC data for BTCUSDT (bitcoin)...
✅ OHLC data fetched: 10 points
```

**API Fetch (Line):**
```
🔄 Fetching line chart data for BTCUSDT (bitcoin)...
✅ Line chart data fetched: 30 points
```

**Error:**
```
❌ CoinGecko fetch error: Error: Desteklenmeyen sembol: XXXUSDT
```

**Cache Cleanup:**
```
🧹 Cleared 3 old cache entries
```

---

## 🐛 Debugging Checklist

### If Popup Doesn't Open:
- [ ] Check console for errors
- [ ] Verify trades are loaded (not empty array)
- [ ] Check onClick handler in LiveActions.tsx
- [ ] Verify TradeDetailPopup import

### If Chart Shows Empty State:
- [ ] Check if symbol is mapped in SYMBOL_TO_COINGECKO_ID
- [ ] Verify time window calculation (±5 min)
- [ ] Check CoinGecko API response in Network tab
- [ ] Look for console errors

### If Chart Loading Forever:
- [ ] Check Network tab for failed requests
- [ ] Verify .env has VITE_COINGECKO_ROOT
- [ ] Check rate limiting (console logs)
- [ ] Try refresh button

### If Cache Not Working:
- [ ] Check localStorage in DevTools
- [ ] Look for "cg_cache_" keys
- [ ] Verify TTL is 30000ms (30s)
- [ ] Check console for cache logs

---

## 🔍 Network Tab Inspection

### CoinGecko API Calls

**OHLC Endpoint:**
```
GET https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=1
```

**Market Chart Range Endpoint:**
```
GET https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=1234567890&to=1234568190
```

**Headers:**
- If API key set: `x-cg-demo-api-key: YOUR_KEY`
- Content-Type: application/json

**Response:**
- OHLC: `[[timestamp, open, high, low, close], ...]`
- Market Chart: `{ prices: [[timestamp, price], ...] }`

---

## 📱 Mobile Testing (Optional)

### Responsive Breakpoints
- Desktop: Full popup (900px max-width)
- Tablet: Adjusted grid (768px breakpoint)
- Mobile: Single column layout

### Test on Mobile:
1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Select iPhone 12 Pro or similar
3. Test all scenarios above
4. Check:
   - [ ] Popup fits screen
   - [ ] Chart is readable
   - [ ] Buttons are tappable
   - [ ] Close overlay works
   - [ ] Scroll works properly

---

## ✅ Success Criteria

### Must Pass:
- [x] Popup opens on trade row click
- [x] Chart loads within 2 seconds (first load)
- [x] Cache works (instant second load)
- [x] Chart shows ±5 minute window
- [x] Trade time marker visible
- [x] Mode toggle (candlestick ↔ line) works
- [x] ESC/overlay/button closes popup
- [x] No TypeScript errors
- [x] No console errors (except expected API errors)

### Nice to Have:
- [x] Hover effects smooth
- [x] Animations play correctly
- [x] Rate limiting prevents overload
- [x] Cache cleanup works
- [x] Tooltips show correctly

---

## 🎯 Test Data

### Supported Symbols (Should Work):
- BTCUSDT → bitcoin
- ETHUSDT → ethereum
- SOLUSDT → solana
- AVAXUSDT → avalanche-2
- MATICUSDT → matic-network
- BNBUSDT → binancecoin
- ADAUSDT → cardano
- DOTUSDT → polkadot
- LINKUSDT → chainlink
- UNIUSDT → uniswap

### Unsupported Symbols (Should Show Error):
- Any other trading pair not in mapping

---

## 📸 Visual Verification

### Popup Appearance:
- ✅ Glassmorphism effect (blurred backdrop)
- ✅ Cyan/magenta border glow
- ✅ Dark background (rgba(10, 10, 25, 0.95))
- ✅ Smooth animations (slideUp, fadeIn)
- ✅ Proper spacing and alignment

### Chart Appearance:
- ✅ Cyan gridlines (rgba(0, 255, 255, 0.1))
- ✅ Cyan axis labels
- ✅ Red trade marker (dashed line)
- ✅ ⚡ Trade label visible
- ✅ Tooltip on hover (glassmorphism)
- ✅ CoinGecko attribution footer

### Button States:
- ✅ Active mode button highlighted
- ✅ Hover effects on buttons
- ✅ Disabled state for refresh (when loading)
- ✅ Close button rotates on hover

---

## 🚨 Known Issues to Watch For

1. **CoinGecko Rate Limit**: If testing too fast, may hit API limits (429)
   - **Solution**: Wait a minute or use cached requests

2. **CORS Errors**: Should not happen (CoinGecko allows cross-origin)
   - **If occurs**: Check browser console, may need proxy

3. **Missing Data**: Some coins may not have 1-minute granularity
   - **Expected**: Shows empty state message

4. **Time Zone Issues**: Charts show local time (HH:MM)
   - **Expected**: Times should match trade timestamp ±5 min

---

## 📝 Test Report Template

```
Date: [DATE]
Tester: [YOUR NAME]
Environment: [BROWSER, OS]

✅ Popup Opens: PASS / FAIL
✅ Chart Loads: PASS / FAIL
✅ Cache Works: PASS / FAIL
✅ Mode Toggle: PASS / FAIL
✅ Close Methods: PASS / FAIL
✅ Hover Effects: PASS / FAIL
✅ Rate Limiting: PASS / FAIL
✅ Error Handling: PASS / FAIL

Notes:
[Any observations, bugs, or improvements]

Console Errors:
[List any unexpected errors]

Performance:
- First Load: [X]ms
- Cached Load: [X]ms
```

---

## 🎉 Final Checklist

Before marking complete:
- [ ] All scenarios tested
- [ ] No blocking bugs
- [ ] Performance acceptable (<2s first load)
- [ ] Cache working (instant on reopen)
- [ ] Mobile responsive
- [ ] Animations smooth
- [ ] Console logs clean (no errors)
- [ ] Documentation reviewed

---

**🚀 Happy Testing!** 🎊

If everything passes, the CoinGecko integration is production-ready! 🔥
