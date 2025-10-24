# 🧪 V2 Trade-Weighted Stats - Test Guide

## 📋 Hazırlık

1. **SQL'i Supabase'e deploy et:**
   ```bash
   # scripts/rpc-get-backtest-run-summary-v2.sql dosyasını Supabase SQL Editor'de çalıştır
   ```

2. **Development server başlat:**
   ```bash
   npm run dev
   ```

3. **Sayfayı aç:**
   ```
   http://localhost:5173/crypto-scalper-landing/
   Strategy Overalls sayfasına git
   ```

---

## 🔄 Test Adımları

### Test 1: V1 (Mevcut - Simple Average)

1. **Sayfa yüklendiğinde:**
   - Toggle: `⚪ V1 (Simple AVG)` görünmeli
   - Normal yükleme (mevcut davranış)

2. **Console'da kontrol et:**
   ```
   🔄 Fetching summary for run: 12345678...
   ✅ Got summary for run: 12345678
   ```
   *(V2 mesajı YOKSA V1 kullanılıyor)*

3. **Birkaç run'ın stats'larını not al:**
   - Overall Winrate
   - Avg PNL All
   - Avg PNL Positive
   - Avg PNL Negative

### Test 2: V2 (Yeni - Trade-Weighted)

1. **Toggle'ı aktif et:**
   - Sağ üstteki `⚪ V1 (Simple AVG)` butonuna tıkla
   - `✅ V2 (Trade-Weighted)` görünmeli
   - Sayfa otomatik reload olacak

2. **Console'da kontrol et:**
   ```
   🔄 [V2] Fetching trade-weighted summary for run: 12345678...
   ✅ [V2] Got trade-weighted summary for run: 12345678
   ```
   *`[V2]` mesajı görünüyorsa V2 aktif*

3. **Aynı run'ların stats'larını kontrol et:**
   - Overall Winrate → **Değişmeli** (trade-weighted)
   - Avg PNL All → **Değişmeli** (trade-weighted)
   - Avg PNL Positive → **Değişmeli**
   - Avg PNL Negative → **Değişmeli**

### Test 3: V1 vs V2 Karşılaştırma

**Beklenen Fark:**

| Metric | V1 (Simple AVG) | V2 (Trade-Weighted) | Neden Farklı? |
|--------|----------------|---------------------|---------------|
| **Overall Winrate** | Her symbol eşit ağırlık | Trade sayısıyla ağırlıklandırılmış | Çok trade'li symbol'ler daha fazla etki eder |
| **Avg PNL** | Symbol ortalamaları | Trade-weighted ortalama | Büyük trade'lerin etkisi daha fazla |

**Örnek Senaryo:**

```
Symbol A: 100 trade, 60% winrate, +10% PNL
Symbol B: 10 trade, 40% winrate, -5% PNL

V1 Overall Winrate = (60% + 40%) / 2 = 50%  ❌
V2 Overall Winrate = (60%*100 + 40%*10) / 110 = 58%  ✅

V1 Avg PNL = (10% + (-5%)) / 2 = 2.5%  ❌
V2 Avg PNL = (10%*100 + (-5%)*10) / 110 = 8.6%  ✅
```

**V2 daha doğru** çünkü trade hacimlerini dikkate alıyor!

---

## 🧪 Manuel Test Sorgusu

Sonuçları doğrulamak için PostgreSQL'de:

```sql
-- Belirli bir run_id için V1 vs V2 karşılaştırma
SELECT 'V1 Simple AVG' as version, * FROM get_backtest_run_summary('<run_id>')
UNION ALL
SELECT 'V2 Trade-Weighted' as version, * FROM get_backtest_run_summary_v2('<run_id>');
```

**Beklenen:**
- V2'nin overall_winrate ve avg_pnl değerleri trade hacimlerine göre daha gerçekçi olmalı
- Çok trade'li symbol'lerin etkisi daha fazla olmalı

---

## 📊 Hangi Durumlarda V2 Daha İyi?

### ✅ V2 Kullan (Trade-Weighted)

1. **Farklı trade hacimleri:** Symbol'ler arası trade sayısı çok farklıysa
2. **Gerçek performans:** Toplam PNL'e daha yakın sonuç istiyorsan
3. **Risk analizi:** Büyük pozisyonların etkisini görmek için
4. **Portfolio-level stats:** Tüm run'ın gerçek performansı

### ⚪ V1 Kullan (Simple Average)

1. **Symbol-level karşılaştırma:** Her symbol'ü eşit önemde görmek için
2. **Strateji değerlendirmesi:** Trade sayısından bağımsız symbol başarısı
3. **Diversification:** Kaç farklı symbol başarılı (trade sayısı önemsiz)

