import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { useActions } from '../hooks/useActions';
import { SupActionsChart } from '../components/SupActionsChart';
import { VolumeChart } from '../components/VolumeChart';
import { BotSelector } from '../components/BotSelector';
import '../App.css';

// Enhanced reason parser with detailed field extraction
interface ParsedReason {
  type: string;
  icon: string;
  label: string;
  exitType: string;        // BREADTH_WINNER, STALL_EXIT, etc.
  policy: string;          // POL=BREAKOUT
  volume: string;          // VOL=NORMAL
  breadth: string;         // BRD=ON
  mfe: string;             // MFE=1.07
  mae: string;             // MAE=-0.27
  pnl: string;             // R=+0.178
  tags: string;            // [BREAKOUT] [VOL NORMAL]...
  indicators: string;      // ema_align=+ adx=40.1...
  rawReason: string;
}

const parseReasonDetailed = (reason: string): ParsedReason => {
  const lower = reason.toLowerCase();
  
  // Split by double pipe ||
  const mainParts = reason.split('||').map(p => p.trim());
  
  // Part 1: Exit type and parameters (BREADTH_WINNER |POL=BREAKOUT|VOL=NORMAL|...)
  const part1 = mainParts[0] || '';
  const part1Split = part1.split('|').map(s => s.trim());
  const exitType = part1Split[0] || '-';
  
  // Extract key-value pairs from part1
  const extractValue = (key: string) => {
    const item = part1Split.find(s => s.startsWith(key + '='));
    return item ? item.split('=')[1] : '-';
  };
  
  const policy = extractValue('POL');
  const volume = extractValue('VOL');
  const breadth = extractValue('BRD');
  const mfe = extractValue('MFE');
  const mae = extractValue('MAE');
  const pnl = extractValue('R');
  
  // Part 2: Tags ([BREAKOUT] [VOL NORMAL]...)
  const tags = mainParts[1] || '-';
  
  // Part 3: Indicators (ema_align=+ adx=40.1...)
  const indicators = mainParts[2] || '-';
  
  // Determine type and icon based on exit type
  let type = 'other';
  let icon = '📋';
  let label = 'Diğer';
  
  if (lower.includes('winner') || lower.includes('tp') || lower.includes('take profit')) {
    type = 'tp';
    icon = '🎯';
    label = 'Winner';
  } else if (lower.includes('stall') || lower.includes('exit')) {
    type = 'timeout';
    icon = '⏱️';
    label = 'Stall Exit';
  } else if (lower.includes('sl') || lower.includes('stop loss') || lower.includes('loser')) {
    type = 'sl';
    icon = '🛑';
    label = 'Stop Loss';
  } else if (lower.includes('trail')) {
    type = 'trail';
    icon = '📉';
    label = 'Trailing';
  } else if (lower.includes('manual')) {
    type = 'manual';
    icon = '👤';
    label = 'Manuel';
  }
  
  return {
    type,
    icon,
    label,
    exitType,
    policy,
    volume,
    breadth,
    mfe,
    mae,
    pnl: pnl,
    tags,
    indicators,
    rawReason: reason
  };
};

// Old parser for backward compatibility
interface ParsedReasonSimple {
  type: string;
  icon: string;
  label: string;
  columns: string[];
  rawReason: string;
}

