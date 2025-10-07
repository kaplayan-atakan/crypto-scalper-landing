import "./App.css";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

type CurveDatum = { label: string; live: number; sim: number };
type StrategyDatum = { label: string; score: number };
type RiskDatum = { label: string; marj: number; tavan: number };

// Dummy veri: Kümülatif getiri eğrisi
const equityCurve: CurveDatum[] = [
  { label: "Jan", live: 0, sim: 0 },
  { label: "Feb", live: 12, sim: 10 },
  { label: "Mar", live: 18, sim: 22 },
  { label: "Apr", live: 29, sim: 27 },
  { label: "May", live: 35, sim: 33 },
  { label: "Jun", live: 41, sim: 44 },
  { label: "Jul", live: 50, sim: 52 },
  { label: "Aug", live: 62, sim: 58 },
  { label: "Sep", live: 68, sim: 65 },
  { label: "Oct", live: 77, sim: 74 },
];

// Dummy veri: Strateji karışımı (yüzde)
const strategyBlend: StrategyDatum[] = [
  { label: "Trend", score: 38 },
  { label: "Breakout", score: 27 },
  { label: "Mean Rev", score: 21 },
  { label: "Correlation", score: 14 },
];

// Dummy veri: Risk profili (marj kullanımı vs tavan)
const exposureProfile: RiskDatum[] = [
  { label: "09:00", marj: 5, tavan: 12 },
  { label: "11:00", marj: 8, tavan: 12 },
  { label: "13:00", marj: 11, tavan: 12 },
  { label: "15:00", marj: 9, tavan: 12 },
  { label: "17:00", marj: 7, tavan: 12 },
  { label: "19:00", marj: 6, tavan: 12 },
  { label: "21:00", marj: 8, tavan: 12 },
  { label: "23:00", marj: 4, tavan: 12 },
];

// Dummy veri: Karar skorları (signal evaluation)
const decisionScore: CurveDatum[] = [
  { label: "T-5m", live: 0.2, sim: 0.18 },
  { label: "T-4m", live: 0.35, sim: 0.38 },
  { label: "T-3m", live: 0.52, sim: 0.48 },
  { label: "T-2m", live: 0.68, sim: 0.71 },
  { label: "T-1m", live: 0.74, sim: 0.72 },
  { label: "T", live: 0.81, sim: 0.79 },
];

// Custom Tooltip bileşeni
function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      {payload.map((p, idx) => (
        <div key={idx} style={{ color: p.color }}>
          <strong>{p.name}:</strong> {p.value}
        </div>
      ))}
    </div>
  );
}

