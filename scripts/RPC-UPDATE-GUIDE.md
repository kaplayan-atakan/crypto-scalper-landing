# Supabase RPC Functions Update Guide

## 1️⃣ Supabase Dashboard'a Git
https://supabase.com/dashboard/project/jrdiedgyizhrkmrcaqns

## 2️⃣ SQL Editor'ı Aç
- Sol menüden "SQL Editor" tıkla
- "New query" butonuna bas

## 3️⃣ SQL Kodunu Yapıştır
`rpc-functions-fixed.sql` dosyasındaki kodu yapıştır ve "Run" tıkla

## 4️⃣ Test Et
PowerShell ile test et:
```powershell
cd scripts
.\test-rpc-functions.ps1
```

## ✅ Beklenen Sonuç
- Test 1: get_backtest_run_ids() → 3 run_id döner
- Test 2: get_backtest_details_by_runs([run_id]) → Symbol detayları döner
- Test 3: Batch test → Tüm run_id'ler için detaylar
- Total time: <3 saniye (çok hızlı!)

## 🔍 Değişiklik Özeti

### get_backtest_run_ids()
- ❌ LATERAL join (ambiguous error)
- ✅ Simple CTE (temiz ve hızlı)

### get_backtest_details_by_runs()
- ❌ ORDER BY pnl (alias ambiguity)
- ✅ ORDER BY AVG(br.sum_ret) (explicit)
- 🔧 PNL precision: 2 → 4 decimals

## 📊 Performans
- Önceki: REST API pagination = 315s
- ID-based: 12s (timeout risk var)
- **RPC: ~1-3s (BEST!)** 🚀
