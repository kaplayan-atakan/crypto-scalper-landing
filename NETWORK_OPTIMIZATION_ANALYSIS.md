# 🔍 Network Request Optimization Analysis

## 📋 Mevcut Durum (Sayfa İlk Yüklenişi)

### 1. Backtest Data Loading
**Service:** `backtestService.fetchAllRunColumns()`

#### İstekler:
```typescript
// 1. Run listesi al
GET /rest/v1/rpc/get_backtest_run_ids
Response: [{run_id, created_at, total_symbols, ...stats}, ...]

// 2. HER RUN İÇİN TEK TEK DETAY AL (N run varsa N istek!)
for each run:
  GET /rest/v1/rpc/get_backtest_details_by_runs?run_ids=[single_run_id]
  Response: [{symbol, winrate, pnl, ...}, ...]

// 3. Top 40 stats (tek seferde tüm run'lar için)
GET /rest/v1/rpc/get_top40_overall_by_runs?run_ids=[all_run_ids]
Response: [{run_id, top40_avg_pnl, ...}, ...]
```

**⚠️ PROBLEM #1: Sequential Loop in get_backtest_details**
- 5 run varsa: **1 + 5 + 1 = 7 istek**
- 10 run varsa: **1 + 10 + 1 = 12 istek**
- Loop içinde `for` kullanılıyor, paralel değil!

**🔧 ÇÖZÜLEBİLİR:**
```typescript
// ❌ MEVCUT (Sequential)
for (let i = 0; i < runs.length; i++) {
  await supabase.rpc('get_backtest_details_by_runs', { run_ids: [runId] })
}

// ✅ ÖNERİLEN (Batch tek seferde)
const { data } = await supabase.rpc('get_backtest_details_by_runs', {
  run_ids: runIds  // Tüm run_ids'leri tek seferde gönder
})
// Sonra frontend'de group by run_id yap
```

**ETKİ:** 10 run için **12 istek → 3 istek** (75% azalma!)

---

### 2. Notes Loading (HER RUN İÇİN DUPLICATE!)
**Services:** `notesService.getNotes()` + `notesService.getPinnedNote()`

#### İstekler (Her run için):
```typescript
// Component: PinnedNoteDisplay (her run için mount olur)
GET /rest/v1/run_notes?select=*&run_id=eq.XXX&is_pinned=eq.true&order=created_at.desc&limit=1

// Component: NoteButton (modal açıldığında)
GET /rest/v1/run_notes?select=*&run_id=eq.XXX&order=created_at.desc
```

**⚠️ PROBLEM #2: Duplicate Data**
- `getPinnedNote()`: Sadece pinli notu al (is_pinned=true filter)
- `getNotes()`: Tüm notları al (pinli dahil!)
- **İkinci istek birincinin verilerini ZATen içeriyor!**

**🔧 ÇÖZÜLEBİLİR:**
```typescript
// ❌ GEREKSIZ: getPinnedNote() fonksiyonunu kullan
const pinnedNote = await notesService.getPinnedNote(runId)

// ✅ ÖNERİLEN: getNotes() sonucundan filtrele
const notes = await notesService.getNotes(runId)
const pinnedNote = notes.find(n => n.is_pinned) || null
```

**ETKİ:** Her run için **2 istek → 1 istek** (50% azalma!)

---

### 3. PinnedNoteDisplay Her Run İçin Ayrı Çağrı
**Component:** `<PinnedNoteDisplay runId={run.run_id} />`

#### İstekler:
```typescript
// 5 run varsa, 5 ayrı istek!
GET /rest/v1/run_notes?...&run_id=eq.RUN_1&is_pinned=eq.true
GET /rest/v1/run_notes?...&run_id=eq.RUN_2&is_pinned=eq.true
GET /rest/v1/run_notes?...&run_id=eq.RUN_3&is_pinned=eq.true
GET /rest/v1/run_notes?...&run_id=eq.RUN_4&is_pinned=eq.true
GET /rest/v1/run_notes?...&run_id=eq.RUN_5&is_pinned=eq.true
```

**⚠️ PROBLEM #3: N+1 Query Problem**
- Her component kendi verisini çekiyor
- Parent'ta tek seferde çekip prop olarak gönderilebilir

**🔧 ÇÖZÜLEBİLİR:**
```typescript
// ❌ MEVCUT: Child component fetch ediyor
<PinnedNoteDisplay runId={run.run_id} />

// ✅ ÖNERİLEN: Parent'ta batch fetch, prop ile gönder
// Parent (StrategyOveralls):
const [pinnedNotes, setPinnedNotes] = useState<Map<string, RunNote>>()

useEffect(() => {
  // Tek istekle TÜM pinli notları al
  const notes = await supabase
    .from('run_notes')
    .select('*')
    .in('run_id', runIds)
    .eq('is_pinned', true)
  
  // Map'e çevir
  const map = new Map(notes.map(n => [n.run_id, n]))
  setPinnedNotes(map)
}, [columns])

// Child'a prop olarak gönder
<PinnedNoteDisplay note={pinnedNotes.get(run.run_id)} />
```

**ETKİ:** 10 run için **10 istek → 1 istek** (90% azalma!)

---

## 📊 TOPLAM ETKİ (10 Run Örneği)

### Mevcut Durum:
```
Backtest Data: 1 + 10 + 1 = 12 istek
Pinned Notes: 10 istek (her run için)
─────────────────────────────────────
TOPLAM: 22 istek
```

### Optimize Edilmiş:
```
Backtest Data: 1 + 1 + 1 = 3 istek (batch details)
Pinned Notes: 1 istek (batch tüm run'lar)
─────────────────────────────────────
TOPLAM: 4 istek
```

### 🎯 İYİLEŞTİRME: **22 → 4 istek (82% azalma!)**