function App() {
  return (
    <div className="page">
      <header className="page__header">
        <div className="page__halo" aria-hidden="true" />
        <div className="header__badge">
          <span className="badge__dot"></span>
          <span className="badge__text">LIVE + SIM Tracking</span>
        </div>
        <h1 className="header__title">
          <span className="title__main">Kripto Scalper</span>
          <span className="title__separator">•</span>
          <span className="title__sub">Akıllı ve Disiplinli İşlem Motoru</span>
        </h1>
        <p className="page__subtitle">
          Yüksek frekanslı tarama, piyasa genişliği onayı ve çok katmanlı risk kontrolü ile kaliteli işlemler üretir.
          <span className="subtitle__accent">Gerçek verilerle şeffaf, duygusuz ve ölçülebilir.</span>
        </p>
        <div className="header__stats">
          <div className="stat">
            <span className="stat__value">4</span>
            <span className="stat__label">Strateji Katmanı</span>
          </div>
          <div className="stat">
            <span className="stat__value">24/7</span>
            <span className="stat__label">Otomatik İzleme</span>
          </div>
          <div className="stat">
            <span className="stat__value">100%</span>
            <span className="stat__label">Şeffaf Loglar</span>
          </div>
        </div>
        <div className="header__actions">
          <Link to="/live-actions" className="btn-live-actions">
            <span className="btn-live-actions__icon">⚡</span>
            <span className="btn-live-actions__text">Live Actions</span>
            <span className="btn-live-actions__arrow">→</span>
          </Link>
        </div>
      </header>
      <main className="page__content">
        {/* 1. Ne yapar? + Equity Curve */}
        <section className="section section--visual">
          <div className="section__body">
            <div className="section__badge">
              <span className="badge__icon">⚡</span>
              <span>Core Function</span>
            </div>
            <h2>Ne yapar?</h2>
            <p>
              USDT-M perpetual'larda (uzun odaklı) yüksek frekansta fırsat arar, sadece piyasa katılımı ve momentum birlikte
              onay verdiğinde işlem açar. Amacı "çok işlem" değil, <strong className="text-highlight">kalitesi yüksek işlemler</strong> üretmektir.
            </p>
            <div className="feature-pills">
              <span className="pill">Yüksek Frekans</span>
              <span className="pill">Düşük İşlem</span>
              <span className="pill">Kalite Odaklı</span>
            </div>
          </div>
          <aside className="section__aside">
            <div className="chart-card">
              <div className="chart-card__header">
                <h3>Kümülatif Getiri (Dummy)</h3>
                <span>LIVE vs SIM</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={equityCurve} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--magenta)" stopOpacity={0.9} />
                      <stop offset="80%" stopColor="var(--magenta)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="simGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.8} />
                      <stop offset="80%" stopColor="var(--neon-cyan)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.55)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
                  <Area type="monotone" dataKey="live" stroke="var(--magenta)" strokeWidth={2.4} fill="url(#liveGradient)" />
                  <Area type="monotone" dataKey="sim" stroke="var(--neon-cyan)" strokeWidth={2} fill="url(#simGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </aside>
        </section>

        {/* 2. Kimin için? + Audience Cards */}
        <section className="section section--columns">
          <div className="section__body">
            <div className="section__badge">
              <span className="badge__icon">🎯</span>
              <span>Target Audience</span>
            </div>
            <h2>Kimin için?</h2>
            <ul>
              <li><strong className="text-highlight">"Her sinyali değil, doğru sinyali istiyorum"</strong> diyen disiplinli trader'lar</li>
              <li>Ayı dönemlerinde kısa ömürlü toparlanmalara <span className="text-muted">yakalanmak istemeyenler</span></li>
              <li>Otomatik, <strong>ölçülebilir</strong> ve bahane üretmeyen bir sistem arayanlar</li>
            </ul>
          </div>
          <div className="audience-cards">
            <div className="audience-card">
              <span className="audience-card__tag">Dummy Metric</span>
              <strong>72%</strong>
              <p>Strateji disiplin skoruna göre en üst dilimdeki kullanıcılar.</p>
            </div>
            <div className="audience-card">
              <span className="audience-card__tag">Dummy Metric</span>
              <strong>18s</strong>
              <p>Karar başına ortalama değerlendirme süresi; sabırsızlığa yer yok.</p>
            </div>
            <div className="audience-card">
              <span className="audience-card__tag">Dummy Metric</span>
              <strong>4.2x</strong>
              <p>Ayı piyasasında gereksiz işlemlerden kaçınma oranı.</p>
            </div>
          </div>
        </section>

        {/* 3. Neden farklı? + Strategy Blend */}
        <section className="section section--visual section--features">
          <div className="section__body">
            <div className="section__badge">
              <span className="badge__icon">💎</span>
              <span>Competitive Edge</span>
            </div>
            <h2>Neden farklı?</h2>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📡</div>
                <h3>Piyasa Genişliği (Breadth) Kapısı</h3>
                <p>
                  Yalnızca tekil coinin değil, tüm piyasanın yükseliş/düşüş dengesini ve
                  derinliğini ölçer; piyasa geri çekilirken veya ayıyken işlem açmayı reddeder.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🎛️</div>
                <h3>Dört Ayrı Strateji Katmanı</h3>
                <p>
                  Trend (Donchian), Momentum Breakout (LinReg kanal), Mean-Reversion ve Korelasyon
                  (BTC'ye göre relativite). Her bir strateji farklı piyasa rejiminde devreye girerek daha dengeli dağılım yaratır.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Portföy Seviyesinde Risk Kontrolü</h3>
                <p>
                  Tek sembol değil, tüm pozisyonların toplam riski canlı izlenir; önceden
                  tanımlanan tavan aşıldığında yeni pozisyon açılmaz. Konsantrasyon limitleri ile BTC'ye benzeyen coinlere aşırı
                  yüklenmeden kaçınır.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Gelişmiş Pozisyon Yönetimi</h3>
                <p>
                  Başabaş (BE) kilidi, zamana dayalı durdurmalar ve piyasa genişliği düşünce kâr
                  kilidinin yumuşak kapanması. Kar elde edildiğinde zarar görmesini önlemek için otomatik stratejiler devrededir.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🚀</div>
                <h3>Yüksek Frekans + Düşük İşlem</h3>
                <p>
                  Mikrosaniye çözünürlüklü veriyi analiz eder, ama aslında çok az işlem üretir;
                  amacı spread, komisyon ve kayma gibi gizli maliyetlerden kaçınmaktır.
                </p>
              </div>
            </div>
          </div>
          <aside className="section__aside">
            <div className="chart-card">
              <div className="chart-card__header">
                <h3>Strateji Karışımı (%)</h3>
                <span>Son 30 gün üretimi</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={strategyBlend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.55)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="score" radius={[12, 12, 12, 12]} fill="var(--neon-cyan)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </aside>
        </section>

        {/* 4. Nasıl karar verir? + Decision Flow */}
        <section className="section section--visual section--decision">
          <div className="section__body">
            <div className="section__badge">
              <span className="badge__icon">🧠</span>
              <span>Decision Engine</span>
            </div>
            <h2>Nasıl karar verir? <span className="subtitle-tag">(kısa akış)</span></h2>
            
            <div className="decision-pipeline">
              <div className="pipeline-step">
                <div className="step-number">1</div>
                <div className="step-header">
                  <div className="step-icon">🔍</div>
                  <h3>Tarama</h3>
                </div>
                <p>Tüm evrende anlık veri → likidite, spread ve mikro-momentum ön elemesi.</p>
              </div>

              <div className="pipeline-connector">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M7 12L17 12M17 12L13 8M17 12L13 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="pipeline-step">
                <div className="step-number">2</div>
                <div className="step-header">
                  <div className="step-icon">📊</div>
                  <h3>Bağlam</h3>
                </div>
                <p>Çok zamanlı göstergeler (EMA/ADX/Donchian, LinReg kanal, AVWAP).</p>
              </div>

              <div className="pipeline-connector">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M7 12L17 12M17 12L13 8M17 12L13 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="pipeline-step">
                <div className="step-number">3</div>
                <div className="step-header">
                  <div className="step-icon">✅</div>
                  <h3>Piyasa Onayı</h3>
                </div>
                <p>Breadth oran + derinlik + eğim; "ayıdan çıkış" için kümülatif dönüş teyidi.</p>
              </div>

              <div className="pipeline-connector">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M7 12L17 12M17 12L13 8M17 12L13 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="pipeline-step">
                <div className="step-number">4</div>
                <div className="step-header">
                  <div className="step-icon">🎯</div>
                  <h3>Skorlama</h3>
                </div>
                <p>Her strateji için kazanma olasılığı ve TP/SL → beklenen değer hesabı.</p>
              </div>

              <div className="pipeline-connector">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M7 12L17 12M17 12L13 8M17 12L13 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="pipeline-step">
                <div className="step-number">5</div>
                <div className="step-header">
                  <div className="step-icon">🛡️</div>
                  <h3>Risk Kontrolü</h3>
                </div>
                <p>Marj, toplam risk tavanı, konsantrasyon ve ücret/kayma eşiği.</p>
              </div>

              <div className="pipeline-connector">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M7 12L17 12M17 12L13 8M17 12L13 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="pipeline-step pipeline-step--final">
                <div className="step-number">6</div>
                <div className="step-header">
                  <div className="step-icon">⚙️</div>
                  <h3>Yönetim</h3>
                </div>
                <p>Başabaş, kâr kilidi, zaman durdurma, breadth'e bağlı yumuşak kapatma.</p>
              </div>
            </div>
          </div>
          <aside className="section__aside">
            <div className="chart-card">
              <div className="chart-card__header">
                <h3>Karar Skoru Akışı</h3>
                <span>Olasılık × R/R</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={decisionScore} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="decisionLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.85} />
                      <stop offset="85%" stopColor="var(--neon-cyan)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="decisionSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--magenta)" stopOpacity={0.8} />
                      <stop offset="85%" stopColor="var(--magenta)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.55)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
                  <Area type="monotone" dataKey="live" stroke="var(--neon-cyan)" strokeWidth={3} fill="url(#decisionLive)" />
                  <Area type="monotone" dataKey="sim" stroke="var(--magenta)" strokeWidth={2} fill="url(#decisionSim)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </aside>
        </section>

        {/* 5. Risk yönetimi + Exposure Chart */}
        <section className="section section--visual section--risk">
          <div className="section__body">
            <div className="section__badge">
              <span className="badge__icon">🛡️</span>
              <span>Risk Control</span>
            </div>
            <h2>Risk yönetimi <span className="subtitle-tag">(en güçlü tarafı)</span></h2>
            
            <div className="risk-controls">
              <div className="risk-card risk-card--primary">
                <div className="risk-card__header">
                  <div className="risk-icon">🎯</div>
                  <h3>Toplam Risk Tavanı</h3>
                </div>
                <p>Portföy seviyesinde açık risk yüzde sınırı ile kontrol edilir; yeni pozisyon buna göre kısıtlanır.</p>
                <div className="risk-metric">
                  <span className="metric-label">Max Risk</span>
                  <span className="metric-value">12%</span>
                </div>
              </div>

              <div className="risk-card risk-card--warning">
                <div className="risk-card__header">
                  <div className="risk-icon">⚖️</div>
                  <h3>Marj'a Göre Ölçekleme</h3>
                </div>
                <p>Yer yoksa pozisyon büyüklüğü otomatik küçültülür; aşırı kaldıraçtan kaçınır.</p>
                <div className="risk-metric">
                  <span className="metric-label">Auto Scaling</span>
                  <span className="metric-value">ON</span>
                </div>
              </div>

              <div className="risk-card risk-card--success">
                <div className="risk-card__header">
                  <div className="risk-icon">🔒</div>
                  <h3>Zararı Durdur & Kâr Kilidi</h3>
                </div>
                <p>Başabaş'a çekme, kademeli kâr kilidi ve piyasa genişliği zayıfladığında yumuşak kapatma mantıklarıyla kârın korunmasını hedefler.</p>
                <div className="risk-metric">
                  <span className="metric-label">BE Lock</span>
                  <span className="metric-value">Active</span>
                </div>
              </div>

              <div className="risk-card risk-card--info">
                <div className="risk-card__header">
                  <div className="risk-icon">🎲</div>
                  <h3>Konsantrasyon Kontrolü</h3>
                </div>
                <p>BTC'ye aşırı benzer hareket eden coinlerde küme limiti uygular; tek temaya yığılmayı azaltır.</p>
                <div className="risk-metric">
                  <span className="metric-label">Cluster Limit</span>
                  <span className="metric-value">3</span>
                </div>
              </div>

              <div className="risk-card risk-card--discipline">
                <div className="risk-card__header">
                  <div className="risk-icon">🧘</div>
                  <h3>Özdisiplin</h3>
                </div>
                <p>Sembol başına tek açık işlem, evrensel giriş aralığı (cooldown) ve aşırı işlem açmayı frenleyen aşama kilitleri sayesinde duygusal kararların önüne geçer.</p>
                <div className="risk-metric">
                  <span className="metric-label">Cooldown</span>
                  <span className="metric-value">5m</span>
                </div>
              </div>
            </div>
          </div>
          <aside className="section__aside">
            <div className="chart-card">
              <div className="chart-card__header">
                <h3>Marj Kullanım vs Tavan</h3>
                <span>Günlük profil (dummy)</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={exposureProfile} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.55)" tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
                  <Line type="monotone" dataKey="marj" stroke="var(--magenta)" strokeWidth={3} dot={{ r: 4 }} />
                  <Line
                    type="monotone"
                    dataKey="tavan"
                    stroke="var(--neon-cyan)"
                    strokeWidth={2.5}
                    strokeDasharray="6 6"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </aside>
        </section>

        {/* 6. Kâr Eğrisi Adaptasyonu */}
        <section className="section section--highlight">
          <div className="section__badge section__badge--highlight">
            <span className="badge__icon">🔄</span>
            <span>Adaptive Learning</span>
          </div>
          <h2>
            <span className="text-gradient">Kâr Eğrisi Adaptasyonu</span>
          </h2>
          <p className="highlight-text">
            Performans düşüşü olduğunda sistem yeni girişleri durdurup simülasyon moduna
            geçer; toparlandığında otomatik olarak LIVE'a döner. Böylece <strong>kötü serilerde gereksiz risk alınmaz.</strong>
          </p>
          
          <div className="adaptive-flow">
            <div className="flow-step flow-step--active">
              <div className="flow-icon">🟢</div>
              <div className="flow-content">
                <h3>LIVE Mode</h3>
                <p>Sistem aktif şekilde işlem açıyor</p>
              </div>
            </div>
            
            <div className="flow-arrow">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="flow-trigger">Performans Düşüşü</span>
            </div>
            
            <div className="flow-step flow-step--pause">
              <div className="flow-icon">⏸️</div>
              <div className="flow-content">
                <h3>SIM Mode</h3>
                <p>Yeni giriş durduruldu, simülasyon</p>
              </div>
            </div>
            
            <div className="flow-arrow">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="flow-trigger">Toparlanma</span>
            </div>
            
            <div className="flow-step flow-step--active">
              <div className="flow-icon">🟢</div>
              <div className="flow-content">
                <h3>LIVE Mode</h3>
                <p>Otomatik LIVE'a dönüş</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Şeffaflık + Transparency Grid */}
        <section className="section section--transparency">
          <div className="section__body">
            <div className="section__badge">
              <span className="badge__icon">🔍</span>
              <span>Full Transparency</span>
            </div>
            <h2>Şeffaflık</h2>
            <p>
              Gerçek işlem logları <span className="text-highlight">(giriş/çıkış zamanı, sembol, taraf, hedef/stop, çıkış sebebi)</span> bir Google Sheets'te gizlenmeden
              paylaşılır. Performans metrikleri (kazanma oranı, avg. win/loss, DD, gün/hafta kazanç/zarar raporları) aynı dosyada
              yaşar ve her gün güncellenir. Böylece <strong>overfit backtestler yerine gerçek piyasa verisi</strong> üzerinden skor verilebilir.
            </p>
          </div>
          <div className="transparency-grid">
            <div className="transparency-item">
              <strong>Tüm işlem logları</strong>
              <p>Her giriş/çıkış saati, sembol, sebep</p>
            </div>
            <div className="transparency-item">
              <strong>Gerçek P&L</strong>
              <p>Günlük ve haftalık net sonuçlar</p>
            </div>
            <div className="transparency-item">
              <strong>Kazanma oranı</strong>
              <p>Strateji başarı yüzdeleri</p>
            </div>
            <div className="transparency-item">
              <strong>Max Drawdown</strong>
              <p>Tarihsel en derin kayıp</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
