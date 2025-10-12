(async () => {
  const API_KEY = "CG-cQBLyHVdbqvq6Jc9TJnDnycL"; // <- buraya demo anahtarını koy
  const BASE = "https://api.coingecko.com/api/v3"; // demo base
  const HEADERS = { "x-cg-demo-api-key": API_KEY };

  // coinGecko coin id'leri
  const COINS = {
    btc: "bitcoin",
    eth: "ethereum"
  };

  // zaman aralığı (son 4 saat)
  const nowSec = Math.floor(Date.now() / 1000);
  const fourHoursSec = 4 * 3600;
  const from = nowSec - fourHoursSec;
  const to = nowSec;

  // yardımcı: fetch wrapper
  async function cgFetch(path, opts = {}) {
    const res = await fetch(`${BASE}${path}`, { headers: HEADERS, ...opts });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch(e){ body = text; }
    return { ok: res.ok, status: res.status, body, headers: res.headers };
  }

  // 1) vs_currency destek kontrolü (usdt kullanmak istersen)
  async function chooseVsCurrency(preferred = "usdt") {
    const { ok, body } = await cgFetch(`/simple/supported_vs_currencies`);
    if (!ok || !Array.isArray(body)) {
      // eğer destek listesini çekemediysek fallback 'usd'
      return "usd";
    }
    return body.includes(preferred) ? preferred : "usd";
  }

  // 2) coin market chart range (fiyat, market_cap, total_volume)
  async function fetchCoinRange(coinId, vsCurrency, fromSec, toSec) {
    const path = `/coins/${encodeURIComponent(coinId)}/market_chart/range?vs_currency=${encodeURIComponent(vsCurrency)}&from=${fromSec}&to=${toSec}`;
    return await cgFetch(path);
  }

  // 3) global market cap chart (günlük/saate göre) - PRO/paid olabilir
  async function fetchGlobalMarketCapChart(days = 1, vsCurrency = "usd") {
    const path = `/global/market_cap_chart?days=${encodeURIComponent(days)}&vs_currency=${encodeURIComponent(vsCurrency)}`;
    return await cgFetch(path);
  }

  // run
  const vs = await chooseVsCurrency("usdt");
  console.log("Seçilen vs_currency:", vs);

  // fetch BTC ve ETH market_chart/range
  const [btcRes, ethRes] = await Promise.all([
    fetchCoinRange(COINS.btc, vs, from, to),
    fetchCoinRange(COINS.eth, vs, from, to)
  ]);

  if (!btcRes.ok) {
    console.error("BTC verisi alınamadı:", btcRes.status, btcRes.body);
  }
  if (!ethRes.ok) {
    console.error("ETH verisi alınamadı:", ethRes.status, ethRes.body);
  }

  // CoinGecko market_chart/range formatı:
  // { prices: [[ts(ms), price], ...], market_caps: [[ts(ms), mc], ...], total_volumes: [[ts(ms), vol], ...] }
  function normalizeMarketChart(mcBody) {
    if (!mcBody || typeof mcBody !== 'object') return [];
    const prices = mcBody.prices || [];
    const mcs = mcBody.market_caps || [];
    const vols = mcBody.total_volumes || [];
    // index'leri(ts) karşılaştırıp birleştiriyoruz
    return prices.map(([ts, price]) => {
      // bul en yakın market_cap ve volume noktasını (aynı ts olmalı genelde)
      const mcPoint = mcs.find(p => p[0] === ts) || [ts, null];
      const volPoint = vols.find(p => p[0] === ts) || [ts, null];
      return {
        ts_ms: ts,
        ts_iso: new Date(ts).toISOString(),
        price,
        market_cap: mcPoint[1],
        total_volume: volPoint[1]
      };
    });
  }

  const btcData = btcRes.ok ? normalizeMarketChart(btcRes.body) : [];
  const ethData = ethRes.ok ? normalizeMarketChart(ethRes.body) : [];

  // BTC.D hesaplama: global/market_cap_chart kullanarak
  let btcDominanceSeries = null;
  const globalRes = await fetchGlobalMarketCapChart(1, vs); // days=1 => hourly granularity (en az 1 gün istenir)
  if (globalRes.ok && globalRes.body && globalRes.body.market_cap_chart && Array.isArray(globalRes.body.market_cap_chart.market_cap)) {
    const globalSeries = globalRes.body.market_cap_chart.market_cap; // [[ts(ms), market_cap], ...]
    // normalize: map ts->marketcap
    const globalMap = new Map(globalSeries.map(([ts, mc]) => [ts, mc]));
    // birleştir: btcData ts'lerine göre dominance hesapla
    btcDominanceSeries = btcData.map(point => {
      // global veride direkt ts yoksa en yakın ts'i bul (basit yaklaşım: exact match önce)
      let globalMc = globalMap.get(point.ts_ms);
      if (globalMc == null) {
        // en yakın ts bul (küçük dataset için O(n) kabul edilebilir)
        // globalSeries genelde saatlik; en yakın olanı seç
        let nearest = globalSeries.reduce((acc, cur) => {
          const dt = Math.abs(cur[0] - point.ts_ms);
          return (acc === null || dt < acc.dt) ? { ts: cur[0], mc: cur[1], dt } : acc;
        }, null);
        globalMc = nearest ? nearest.mc : null;
      }
      return {
        ts_ms: point.ts_ms,
        ts_iso: point.ts_iso,
        btc_market_cap: point.market_cap,
        global_market_cap: globalMc,
        dominance_pct: (point.market_cap && globalMc) ? (point.market_cap / globalMc * 100) : null
      };
    });
  } else {
    // global endpoint erişimi yok veya pro-only olabilir -> fallback uyarısı
    console.warn("global/market_cap_chart endpoint'ine erişilemedi veya izin yok. BTC.D (historical) hesaplanamadı. (Pro-only olabilir).", globalRes.status, globalRes.body);
    // Fallback: mevcut (anlık) BTC dominance almak için /global (current) denenebilir (ancak historical chart için yetersiz).
    const globalCurrent = await cgFetch(`/global`);
    if (globalCurrent.ok && globalCurrent.body && globalCurrent.body.data && globalCurrent.body.data.market_cap_percentage && typeof globalCurrent.body.data.market_cap_percentage.btc === 'number') {
      // sadece CURRENT BTC.D değeri
      btcDominanceSeries = [{ ts_ms: Date.now(), ts_iso: new Date().toISOString(), dominance_pct: globalCurrent.body.data.market_cap_percentage.btc }];
      console.info("Fallback: yalnızca CURRENT BTC.D değeri alındı (historical değil).");
    } else {
      console.info("Fallback olarak bile CURRENT global verisi alınamadı veya demo planda kısıtlı olabilir.");
    }
  }

  // Sonuç objesini hazırla
  const result = {
    requested_at: new Date().toISOString(),
    vs_currency: vs,
    range: { from_unix: from, to_unix: to, hours: 4 },
    coins: {
      btc: {
        id: COINS.btc,
        pair: `BTC/${vs.toUpperCase()}`,
        points: btcData
      },
      eth: {
        id: COINS.eth,
        pair: `ETH/${vs.toUpperCase()}`,
        points: ethData
      }
    },
    btc_d: btcDominanceSeries,
    notes: []
  };

  // ek notlar
  if (!globalRes.ok) {
    result.notes.push("global/market_cap_chart endpoint'i erişilemedi veya Pro-only. BTC.D (hourly historical) hesaplanamadı; fallback sağlandı (sadece current veya boş).");
    result._global_endpoint_status = { ok: globalRes.ok, status: globalRes.status, body: globalRes.body };
  }
  if (!btcRes.ok || !ethRes.ok) {
    result.notes.push("BTC veya ETH için market_chart/range isteğinde hata oluştu. status/response altındaki alanlara bakın.");
    result._coin_status = { btc: { ok: btcRes.ok, status: btcRes.status }, eth: { ok: ethRes.ok, status: ethRes.status } };
  }

  // Sonucu console'a yazdır ve JSON olarak kopyalanmaya hazır hale getir
  console.log("Sonuç (JSON):", result);
  // Eğer istersen tek satır JSON kopyalamak için:
  // copy(JSON.stringify(result));  // Chrome konsolda "copy" fonksiyonunu kullanabilirsin

  // return et (async IIFE için)
  return result;
})().then(res => {
  // isteğe bağlı: çıktı üstünde işlem yap
}).catch(err => {
  console.error("Beklenmeyen hata:", err);
});