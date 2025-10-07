import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { useActions } from '../hooks/useActions';
import { SupActionsChart } from '../components/SupActionsChart';
import '../App.css';

const LiveActions = () => {
  const { trades, metrics, loading, error, refresh, enableRealtime, setEnableRealtime } = useActions();
  
  // Stats hesaplama - gerçek verilerle
  const stats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        activePositions: 0,
        totalPnL: '0.00',
        winRate: '0.0',
        avgPnL: '0.00',
      };
    }
    
    const winningTrades = trades.filter(t => t.pnl > 0);
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    return {
      activePositions: trades.length,
      totalPnL: totalPnL.toFixed(2),
      winRate: trades.length > 0 ? ((winningTrades.length / trades.length) * 100).toFixed(1) : '0.0',
      avgPnL: trades.length > 0 ? (totalPnL / trades.length).toFixed(2) : '0.00',
    };
  }, [trades]);

  // Volume chart data - metriklerden hesapla
  const volumeData = useMemo(() => {
    return metrics.map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      volume: m.total_pnl * 1000, // Approximate volume
      trades: m.total_trades
    }));
  }, [metrics]);

  // Loading state
  if (loading) {
    return (
      <div className="page">
        <div className="page__container" style={{ padding: '4rem', textAlign: 'center' }}>
          <div className="sb-loading">
            <div className="sb-loading-spinner"></div>
            <h2>Veriler yükleniyor...</h2>
            <p>Supabase'den canlı veriler çekiliyor</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="page">
        <div className="page__container" style={{ padding: '4rem', textAlign: 'center' }}>
          <div className="sb-error">
            <h2>⚠️ Veri Yükleme Hatası</h2>
            <p>{error.message}</p>
            <button onClick={refresh} className="btn-live-actions" style={{ marginTop: '2rem' }}>
              <span className="btn-live-actions__icon">🔄</span>
              <span className="btn-live-actions__text">Tekrar Dene</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            
            {/* Realtime Toggle */}
            <div className="sb-realtime-toggle">
              <label className="sb-toggle-label">
                <input 
                  type="checkbox" 
                  checked={enableRealtime} 
                  onChange={(e) => setEnableRealtime(e.target.checked)}
                  className="sb-toggle-input"
                />
                <span className="sb-toggle-text">
                  {enableRealtime ? '🟢 Realtime Aktif' : '⚪ Realtime Pasif'}
                </span>
              </label>
              <button onClick={refresh} className="sb-refresh-btn" title="Verileri Yenile">
                🔄 Yenile
              </button>
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
              <SupActionsChart data={metrics} height={300} />
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
                  <div className="trades-table__cell">PnL</div>
                  <div className="trades-table__cell">Score</div>
                  <div className="trades-table__cell">R1M</div>
                  <div className="trades-table__cell">ATR5M</div>
                  <div className="trades-table__cell">Z1M</div>
                  <div className="trades-table__cell">VShock</div>
                  <div className="trades-table__cell">Reason</div>
                  <div className="trades-table__cell">Zaman</div>
                </div>
                
                {trades.map((trade) => (
                  <div key={trade.id} className="trades-table__row">
                    <div className="trades-table__cell">
                      <span className="trade-id">{trade.id.substring(0, 8)}...</span>
                    </div>
                    <div className="trades-table__cell">
                      <span className="trade-symbol">{trade.symbol}</span>
                    </div>
                    <div className="trades-table__cell">
                      <span className={`trade-pnl ${trade.pnl >= 0 ? 'trade-pnl--positive' : 'trade-pnl--negative'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="trades-table__cell">
                      <span className="trade-score">{trade.score.toFixed(1)}</span>
                    </div>
                    <div className="trades-table__cell">{trade.r1m.toFixed(2)}</div>
                    <div className="trades-table__cell">{trade.atr5m.toFixed(2)}</div>
                    <div className="trades-table__cell">{trade.z1m.toFixed(2)}</div>
                    <div className="trades-table__cell">{trade.vshock.toFixed(2)}</div>
                    <div className="trades-table__cell">
                      <span className={`trade-status trade-status--closed`} title={trade.reason}>
                        {trade.reason.substring(0, 20)}{trade.reason.length > 20 ? '...' : ''}
                      </span>
                    </div>
                    <div className="trades-table__cell">
                      {new Date(trade.created_at).toLocaleTimeString('tr-TR')}
                    </div>
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
                <LineChart data={volumeData}>
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
