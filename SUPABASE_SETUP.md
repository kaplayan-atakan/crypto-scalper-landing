# Supabase Integration Setup

## 📋 Genel Bakış
Bu proje Supabase ile entegre edilmiştir ve gerçek zamanlı (realtime) ticaret verilerini gösterebilir. Supabase yapılandırılmamışsa, otomatik olarak dummy data kullanır.

## 🚀 Kurulum Adımları

### 1. Supabase Projesi Oluştur
1. [Supabase Dashboard](https://app.supabase.com) adresine git
2. Yeni bir proje oluştur
3. Project Settings > API'den credentials'ları kopyala

### 2. Environment Variables
`.env.local` dosyasını düzenle:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Schema
Supabase SQL Editor'de aşağıdaki tabloyu oluştur:

```sql
-- Trades tablosu (Gerçek tablo yapısı)
CREATE TABLE closed_trades_simple (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  pnl DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  r1m DOUBLE PRECISION NOT NULL,
  atr5m DOUBLE PRECISION NOT NULL,
  z1m DOUBLE PRECISION NOT NULL,
  vshock DOUBLE PRECISION NOT NULL,
  upt DOUBLE PRECISION NOT NULL,
  trend DOUBLE PRECISION NOT NULL,
  volr DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_trades_project_id ON closed_trades_simple(project_id);
CREATE INDEX idx_trades_created_at ON closed_trades_simple(created_at DESC);
CREATE INDEX idx_trades_symbol ON closed_trades_simple(symbol);
CREATE INDEX idx_trades_pnl ON closed_trades_simple(pnl DESC);

-- RLS (Row Level Security) politikaları
ALTER TABLE closed_trades_simple ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" 
ON closed_trades_simple FOR SELECT 
USING (true);
```

### 4. Metrics Function (Opsiyonel)
Performans metrikleri için bir RPC function oluştur:

```sql
CREATE OR REPLACE FUNCTION get_trade_metrics(
  p_project_id TEXT,
  p_interval TEXT DEFAULT 'hourly'
)
RETURNS TABLE (
  total_trades INT,
  win_rate NUMERIC,
  avg_pnl NUMERIC,
  total_pnl NUMERIC,
  max_drawdown NUMERIC,
  sharpe_ratio NUMERIC,
  timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_trades,
    (COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate,
    AVG(pnl) as avg_pnl,
    SUM(pnl) as total_pnl,
    MIN(pnl) as max_drawdown,
    CASE 
      WHEN STDDEV(pnl) > 0 
      THEN AVG(pnl) / STDDEV(pnl)
      ELSE 0 
    END as sharpe_ratio,
    DATE_TRUNC(p_interval::TEXT, created_at) as timestamp
  FROM closed_trades_simple
  WHERE project_id = p_project_id
    AND created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY DATE_TRUNC(p_interval::TEXT, created_at)
  ORDER BY timestamp DESC;
END;
$$ LANGUAGE plpgsql;
```

### 5. Realtime Ayarları
1. Supabase Dashboard > Database > Replication
2. `closed_trades_simple` tablosunu realtime için aktif et
3. Insert, Update, Delete event'lerini enable et

## 📊 Kullanım

### Dummy Data Modu
Environment variables yoksa veya hatalıysa, uygulama otomatik olarak dummy data kullanır:
- 50 adet rastgele trade verisi
- 24 saatlik metrik verisi
- Realtime simülasyonu yok

### Canlı Veri Modu
Supabase doğru yapılandırıldığında:
- Gerçek zamanlı trade verileri
- Canlı performans metrikleri
- Realtime subscription ile otomatik güncelleme
- Toggle ile realtime açıp kapatabilme

## 🔧 Geliştirme

```bash
# Dependencies
npm install

# Dev server
npm run dev

# Build
npm run build
```

## 📁 Proje Yapısı

```
src/
├── lib/
│   └── supabase.ts          # Supabase client
├── types/
│   └── supabase.ts          # TypeScript definitions
├── services/
│   └── dataService.ts       # Data fetching logic
├── hooks/
│   └── useActions.ts        # React hook for data
├── components/
│   └── SupActionsChart.tsx  # Chart component
└── pages/
    └── LiveActions.tsx      # Main page
```

## 🎯 Target Project ID
Default project ID: `scalper_core_MOM_1DK_V9_BinanceV7_Live`

Farklı bir bot için `src/services/dataService.ts` içindeki `TARGET_PROJECT_ID` değişkenini değiştir.

## 📊 Tablo Yapısı

| # | Kolon | Tip | Açıklama |
|---|-------|-----|----------|
| 1 | id | String (UUID) | Trade benzersiz kimliği |
| 2 | project_id | String | Bot ID (örn: scalper_core_MOM_1DK_V3) |
| 3 | symbol | String | Trading çifti (örn: PUMPBTCUSDT) |
| 4 | pnl | Double | Kar/Zarar miktarı |
| 5 | reason | String | Trade açılma/kapanma nedeni |
| 6 | score | Double | Trade skor değeri |
| 7 | r1m | Double | 1 dakika momentum |
| 8 | atr5m | Double | 5 dakika ATR (volatilite) |
| 9 | z1m | Double | Z-score 1 dakika |
| 10 | vshock | Double | Volume şok göstergesi |
| 11 | upt | Double | Upturn göstergesi |
| 12 | trend | Double | Trend yönü |
| 13 | volr | Double | Volume oranı |
| 14 | created_at | DateTime | Kayıt oluşturma zamanı |

**Not:** Tabloda `bot_id` kolonu yok, sadece `project_id` var. Botları grouplarken `project_id` kullanılıyor! 🎯

## 🐛 Troubleshooting

### Veriler gelmiyor
1. `.env.local` dosyasını kontrol et
2. Supabase credentials'ları doğrula
3. Browser console'da hata loglarını kontrol et
4. Supabase Dashboard'da RLS politikalarını kontrol et

### Realtime çalışmıyor
1. Supabase Dashboard > Database > Replication kontrol et
2. Table'ın realtime için enabled olduğunu doğrula
3. Network tab'da websocket connection'ı kontrol et

### Type errors
```bash
npm install --save-dev @types/node
```

## 📚 Referanslar
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React Query + Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-react)