const parseReasonWithColumns = (reason: string): ParsedReasonSimple => {
  const lower = reason.toLowerCase();
  
  // Split by pipe separator
  const columns = reason.split('|').map(col => col.trim()).filter(col => col.length > 0);
  
  // Determine type and icon based on first column or full text
  let type = 'other';
  let icon = '📋';
  let label = 'Diğer';
  
  if (lower.includes('tp') || lower.includes('take profit') || lower.includes('target')) {
    type = 'tp';
    icon = '🎯';
    label = 'Take Profit';
  } else if (lower.includes('sl') || lower.includes('stop loss') || lower.includes('stoploss')) {
    type = 'sl';
    icon = '🛑';
    label = 'Stop Loss';
  } else if (lower.includes('trail')) {
    type = 'trail';
    icon = '📉';
    label = 'Trailing Stop';
  } else if (lower.includes('timeout') || lower.includes('time') || lower.includes('duration')) {
    type = 'timeout';
    icon = '⏱️';
    label = 'Zaman Aşımı';
  } else if (lower.includes('score') || lower.includes('signal') || lower.includes('indicator')) {
    type = 'score';
    icon = '📊';
    label = 'Sinyal Değişimi';
  } else if (lower.includes('volume') || lower.includes('vol')) {
    type = 'volume';
    icon = '📈';
    label = 'Hacim Değişimi';
  } else if (lower.includes('manual') || lower.includes('user')) {
    type = 'manual';
    icon = '👤';
    label = 'Manuel Kapatma';
  } else if (lower.includes('risk') || lower.includes('exposure')) {
    type = 'risk';
    icon = '⚠️';
    label = 'Risk Yönetimi';
  }
  
  return {
    type,
    icon,
    label,
    columns: columns.length > 0 ? columns : [reason],
    rawReason: reason
  };
};

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
            
            {/* Bot Selector - Stats'tan önce */}
            <BotSelector />
            
            {/* Live Stats Row - Enhanced */}
            <div className="sb-stats-grid">
              <div className="sb-stat-card">
                <div className="sb-stat-card__icon">📊</div>
                <div className="sb-stat-card__content">
                  <div className="sb-stat-card__value">{stats.activePositions}</div>
                  <div className="sb-stat-card__label">Toplam İşlem</div>
                </div>
                <div className="sb-stat-card__decoration"></div>
              </div>
              
              <div className={`sb-stat-card ${parseFloat(stats.totalPnL) >= 0 ? 'sb-stat-card--success' : 'sb-stat-card--danger'}`}>
                <div className="sb-stat-card__icon">
                  {parseFloat(stats.totalPnL) >= 0 ? '💰' : '📉'}
                </div>
                <div className="sb-stat-card__content">
                  <div className="sb-stat-card__value">
                    {parseFloat(stats.totalPnL) >= 0 ? '+' : ''}{stats.totalPnL}%
                  </div>
                  <div className="sb-stat-card__label">Toplam PnL</div>
                </div>
                <div className="sb-stat-card__decoration"></div>
              </div>
              
              <div className={`sb-stat-card ${parseFloat(stats.winRate) >= 50 ? 'sb-stat-card--success' : 'sb-stat-card--warning'}`}>
                <div className="sb-stat-card__icon">🎯</div>
                <div className="sb-stat-card__content">
                  <div className="sb-stat-card__value">{stats.winRate}%</div>
                  <div className="sb-stat-card__label">Kazanma Oranı</div>
                </div>
                <div className="sb-stat-card__decoration"></div>
              </div>
              
              <div className={`sb-stat-card ${parseFloat(stats.avgPnL) >= 0 ? 'sb-stat-card--success' : 'sb-stat-card--danger'}`}>
                <div className="sb-stat-card__icon">📈</div>
                <div className="sb-stat-card__content">
                  <div className="sb-stat-card__value">
                    {parseFloat(stats.avgPnL) >= 0 ? '+' : ''}{stats.avgPnL}%
                  </div>
                  <div className="sb-stat-card__label">Ortalama PnL</div>
                </div>
                <div className="sb-stat-card__decoration"></div>
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
              </div>
              
              <button onClick={refresh} className="sb-refresh-btn" title="Verileri Yenile">
                � Yenile
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page__main">
        <div className="page__container">
          {/* Charts Section - Yan Yana */}
          <section className="section">
            <div className="section__header">
              <div className="section__header-left">
                <div className="section__badge">📊 ANALİTİK</div>
                <h2 className="section__title">
                  {timeRange === 1 && 'Son 1 Saatlik Canlı Performans'}
                  {timeRange === 6 && 'Son 6 Saatlik Canlı Performans'}
                  {timeRange === 24 && 'Son 24 Saatlik Canlı Performans'}
                  {timeRange === 168 && 'Son 7 Günlük Canlı Performans'}
                  {timeRange === 720 && 'Son 30 Günlük Canlı Performans'}
                </h2>
              </div>

              {/* Chart Filters */}
              <div className="chart-filters">
                <div className="chart-filter-item">
                  <label htmlFor="chart-timerange" className="chart-filter-label">
                    � Zaman Aralığı
                  </label>
                  <select 
                    id="chart-timerange"
                    value={timeRange} 
                    onChange={(e) => setTimeRange(Number(e.target.value))}
                    className="chart-filter-select"
                  >
                    <option value={1}>Son 1 Saat</option>
                    <option value={6}>Son 6 Saat</option>
                    <option value={24}>Son 24 Saat</option>
                    <option value={168}>Son 7 Gün</option>
                    <option value={720}>Son 30 Gün</option>
                  </select>
                </div>
                
                <div className="chart-filter-item">
                  <label htmlFor="chart-limit" className="chart-filter-label">
                    � Veri Noktası
                  </label>
                  <select 
                    id="chart-limit"
                    value={limit} 
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="chart-filter-select"
                  >
                    <option value={10}>10 Nokta</option>
                    <option value={25}>25 Nokta</option>
                    <option value={50}>50 Nokta</option>
                    <option value={100}>100 Nokta</option>
                    <option value={200}>200 Nokta</option>
                    <option value={500}>500 Nokta</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="charts-grid">
              {/* Performance Chart */}
              <div className="chart-card chart-card--half">
                <div className="chart-card__header">
                  <h3 className="chart-card__title">💰 Kümülatif Performans</h3>
                  <p className="chart-card__subtitle">Zamana göre toplam kar/zarar trendi</p>
                </div>
                <SupActionsChart data={metrics} height={320} />
              </div>

              {/* Volume Chart */}
              <div className="chart-card chart-card--half">
                <div className="chart-card__header">
                  <h3 className="chart-card__title">📊 İşlem Hacmi</h3>
                  <p className="chart-card__subtitle">Zaman dilimlerine göre trade sayısı</p>
                </div>
                <VolumeChart data={metrics} height={320} />
              </div>
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
              <div className="trades-table trades-table--detailed">
                <div className="trades-table__header">
                  <div className="trades-table__cell">⏰ Zaman</div>
                  <div className="trades-table__cell">💱 Sembol</div>
                  <div className="trades-table__cell">💰 PnL</div>
                  <div className="trades-table__cell">🏷️ Exit Type</div>
                  <div className="trades-table__cell">📋 Policy</div>
                  <div className="trades-table__cell">📊 Volume</div>
                  <div className="trades-table__cell">🌐 Breadth</div>
                  <div className="trades-table__cell">� MFE</div>
                  <div className="trades-table__cell">📉 MAE</div>
                  <div className="trades-table__cell">💵 R</div>
                  <div className="trades-table__cell trades-table__cell--wide">🏷️ Tags</div>
                  <div className="trades-table__cell trades-table__cell--wide">📊 Indicators</div>
                </div>
                
                {trades.map((trade) => {
                  const reasonData = parseReasonDetailed(trade.reason);
                  
                  return (
                    <div key={trade.id} className="trades-table__row">
                      <div className="trades-table__cell">
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
                      
                      <div className="trades-table__cell">
                        <span className="trade-symbol">{trade.symbol}</span>
                      </div>
                      
                      <div className="trades-table__cell">
                        <div className="trade-pnl-wrapper">
                          <span className={`trade-pnl ${trade.pnl >= 0 ? 'trade-pnl--positive' : 'trade-pnl--negative'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}%
                          </span>
                          <span className="trade-pnl-score">S: {trade.score.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="trades-table__cell">
                        <div className={`trade-exit-badge trade-exit-badge--${reasonData.type}`}>
                          <span className="trade-exit-badge__icon">{reasonData.icon}</span>
                          <span className="trade-exit-badge__text">{reasonData.exitType}</span>
                        </div>
                      </div>
                      
                      <div className="trades-table__cell">
                        <span className="trade-field trade-field--policy" title={reasonData.policy}>
                          {reasonData.policy}
                        </span>
                      </div>
                      
                      <div className="trades-table__cell">
                        <span className="trade-field trade-field--volume" title={reasonData.volume}>
                          {reasonData.volume}
                        </span>
                      </div>
                      
                      <div className="trades-table__cell">
                        <span className={`trade-field trade-field--breadth ${reasonData.breadth === 'ON' ? 'trade-field--on' : 'trade-field--off'}`}>
                          {reasonData.breadth}
                        </span>
                      </div>
                      
                      <div className="trades-table__cell">
                        <span className={`trade-field trade-field--mfe ${parseFloat(reasonData.mfe) > 0 ? 'trade-field--positive' : ''}`}>
                          {reasonData.mfe}
                        </span>
                      </div>
                      
                      <div className="trades-table__cell">
                        <span className={`trade-field trade-field--mae ${parseFloat(reasonData.mae) < 0 ? 'trade-field--negative' : ''}`}>
                          {reasonData.mae}
                        </span>
                      </div>
                      
                      <div className="trades-table__cell">
                        <span className={`trade-field trade-field--r ${parseFloat(reasonData.pnl) >= 0 ? 'trade-field--positive' : 'trade-field--negative'}`}>
                          {reasonData.pnl}
                        </span>
                      </div>
                      
                      <div className="trades-table__cell trades-table__cell--wide">
                        <span className="trade-field trade-field--tags" title={reasonData.tags}>
                          {reasonData.tags}
                        </span>
                      </div>
                      
                      <div className="trades-table__cell trades-table__cell--wide">
                        <span className="trade-field trade-field--indicators" title={reasonData.indicators}>
                          {reasonData.indicators}
                        </span>
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