---

## 🚀 ÖNCELİKLİ OPTİMİZASYONLAR

### Priority 1: Backtest Details Batch (En Büyük Etki)
**Dosya:** `src/services/backtestService.ts`
**Satır:** 37-85

```typescript
// ❌ SİL
for (let i = 0; i < runs.length; i++) {
  const { data: details } = await supabase.rpc('get_backtest_details_by_runs', {
    run_ids: [runId]  // Single run
  })
  grouped.set(runId, details)
}

// ✅ EKLE
const { data: allDetails } = await supabase.rpc('get_backtest_details_by_runs', {
  run_ids: runIds  // ALL runs at once
})

// Group by run_id in frontend
const grouped = new Map()
allDetails.forEach(detail => {
  if (!grouped.has(detail.run_id)) {
    grouped.set(detail.run_id, [])
  }
  grouped.get(detail.run_id).push(detail)
})
```

**Kazanım:** N run için N istek → 1 istek

---

### Priority 2: Remove getPinnedNote() (Medium Etki)
**Dosya:** `src/services/notesService.ts`
**Satır:** 83-110

```typescript
// ❌ SİL (Bu fonksiyon gereksiz!)
async getPinnedNote(runId: string): Promise<RunNote | null> {
  // ... 
}

// getNotes() zaten is_pinned field'ı dönüyor
// Frontend'de filter et!
```

**Dosya:** `src/components/PinnedNoteDisplay.tsx`
```typescript
// ❌ SİL
const note = await notesService.getPinnedNote(runId)

// ✅ EKLE
const notes = await notesService.getNotes(runId)
const pinnedNote = notes.find(n => n.is_pinned) || null
```

**Kazanım:** Ama daha iyisi Priority 3...

---

### Priority 3: Batch Pinned Notes (En İyi UX)
**Dosya:** `src/pages/StrategyOveralls.tsx` ve `StrategyOverallsHorizontal.tsx`

```typescript
// Parent component'te tek fetch
const [pinnedNotesMap, setPinnedNotesMap] = useState<Map<string, RunNote>>(new Map())

useEffect(() => {
  if (columns.length === 0) return
  
  const loadAllPinnedNotes = async () => {
    const runIds = columns.map(c => c.run_id)
    
    // ✅ Tek istekle TÜM pinli notları al
    const { data } = await supabase
      .from('run_notes')
      .select('*')
      .in('run_id', runIds)
      .eq('is_pinned', true)
    
    const map = new Map((data || []).map(n => [n.run_id, n]))
    setPinnedNotesMap(map)
  }
  
  loadAllPinnedNotes()
}, [columns])

// Child component'e prop gönder
<PinnedNoteDisplay 
  pinnedNote={pinnedNotesMap.get(col.run_id) || null} 
/>
```

**PinnedNoteDisplay değişimi:**
```typescript
// Artık fetch etmez, sadece prop alır
interface PinnedNoteDisplayProps {
  pinnedNote: RunNote | null  // prop olarak gelir
}

export function PinnedNoteDisplay({ pinnedNote }: PinnedNoteDisplayProps) {
  if (!pinnedNote) return null
  
  return (
    <div className="pinned-note-display">
      <div className="pinned-note-icon">📌</div>
      <div className="pinned-note-text">{pinnedNote.note}</div>
    </div>
  )
}
```

**Kazanım:** N run için N istek → 1 istek

---

## 📈 PERFORMANS BEKLENTİSİ

### 5 Run Senaryosu:
- **Önce:** 1 + 5 + 1 + 5 = **12 istek** (~600-1200ms)
- **Sonra:** 1 + 1 + 1 + 1 = **4 istek** (~200-400ms)
- **İyileşme:** 67% daha az istek, ~60% daha hızlı

### 20 Run Senaryosu:
- **Önce:** 1 + 20 + 1 + 20 = **42 istek** (~2100-4200ms)
- **Sonra:** 1 + 1 + 1 + 1 = **4 istek** (~200-400ms)
- **İyileşme:** 90% daha az istek, ~80% daha hızlı

---

## 🎯 IMPLEMENTATION ORDER

1. **İlk:** Priority 1 (Backtest Details Batch) → En büyük etki
2. **İkinci:** Priority 3 (Batch Pinned Notes) → N+1 problem çözümü
3. **Son:** Priority 2 (Remove getPinnedNote) → Cleanup

---

## ⚠️ DİKKAT EDİLECEKLER

1. **RPC Function Kontrolü:**
   - `get_backtest_details_by_runs` birden fazla run_id alıyor mu?
   - Test et: `run_ids: [id1, id2, id3]` ile çalışıyor mu?

2. **Cache Strategy:**
   - Pinned notes sık değişmez → Cache edilebilir
   - Event-driven refresh zaten var (notesPinChanged)

3. **Loading States:**
   - Batch fetch sırasında tüm run'lar için loading göster
   - Partial data yok, ya hepsi ya hiç

4. **Error Handling:**
   - Batch fail olursa ne olacak?
   - Fallback: Tek tek fetch'e dön (graceful degradation)

---

## 📝 SONUÇ

**Ana Sorunlar:**
1. ✗ Sequential loop (for await) → Batch RPC
2. ✗ Duplicate data fetch (getNotes + getPinnedNote) → Filter
3. ✗ N+1 query problem (her component ayrı fetch) → Parent batch

**Hedef:**
- 82% daha az network request
- 60-80% daha hızlı sayfa yükleme
- Daha az server load
- Daha iyi kullanıcı deneyimi

**Next Step:**
Hangi optimizasyonu önce uygulamak istersin?
1. Backtest Details Batch (En büyük etki)
2. Pinned Notes Batch (En kolay)
3. Her ikisi birden (Maksimum etki)
