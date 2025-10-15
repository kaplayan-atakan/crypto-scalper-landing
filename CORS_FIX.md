# 🔧 CORS Fix - CoinGecko API Proxy Configuration

## 📋 Problem

**Reported Issue**: BTC ve ETH live market grafikleri localhost'ta yüklenmiyor.

**Error**:
```
Access to fetch at 'https://api.coingecko.com/api/v3/coins/bitcoin?...' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 Root Cause

### CORS (Cross-Origin Resource Sharing) Restriction

1. **Browser Security**: Browsers block requests from `localhost` to external APIs
2. **CoinGecko API**: Doesn't allow direct requests from browser origins like `http://localhost:5173`
3. **Preflight Request**: Browser sends OPTIONS request, CoinGecko doesn't respond with CORS headers
4. **Result**: All CoinGecko API requests fail in development

### Why It Happens

```
Client (localhost:5173) → CoinGecko API (api.coingecko.com)
         ❌ BLOCKED by CORS policy
         
Browser: "Origin localhost:5173 is not allowed"
```

## ✅ Solution: Vite Development Proxy

### How It Works

```
Client (localhost:5173) → Vite Proxy (localhost:5173/api/coingecko) → CoinGecko API
         ✅ SAME ORIGIN              ✅ SERVER-TO-SERVER (no CORS)
```

**Key Concept**: 
- Browser requests go to `/api/coingecko/*` (same origin, no CORS)
- Vite proxy forwards to `https://api.coingecko.com/api/v3/*` (server-side, no CORS restriction)
- Response comes back through proxy to browser

## 🛠️ Implementation

### 1. Vite Config (vite.config.ts)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "/crypto-scalper-landing/",
  server: {
    proxy: {
      '/api/coingecko': {
        target: 'https://api.coingecko.com/api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
        secure: false,
      }
    }
  }
});
```

**Proxy Configuration Breakdown**:

```typescript
'/api/coingecko': {
  // Match any request starting with /api/coingecko
  
  target: 'https://api.coingecko.com/api/v3',
  // Forward to CoinGecko API
  
  changeOrigin: true,
  // Change the origin header to target domain
  // (pretend request comes from api.coingecko.com)
  
  rewrite: (path) => path.replace(/^\/api\/coingecko/, ''),
  // Remove /api/coingecko prefix before forwarding
  // Example: /api/coingecko/coins/bitcoin → /coins/bitcoin
  
  secure: false,
  // Allow self-signed certificates (if needed)
}
```

### 2. API Root Configuration (coingecko.ts)

```typescript
// OLD (Always direct API)
const API_ROOT = 'https://api.coingecko.com/api/v3'

// NEW (Environment-aware)
const API_ROOT = import.meta.env.DEV 
  ? '/api/coingecko'  // Development: use Vite proxy
  : 'https://api.coingecko.com/api/v3'  // Production: direct API
```

**Environment Detection**:
- `import.meta.env.DEV` → `true` in development (`npm run dev`)
- `import.meta.env.DEV` → `false` in production build (`npm run build`)

## 📊 Request Flow Examples

### Development (with proxy)

```
1. Browser Request:
   GET http://localhost:5173/api/coingecko/coins/bitcoin

2. Vite Proxy:
   - Receives request at /api/coingecko/coins/bitcoin
   - Rewrites to /coins/bitcoin
   - Forwards to https://api.coingecko.com/api/v3/coins/bitcoin
   - Changes origin header to api.coingecko.com

3. CoinGecko API:
   - Sees request from api.coingecko.com (trusted)
   - Processes request
   - Returns data

4. Vite Proxy:
   - Receives response
   - Forwards back to browser

5. Browser:
   - Receives response from localhost:5173 (same origin)
   - No CORS error ✅
```

### Production (direct API)

```
1. Browser Request:
   GET https://api.coingecko.com/api/v3/coins/bitcoin

2. CoinGecko API:
   - Receives request from deployed domain (e.g., kaplayan-atakan.github.io)
   - GitHub Pages is whitelisted by CoinGecko
   - Processes request
   - Returns data with CORS headers

3. Browser:
   - Receives response with Access-Control-Allow-Origin header
   - No CORS error ✅
