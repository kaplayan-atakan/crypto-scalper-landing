import React, { useState, useEffect } from 'react'
import { fetchAllRunColumns } from '../services/backtestService'
import type { RunColumn } from '../types/supabase'
import './StrategyOveralls.css'

export function StrategyOveralls() {
  const [columns, setColumns] = useState<RunColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all')
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAllRunColumns()
        setColumns(data)
      } catch (err) {
        console.error('Failed to load backtest data:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Filter symbols based on search query and filter type
  const filterSymbols = (symbols: RunColumn['symbols']) => {
    return symbols.filter(symbol => {
      // Search query filter
      const matchesSearch = searchQuery === '' || 
        symbol.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      
      // PNL type filter
      const matchesType = 
        filterType === 'all' ||
        (filterType === 'positive' && symbol.pnl > 0) ||
        (filterType === 'negative' && symbol.pnl <= 0)
      
      return matchesSearch && matchesType
    })
  }
  
  // Copy run_id to clipboard
  const copyRunId = async (runId: string) => {
    try {
      await navigator.clipboard.writeText(runId)
      setCopiedRunId(runId)
      setTimeout(() => setCopiedRunId(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy run_id:', err)
    }
  }
  
  // Apply filters to all columns
  const filteredColumns = columns.map(col => ({
    ...col,
    symbols: filterSymbols(col.symbols)
  }))
  
  // Format helpers
  const formatWinrate = (wr: number) => `${(wr * 100).toFixed(1)}%`
  
  const formatPNL = (pnl: number | null | undefined) => {
    // null, undefined veya 0 için N/A döndür
    // 0 = hiç o tür trade yok demek (pozitif veya negatif)
    if (pnl === null || pnl === undefined || pnl === 0) return 'N/A'
    const sign = pnl > 0 ? '+' : ''
    return `${sign}${pnl.toFixed(4)}`  // 4 decimal places for precision
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  const formatRunId = (runId: string) => {
    return runId.slice(0, 8)
  }
  
  // Find max rows needed (longest symbol list)
  const maxRows = Math.max(...filteredColumns.map(col => col.symbols.length), 0)
  
  if (loading) {
    return (
      <div className="strategy-overalls">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading backtest data...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="strategy-overalls">
        <div className="error-container">
          <p className="error-icon">⚠️</p>
          <p className="error-message">{error.message}</p>
          <p className="error-hint">Supabase bağlantısını kontrol edin</p>
        </div>
      </div>
    )
  }
  
  if (columns.length === 0) {
    return (
      <div className="strategy-overalls">
        <div className="empty-container">
          <p className="empty-icon">📊</p>
          <p className="empty-message">Henüz backtest verisi bulunamadı</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="strategy-overalls">
      {/* Action Buttons - Top Right */}
      <div className="action-buttons">
        <button
          className="action-btn home-btn"
          onClick={() => window.location.href = '/crypto-scalper-landing/'}
          title="Ana Sayfaya Dön"
        >
          🏠 Ana Sayfa
        </button>
        <button
          className="action-btn refresh-btn"
          onClick={() => window.location.reload()}
          title="Sayfayı Yenile"
        >
          🔄 Yenile
        </button>
      </div>
      
      <header className="page-header">
        <h1>📊 Strategy Overalls</h1>
        <p>Backtest sonuçlarını karşılaştırmalı analiz</p>
        
        {/* Search and Filter Bar */}
        <div className="search-filter-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search symbols (e.g., BTC, ETH, USDT...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-button"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({columns.reduce((sum, c) => sum + c.total_symbols, 0)})
            </button>
            <button
              className={`filter-btn positive ${filterType === 'positive' ? 'active' : ''}`}
              onClick={() => setFilterType('positive')}
            >
              ✓ Positive ({columns.reduce((sum, c) => sum + c.positive_count, 0)})
            </button>
            <button
              className={`filter-btn negative ${filterType === 'negative' ? 'active' : ''}`}
              onClick={() => setFilterType('negative')}
            >
              ✗ Negative ({columns.reduce((sum, c) => sum + c.negative_count, 0)})
            </button>
          </div>
        </div>
        
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total Runs:</span>
            <span className="stat-value">{columns.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Showing Symbols:</span>
            <span className="stat-value">{maxRows}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Positive:</span>
            <span className="stat-value positive">
              {filteredColumns.reduce((sum, c) => sum + c.symbols.filter(s => s.pnl > 0).length, 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Negative:</span>
            <span className="stat-value negative">
              {filteredColumns.reduce((sum, c) => sum + c.symbols.filter(s => s.pnl <= 0).length, 0)}
            </span>
          </div>
        </div>
      </header>
      
      <div className="table-container">
        <table className="strategy-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={col.run_id} className="run-header">
                  <div className="run-header-info">
                    <div className="run-id" title={col.run_id}>
                      Run #{index + 1}
                    </div>
                    <div className="run-date">{formatDate(col.created_at)}</div>
                    <div className="run-time">⏰ {formatTime(col.created_at)}</div>
                    <div className="run-uuid-container">
                      <div className="run-uuid" title={`Full UUID: ${col.run_id}`}>
                        🆔 {formatRunId(col.run_id)}
                      </div>
                      <button
                        className="copy-btn"
                        onClick={() => copyRunId(col.run_id)}
                        title="Copy full run_id to clipboard"
                      >
                        {copiedRunId === col.run_id ? '✓' : '📋'}
                      </button>
                    </div>
                    
                    {/* Overall Trade Stats */}
                    <div className="run-trade-stats">
                      <div className="trade-stat-item">
                        <span className="stat-icon">📊</span>
                        <span className="stat-text">
                          {col.total_trades.toLocaleString()} trades
                        </span>
                      </div>
                      <div className="trade-stat-item">
                        <span className="stat-icon">🎯</span>
                        <span className="stat-text">
                          WR: {(col.overall_winrate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="run-basic-stats">
                      <span className="positive">✓{col.positive_count}</span>
                      {' / '}
                      <span className="neutral">●{col.neutral_count}</span>
                      {' / '}
                      <span className="negative">✗{col.negative_count}</span>
                    </div>
                  </div>
                  
                  {/* Overall Statistics Box */}
                  <div className="run-overall-stats">
                    <div className="stats-title">📊 Overall ({col.total_symbols} symbols)</div>
                    
                    <div className="stat-group all">
                      <div className="stat-label">All Coins</div>
                      <div className="stat-line">
                        <span>Avg: {formatPNL(col.avg_pnl_all)}</span>
                      </div>
                      <div className="stat-line-range">
                        <span>Min: {formatPNL(col.min_pnl_all)}</span>
                        <span>Max: {formatPNL(col.max_pnl_all)}</span>
                      </div>
                    </div>
                    
                    <div className="stat-group positive">
                      <div className="stat-label">✓ Positive ({col.positive_count})</div>
                      <div className="stat-line">
                        <span>Avg: {formatPNL(col.avg_pnl_positive)}</span>
                      </div>
                      <div className="stat-line-range">
                        <span>Min: {formatPNL(col.min_pnl_positive)}</span>
                        <span>Max: {formatPNL(col.max_pnl_positive)}</span>
                      </div>
                    </div>
                    
                    <div className="stat-group negative">
                      <div className="stat-label">✗ Negative ({col.negative_count})</div>
                      <div className="stat-line">
                        <span>Avg: {formatPNL(col.avg_pnl_negative)}</span>
                      </div>
                      <div className="stat-line-range">
                        <span>Min: {formatPNL(col.min_pnl_negative)}</span>
                        <span>Max: {formatPNL(col.max_pnl_negative)}</span>
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {filteredColumns.map(col => {
                  const symbolData = col.symbols[rowIndex]
                  
                  if (!symbolData) {
                    return <td key={col.run_id} className="empty-cell"></td>
                  }
                  
                  const pnlClass = symbolData.pnl > 0 ? 'pnl-positive' : 'pnl-negative'
                  
                  return (
                    <td 
                      key={col.run_id} 
                      className={`symbol-cell ${pnlClass}`}
                      title={`${symbolData.symbol}
━━━━━━━━━━━━━━━━━━━━━━━━
📊 Symbol PNL: ${formatPNL(symbolData.pnl)}
━━━━━━━━━━━━━━━━━━━━━━━━
📈 Symbol Trade Averages:
  • Positive Trades Avg: ${formatPNL(symbolData.avg_pnl_positive)}
  • Negative Trades Avg: ${formatPNL(symbolData.avg_pnl_negative)}
━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Winrate: ${formatWinrate(symbolData.winrate)}
📊 Trades: ${symbolData.trades_count.toLocaleString()}
⚡ Sharpe: ${symbolData.sharpe.toFixed(2)}
📉 Max DD: ${symbolData.max_dd.toFixed(2)}`}
                    >
                      <div className="symbol-name">{symbolData.symbol}</div>
                      <div className="metrics">
                        <span className="winrate">🎯 {formatWinrate(symbolData.winrate)}</span>
                        <br />
                        <span className="pnl" style={{ fontWeight: 'bold', fontSize: '0.95em' }}>
                          {formatPNL(symbolData.pnl)}
                        </span>
                        <br />
                        <div className="pnl-stats" style={{ 
                          fontSize: '0.65em', 
                          marginTop: '4px',
                          padding: '4px',
                          background: 'rgba(0,0,0,0.2)',
                          borderRadius: '4px',
                          lineHeight: '1.4'
                        }}>
                          <div style={{ color: '#00ff88', fontWeight: '500' }}>
                            ✓ {formatPNL(symbolData.avg_pnl_positive)}
                          </div>
                          <div style={{ color: '#ff6b6b', fontWeight: '500' }}>
                            ✗ {formatPNL(symbolData.avg_pnl_negative)}
                          </div>
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <footer className="page-footer">
        <p>💡 Her kolon kendi içinde PNL'e göre sıralanmıştır (en yüksek üstte)</p>
        <p>🎨 Yeşil: Pozitif PNL | Kırmızı: Negatif PNL</p>
        <p>🔍 Zoom out yaparak daha fazla kolon görebilirsiniz</p>
      </footer>
    </div>
  )
}
