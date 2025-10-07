import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { useActions } from '../hooks/useActions';
import { SupActionsChart } from '../components/SupActionsChart';
import '../App.css';

// Reason parser - closes nedenlerini parse et
const parseReason = (reason: string): { type: string; icon: string; label: string; details: string } => {
  const lower = reason.toLowerCase();
  
  // TP (Take Profit) - Kar Al
  if (lower.includes('tp') || lower.includes('take profit') || lower.includes('target')) {
    return {
      type: 'tp',
      icon: '🎯',
      label: 'Take Profit',
      details: reason
    };
  }
  
  // SL (Stop Loss) - Zarar Durdur
  if (lower.includes('sl') || lower.includes('stop loss') || lower.includes('stoploss')) {
    return {
      type: 'sl',
      icon: '🛑',
      label: 'Stop Loss',
      details: reason
    };
  }
  
  // Trailing Stop
  if (lower.includes('trail')) {
    return {
      type: 'trail',
      icon: '📉',
      label: 'Trailing Stop',
      details: reason
    };
  }
  
  // Timeout - Zaman Aşımı
  if (lower.includes('timeout') || lower.includes('time') || lower.includes('duration')) {
    return {
      type: 'timeout',
      icon: '⏱️',
      label: 'Zaman Aşımı',
      details: reason
    };
  }
  
  // Score/Signal değişimi
  if (lower.includes('score') || lower.includes('signal') || lower.includes('indicator')) {
    return {
      type: 'score',
      icon: '📊',
      label: 'Sinyal Değişimi',
      details: reason
    };
  }
  
  // Volume - Hacim
  if (lower.includes('volume') || lower.includes('vol')) {
    return {
      type: 'volume',
      icon: '📈',
      label: 'Hacim Değişimi',
      details: reason
    };
  }
  
  // Manual Close - Manuel Kapatma
  if (lower.includes('manual') || lower.includes('user')) {
    return {
      type: 'manual',
      icon: '👤',
      label: 'Manuel Kapatma',
      details: reason
    };
  }
  
  // Risk Management
  if (lower.includes('risk') || lower.includes('exposure')) {
    return {
      type: 'risk',
      icon: '⚠️',
      label: 'Risk Yönetimi',
      details: reason
    };
  }
  
  // Default - Diğer
  return {
    type: 'other',
    icon: '📋',
    label: 'Diğer',
    details: reason
  };
};

const LiveActions = () => {
  const { trades, metrics, loading, error, refresh, enableRealtime, setEnableRealtime, limit, setLimit, timeRange, setTimeRange } = useActions();
  
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
            
            {/* Realtime Toggle & Controls */}
            <div className="sb-realtime-toggle">
              <div className="sb-control-group">
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
                
                <div className="sb-limit-selector">
                  <label htmlFor="timerange-select" className="sb-limit-label">
                    📅 Zaman Aralığı:
                  </label>
                  <select 
                    id="timerange-select"
                    value={timeRange} 
                    onChange={(e) => setTimeRange(Number(e.target.value))}
                    className="sb-limit-dropdown"
                  >
                    <option value={1}>Son 1 Saat</option>
                    <option value={6}>Son 6 Saat</option>
                    <option value={24}>Son 24 Saat</option>
                    <option value={168}>Son 7 Gün</option>
                    <option value={720}>Son 30 Gün</option>
                  </select>
                </div>
                
                <div className="sb-limit-selector">
                  <label htmlFor="limit-select" className="sb-limit-label">
                    📊 Veri Limiti:
                  </label>
                  <select 
                    id="limit-select"
                    value={limit} 
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="sb-limit-dropdown"
                  >
                    <option value={10}>10 Kayıt</option>
                    <option value={25}>25 Kayıt</option>
                    <option value={50}>50 Kayıt</option>
                    <option value={100}>100 Kayıt</option>
                    <option value={200}>200 Kayıt</option>
                    <option value={500}>500 Kayıt</option>
                  </select>
                </div>
              </div>
              
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
            <h2 className="section__title">
              {timeRange === 1 && 'Son 1 Saatlik Canlı Performans'}
              {timeRange === 6 && 'Son 6 Saatlik Canlı Performans'}
              {timeRange === 24 && 'Son 24 Saatlik Canlı Performans'}
              {timeRange === 168 && 'Son 7 Günlük Canlı Performans'}
              {timeRange === 720 && 'Son 30 Günlük Canlı Performans'}
            </h2>
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
              <div className="trades-table trades-table--minimal">
                <div className="trades-table__header">
                  <div className="trades-table__cell trades-table__cell--time">⏰ Zaman</div>
                  <div className="trades-table__cell trades-table__cell--symbol">💱 Sembol</div>
                  <div className="trades-table__cell trades-table__cell--pnl">💰 PnL</div>
                  <div className="trades-table__cell trades-table__cell--reason">📝 Kapanış Nedeni</div>
                </div>
                
                {trades.map((trade) => {
                  const reasonData = parseReason(trade.reason);
                  
                  return (
                    <div key={trade.id} className="trades-table__row">
                      <div className="trades-table__cell trades-table__cell--time">
                        <div className="trade-time">
                          <span className="trade-time__date">
                            {new Date(trade.created_at).toLocaleDateString('tr-TR', { 
                              day: '2-digit', 
                              month: 'short' 
                            })}
                          </span>
                          <span className="trade-time__clock">
                            {new Date(trade.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="trades-table__cell trades-table__cell--symbol">
                        <span className="trade-symbol">{trade.symbol}</span>
                      </div>
                      
                      <div className="trades-table__cell trades-table__cell--pnl">
                        <div className="trade-pnl-wrapper">
                          <span className={`trade-pnl ${trade.pnl >= 0 ? 'trade-pnl--positive' : 'trade-pnl--negative'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                          </span>
                          <span className="trade-pnl-score">Score: {trade.score.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="trades-table__cell trades-table__cell--reason">
                        <div className={`trade-reason trade-reason--${reasonData.type}`}>
                          <span className="trade-reason__icon">{reasonData.icon}</span>
                          <div className="trade-reason__content">
                            <span className="trade-reason__label">{reasonData.label}</span>
                            <span className="trade-reason__details" title={reasonData.details}>
                              {reasonData.details.length > 80 
                                ? reasonData.details.substring(0, 80) + '...' 
                                : reasonData.details}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