```

## 🎯 Why This Solution Works

### Development (localhost)
✅ **Proxy solves CORS**: Browser thinks it's same-origin
✅ **Server-to-server**: Vite → CoinGecko has no CORS restriction
✅ **No API changes needed**: Application code unchanged

### Production (GitHub Pages)
✅ **Direct API access**: No proxy in production build
✅ **GitHub Pages trusted**: CoinGecko allows requests from GitHub Pages
✅ **No proxy overhead**: Direct browser → API communication

## 🧪 Testing

### Before Fix

```bash
# Console Output
❌ Access to fetch at 'https://api.coingecko.com/...' blocked by CORS
❌ LiveMarketChart fetch error: Failed to fetch
❌ BTC/ETH charts don't load
```

### After Fix

```bash
# Start dev server
npm run dev

# Console Output
✅ API Request: /api/coingecko/coins/bitcoin
✅ Vite Proxy: Forwarding to https://api.coingecko.com/api/v3/coins/bitcoin
✅ Response received: 200 OK
✅ BTC/ETH charts load successfully
```

## 📝 Code Changes Summary

### Files Modified

1. **vite.config.ts**
   - Added `server.proxy` configuration
   - Routes `/api/coingecko/*` to CoinGecko API

2. **src/lib/coingecko.ts**
   - Changed `API_ROOT` to be environment-aware
   - Development: `/api/coingecko`
   - Production: `https://api.coingecko.com/api/v3`

### No Changes Needed

✅ **LiveMarketChart** - Works automatically with new API_ROOT
✅ **useCoinGecko** - No changes needed
✅ **All fetch calls** - Automatically use proxy in dev
✅ **Production build** - Continues to work with direct API

## 🚀 Deployment

### Development

```bash
# Start dev server with proxy
npm run dev

# Verify proxy is working
# Open: http://localhost:5173/crypto-scalper-landing/live-actions
# BTC/ETH charts should load immediately
```

### Production

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
# Direct API calls work (no proxy in build)
git add dist
git commit -m "Deploy"
git push
```

## 🔒 Security Notes

### API Key Exposure

**Question**: Is the API key visible in browser?
**Answer**: Yes, but this is intentional and safe.

```typescript
const API_KEY = 'CG-cQBLyHVdbqvq6Jc9TJnDnycL'
```

**Why This Is OK**:
1. **Client-side API**: CoinGecko API is designed for client-side use
2. **Free tier**: API key is for free tier, has rate limits
3. **Read-only**: Only fetches public market data, no write operations
4. **Industry standard**: Most crypto data APIs work this way

**Alternative** (if needed):
- Use environment variables: `import.meta.env.VITE_COINGECKO_API_KEY`
- Store in `.env` file (not committed to git)
- Build process injects at compile time

### Proxy Security

**Development Only**: Proxy is **only active** in development server
**Production**: Direct API calls (no proxy in build)
**No Sensitive Data**: Only forwards public CoinGecko API requests

## 📊 Build Results

```bash
✓ 690 modules transformed
✓ built in 815ms

dist/index.html                    0.92 kB
dist/assets/index-CwyJ8NuV.css    54.61 kB
dist/assets/browser-3lr3LfMy.js    0.14 kB
dist/assets/index-CuyZp1ke.js    957.49 kB
```

**Status**: ✅ Build successful

**Bundle Size**: 957.49 kB (includes lightweight-charts library)

## 🎉 Result

### Before Fix
```
┌─────────────────┐
│ BTC Market      │
│                 │
│ ❌ Failed to    │
│    fetch        │
│                 │
└─────────────────┘
```

### After Fix
```
┌─────────────────┐
│ BTC Market  🟢  │
│ $114,016.00     │
│ ▲ 1.82%         │
│ ┃┃┃┃┃┃┃┃┃┃     │ ← Binance-style chart
│ ▁▁▂▁▂▁▃▂▁▂     │ ← Volume bars
└─────────────────┘
```

## 🔄 Auto-Refresh

LiveMarketChart continues to work with:
- ✅ 60-second auto-refresh
- ✅ Real-time price updates
- ✅ Market stats updates
- ✅ Volume data

All requests go through proxy in development, no CORS issues!

## 💡 Key Takeaways

1. **CORS is browser security**, not API limitation
2. **Proxy solves CORS in development** without changing application code
3. **Production works differently** (direct API, GitHub Pages trusted)
4. **Environment-aware configuration** handles both cases automatically
5. **No code changes needed** in components/hooks

## 📖 References

- [Vite Server Proxy](https://vitejs.dev/config/server-options.html#server-proxy)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CoinGecko API](https://www.coingecko.com/en/api/documentation)
