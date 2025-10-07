import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import '../App.css';

// Dummy live trade data
const generateLiveTrades = () => {
  const trades = [];
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'MATIC/USDT'];
  const strategies = ['Momentum', 'Mean Reversion', 'Breakout', 'Scalp'];
  const statuses = ['OPEN', 'CLOSED', 'PENDING'];
  
  for (let i = 0; i < 15; i++) {
    const entryPrice = 45000 + Math.random() * 10000;
    const currentPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.03);
    const pnl = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    trades.push({
      id: `TRD${1000 + i}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      side: Math.random() > 0.5 ? 'LONG' : 'SHORT',
      entryPrice: entryPrice.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      size: (Math.random() * 0.5 + 0.1).toFixed(3),
      pnl: pnl.toFixed(2),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
    });
  }
  return trades.sort((a, b) => parseFloat(b.pnl) - parseFloat(a.pnl));
};

// Real-time performance data
const generatePerformanceData = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      time: `${i}:00`,
      pnl: Math.random() * 500 - 100,
      volume: Math.random() * 10000,
      trades: Math.floor(Math.random() * 50),
    });
  }
  return data;
};

const LiveActions = () => {
  const liveTrades = generateLiveTrades();
  const performanceData = generatePerformanceData();
  
  const stats = {
    activePositions: liveTrades.filter(t => t.status === 'OPEN').length,
    totalPnL: liveTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0).toFixed(2),
    winRate: ((liveTrades.filter(t => parseFloat(t.pnl) > 0).length / liveTrades.length) * 100).toFixed(1),
    avgPnL: (liveTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0) / liveTrades.length).toFixed(2),
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="page__header">
        <div className="page__container">
          <div className="page__header-content">
            <Link to="/" className="back-button">
              <span>←</span> Ana Sayfa
            </Link>
            <div className="page__title-group">
              <div className="page__badge page__badge--live">
                <span className="pulse-dot"></span>
                LIVE
              </div>
              <h1 className="page__title">
                <span className="page__title-main">Live</span>{' '}
                <span className="page__title-accent">Actions</span>
              </h1>
              <p className="page__subtitle">Gerçek zamanlı işlem takibi ve performans metrikleri</p>
            </div>
            
            {/* Live Stats Row */}
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{stats.activePositions}</div>
                <div className="stat-label">Aktif Pozisyon</div>
              </div>
              <div className="stat-item stat-item--success">
                <div className="stat-value">{stats.totalPnL}%</div>
                <div className="stat-label">Toplam PnL</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.winRate}%</div>
                <div className="stat-label">Kazanç Oranı</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.avgPnL}%</div>
                <div className="stat-label">Ortalama PnL</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page__main">
        <div className="page__container">
          {/* Performance Chart */}
          <section className="section">
            <div className="section__badge">📊 PERFORMANS</div>
            <h2 className="section__title">24 Saatlik Canlı Performans</h2>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(20, 25, 35, 0.95)', 
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      borderRadius: '12px',
                      padding: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pnl" 
                    stroke="#00E5FF" 
                    fillOpacity={1} 
                    fill="url(#colorPnl)" 
                    name="PnL ($)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Live Trades Table */}
          <section className="section">
            <div className="section__badge">⚡ CANLI</div>
            <h2 className="section__title">Aktif İşlemler</h2>
            <p className="section__description">
              Gerçek zamanlı işlem akışı ve pozisyon detayları
            </p>
            
            <div className="trades-container">
              <div className="trades-table">
                <div className="trades-table__header">
                  <div className="trades-table__cell">ID</div>
                  <div className="trades-table__cell">Sembol</div>
                  <div className="trades-table__cell">Strateji</div>
                  <div className="trades-table__cell">Yön</div>
                  <div className="trades-table__cell">Giriş</div>
                  <div className="trades-table__cell">Güncel</div>
                  <div className="trades-table__cell">Miktar</div>
                  <div className="trades-table__cell">PnL %</div>
                  <div className="trades-table__cell">Durum</div>
                  <div className="trades-table__cell">Zaman</div>
                </div>
                
                {liveTrades.map((trade) => (
                  <div key={trade.id} className="trades-table__row">
                    <div className="trades-table__cell">
                      <span className="trade-id">{trade.id}</span>
                    </div>
                    <div className="trades-table__cell">
                      <span className="trade-symbol">{trade.symbol}</span>
                    </div>
                    <div className="trades-table__cell">
                      <span className="trade-strategy">{trade.strategy}</span>
                    </div>
                    <div className="trades-table__cell">
                      <span className={`trade-side trade-side--${trade.side.toLowerCase()}`}>
                        {trade.side}
                      </span>
                    </div>
                    <div className="trades-table__cell">${trade.entryPrice}</div>
                    <div className="trades-table__cell">${trade.currentPrice}</div>
                    <div className="trades-table__cell">{trade.size}</div>
                    <div className="trades-table__cell">
                      <span className={`trade-pnl ${parseFloat(trade.pnl) >= 0 ? 'trade-pnl--positive' : 'trade-pnl--negative'}`}>
                        {parseFloat(trade.pnl) >= 0 ? '+' : ''}{trade.pnl}%
                      </span>
                    </div>
                    <div className="trades-table__cell">
                      <span className={`trade-status trade-status--${trade.status.toLowerCase()}`}>
                        {trade.status}
                      </span>
                    </div>
                    <div className="trades-table__cell">{trade.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Trading Volume Chart */}
          <section className="section">
            <div className="section__badge">📈 HACIM</div>
            <h2 className="section__title">İşlem Hacmi</h2>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(20, 25, 35, 0.95)', 
                      border: '1px solid rgba(255, 0, 122, 0.3)',
                      borderRadius: '12px',
                      padding: '12px'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#FF007A" 
                    strokeWidth={2}
                    dot={false}
                    name="Hacim ($)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trades" 
                    stroke="#00E5FF" 
                    strokeWidth={2}
                    dot={false}
                    name="İşlem Sayısı"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default LiveActions;