---

## 🔍 Debug: V2 Çalışmıyor mu?

### Sorun 1: Toggle görünmüyor
**Çözüm:** `src/pages/StrategyOveralls.tsx` doğru import edilmiş mi?
```typescript
import { fetchRunSummaryV2 } from '../services/backtestService'
```

### Sorun 2: RPC hatası (function does not exist)
**Çözüm:** SQL'i Supabase'de çalıştır:
```sql
-- scripts/rpc-get-backtest-run-summary-v2.sql
CREATE OR REPLACE FUNCTION get_backtest_run_summary_v2...
```

### Sorun 3: V1 ile aynı sonuçlar
**Çözüm:** Console'da `[V2]` mesajı var mı kontrol et:
```
🔄 [V2] Fetching trade-weighted summary...
```

Yoksa toggle çalışmıyor, sayfayı refresh et.

### Sorun 4: Reload sonrası toggle kapanıyor
**Normal:** Toggle state localStorage'da değil, her reload'da V1'e dönüyor.
İstersen localStorage ekleyebiliriz.

---

## 📈 Performans Karşılaştırması

| Metrik | V1 | V2 | Fark |
|--------|----|----|------|
| **RPC süresi** | ~50ms | ~50ms | Aynı (benzer query complexity) |
| **Doğruluk** | Symbol-level AVG | Trade-weighted AVG | V2 daha gerçekçi |
| **Use case** | Strateji analizi | Portfolio performansı | Farklı amaçlar |

---

## 🚀 Production'a Geçiş

### Eğer V2 daha iyi sonuçlar veriyorsa:

1. **RPC'yi değiştir:**
   ```sql
   -- V1'i rename et
   ALTER FUNCTION get_backtest_run_summary RENAME TO get_backtest_run_summary_v1_backup;
   
   -- V2'yi V1 ismiyle oluştur
   CREATE OR REPLACE FUNCTION get_backtest_run_summary(p_run_id uuid)
   RETURNS TABLE (...) AS $$
   -- V2 kodunu buraya kopyala
   $$;
   ```

2. **Frontend'de toggle'ı kaldır:**
   ```typescript
   // StrategyOveralls.tsx
   // const [useV2, setUseV2] = useState(false) // KALDIR
   // Toggle UI'ı KALDIR
   
   // Direkt V2 kullan
   const summary = await fetchRunSummaryV2(item.run_id)
   ```

3. **V1'i yedek olarak sakla:**
   - `get_backtest_run_summary_v1_backup` olarak SQL'de kalsın
   - Gerekirse geri dönebilirsin

### Eğer ikisini de tutmak istersen:

- Toggle'ı localStorage'a kaydet
- User preference olarak sakla
- UI'da "Advanced Stats" vs "Simple Stats" gibi seçenek sun

---

## 📝 Test Checklist

- [ ] SQL deploy edildi (Supabase SQL Editor)
- [ ] Dev server çalışıyor (`npm run dev`)
- [ ] Toggle görünüyor (sağ üst)
- [ ] V1 seçiliyken console'da `[V2]` YOK
- [ ] V2 seçiliyken console'da `[V2]` VAR
- [ ] V1 vs V2 stats'ları FARKLI
- [ ] Trade-weighted mantık doğru (büyük trade'ler daha fazla etki)
- [ ] Load More V2 ile çalışıyor
- [ ] Reload sonrası V1'e dönüyor (expected)
- [ ] Production deploy öncesi karar: V1 mi V2 mi?

---

## 🎯 Sonuç

**V2 Avantajları:**
- ✅ Trade hacimlerini dikkate alır (daha gerçekçi)
- ✅ Toplam PNL'e daha yakın sonuç
- ✅ Büyük pozisyonların etkisini gösterir
- ✅ Portfolio-level performans analizi için ideal

**V1 Avantajları:**
- ✅ Basit, anlaşılır (her symbol eşit)
- ✅ Strateji başarısını ölçer (trade sayısından bağımsız)
- ✅ Symbol diversification için iyi

**Öneri:** 
- Geliştirme sırasında ikisini de test et
- Gerçek veriyle karşılaştır
- Use case'e göre karar ver (portfolio vs strateji analizi)
- Production'da istersen toggle'ı kalıcı hale getir (localStorage)

---

**Test ortamı hazır! 🚀**
- V2 RPC'yi Supabase'de çalıştır
- Dev server açık (`http://localhost:5173`)
- Toggle ile V1/V2 arasında geçiş yap
- Console'da `[V2]` mesajlarını kontrol et
- Stats'ları karşılaştır!
