import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllRunColumns } from '../services/backtestService'
import type { RunColumn, SymbolMetrics } from '../types/supabase'
import './StrategyOverallsHorizontal.css'

export function StrategyOverallsHorizontal() {
  const navigate = useNavigate()
  const [columns, setColumns] = useState<RunColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all')
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null)
  const [alignedSymbol, setAlignedSymbol] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
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
  
  // Get all unique symbols across all runs
  const allSymbols = useMemo(() => {
    const symbolSet = new Set<string>()
    columns.forEach(run => {
      run.symbols.forEach(s => symbolSet.add(s.symbol))
    })
    return Array.from(symbolSet).sort()
  }, [columns])
  
  // Transpose data: create map of symbol → runs
  const symbolToRunsMap = useMemo(() => {
    const map = new Map<string, Map<string, SymbolMetrics>>()
    
    columns.forEach(run => {
      run.symbols.forEach(symbol => {
        if (!map.has(symbol.symbol)) {
          map.set(symbol.symbol, new Map())
        }
        map.get(symbol.symbol)!.set(run.run_id, symbol)
      })
    })
    
    return map
  }, [columns])
  
  // Filter symbols based on search and filter type
  const filterSymbols = (symbols: string[]) => {
    return symbols.filter(symbol => {
      // Search query filter
      const matchesSearch = searchQuery === '' || 
        symbol.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (!matchesSearch) return false
      
      // PNL type filter - check if symbol has at least one matching run
      if (filterType === 'all') return true
      
      const runsForSymbol = symbolToRunsMap.get(symbol)
      if (!runsForSymbol) return false
      
      const hasMatchingRun = Array.from(runsForSymbol.values()).some(metrics => {
        if (filterType === 'positive') return metrics.pnl > 0
        if (filterType === 'neutral') return metrics.pnl === 0
        if (filterType === 'negative') return metrics.pnl < 0
        return false
      })
      
      return hasMatchingRun
    })
  }
  
  // Copy run_id to clipboard
  const copyRunId = async (runId: string) => {
    try {
      await navigator.clipboard.writeText(runId)
      setCopiedRunId(runId)
      setTimeout(() => setCopiedRunId(null), 2000)
    } catch (err) {
      console.error('Failed to copy run_id:', err)
    }
  }
  
  // Align rows (runs) to match selected symbol's PNL order
  const alignRowsToSymbol = (targetSymbol: string) => {
    if (alignedSymbol === targetSymbol) {
      setAlignedSymbol(null)
      return
    }
    setAlignedSymbol(targetSymbol)
  }
  
  // Get aligned runs when a symbol is selected
  const getAlignedRuns = (): RunColumn[] => {
    if (!alignedSymbol) return columns
    
    // Get PNL values for the target symbol across all runs
    const runPnlMap = new Map<string, number>()
    
    columns.forEach(run => {
      const symbolData = run.symbols.find(s => s.symbol === alignedSymbol)
      if (symbolData) {
        runPnlMap.set(run.run_id, symbolData.pnl)
      }
    })
    
    // Sort runs: those with target symbol first (by PNL desc), then others
    return [...columns].sort((a, b) => {
      const aPnl = runPnlMap.get(a.run_id)
      const bPnl = runPnlMap.get(b.run_id)
      
      // Both have the symbol: sort by PNL
      if (aPnl !== undefined && bPnl !== undefined) {
        return bPnl - aPnl
      }
      
      // Only a has symbol: a comes first
      if (aPnl !== undefined) return -1
      
      // Only b has symbol: b comes first
      if (bPnl !== undefined) return 1
      
      // Neither has symbol: maintain original order
      return 0
    })
  }
  
  // Display data
  const displaySymbols = filterSymbols(allSymbols)
  const displayRuns = getAlignedRuns()
  
  // Format helpers
  const formatWinrate = (wr: number) => `${(wr * 100).toFixed(1)}%`
  
  const formatPNL = (pnl: number) => {
    const sign = pnl > 0 ? '+' : ''
    return `${sign}${pnl.toFixed(4)}`
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
  
  if (loading) {
    return (
      <div className="strategy-overalls-horizontal">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading backtest data...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="strategy-overalls-horizontal">
        <div className="error-container">
          <p className="error-icon">⚠️</p>
          <p className="error-message">Error loading data: {error.message}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  if (columns.length === 0) {
    return (
      <div className="strategy-overalls-horizontal">
        <div className="empty-container">
          <p className="empty-icon">📊</p>
          <p className="empty-message">Henüz backtest verisi bulunamadı</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="strategy-overalls-horizontal">
      {/* Action Buttons - Top Right */}
      <div className="action-buttons">
        <button
          className="action-btn view-btn"
          onClick={() => navigate('/strategy-overalls')}
          title="Vertical View (Runs as Columns)"
        >
          📊 Vertical
        </button>
        <button
          className="action-btn home-btn"
          onClick={() => navigate('/')}
          title="Ana Sayfaya Dön"
        >
          🏠 Home
        </button>
        <button
          className="action-btn refresh-btn"
          onClick={() => window.location.reload()}
          title="Sayfayı Yenile"
        >
          🔄 Refresh
        </button>
      </div>
      
      <header className="page-header">
        <h1>📊 Strategy Overalls - Horizontal View</h1>
        <p>Runs as rows, symbols as columns</p>
        
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
              All ({allSymbols.length})
            </button>
            <button
              className={`filter-btn positive ${filterType === 'positive' ? 'active' : ''}`}
              onClick={() => setFilterType('positive')}
            >
              ✓ Positive
            </button>
            <button
              className={`filter-btn neutral ${filterType === 'neutral' ? 'active' : ''}`}
              onClick={() => setFilterType('neutral')}
            >
              ● Neutral
            </button>
            <button
              className={`filter-btn negative ${filterType === 'negative' ? 'active' : ''}`}
              onClick={() => setFilterType('negative')}
            >
              ✗ Negative
            </button>
          </div>
        </div>
        
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total Runs:</span>
            <span className="stat-value">{columns.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unique Symbols:</span>
            <span className="stat-value">{allSymbols.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Showing Symbols:</span>
            <span className="stat-value">{displaySymbols.length}</span>
          </div>
        </div>
        
        {/* Alignment Indicator */}
        {alignedSymbol && (
          <div className="alignment-indicator">
            🔗 Runs aligned to {alignedSymbol} PNL order
            <button 
              className="clear-alignment-btn"
              onClick={() => setAlignedSymbol(null)}
            >
              ✕ Clear
            </button>
          </div>
        )}
      </header>
      
      <div className="table-container">
        <table className="strategy-table-horizontal">
          <thead>
            <tr>
              {/* First header: Run Info Column */}
              <th className="run-info-header">
                <div className="header-title">Run Details</div>
              </th>
              
              {/* Symbol headers (one per column) */}
              {displaySymbols.map(symbol => (
                <th key={symbol} className="symbol-header">
                  <div className="symbol-header-content">
                    <div className="symbol-name">{symbol}</div>
                    <button
                      className={`align-btn ${alignedSymbol === symbol ? 'active' : ''}`}
                      onClick={() => alignRowsToSymbol(symbol)}
                      title={alignedSymbol === symbol ? 'Clear alignment' : 'Align runs to this symbol\'s PNL order'}
                    >
                      {alignedSymbol === symbol ? '🔓 Clear' : '🔗 Align'}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* Each row = one run */}
            {displayRuns.map((run, runIndex) => (
              <tr key={run.run_id}>
                {/* First column: Run info */}
                <td className="run-info-cell">
                  <div className="run-info-compact">
                    <div className="run-header-line">
                      <span className="run-id">Run #{runIndex + 1}</span>
                      <span className="run-date">{formatDate(run.created_at)}</span>
                      <span className="run-time">⏰ {formatTime(run.created_at)}</span>
                    </div>
                    
                    <div className="run-stats-line">
                      <span>📊 {run.total_trades.toLocaleString()} trades</span>
                      <span>🎯 WR: {(run.overall_winrate * 100).toFixed(1)}%</span>
                    </div>
                    
                    <div className="run-split">
                      <span className="positive">✓{run.positive_count}</span>
                      <span className="neutral">●{run.neutral_count}</span>
                      <span className="negative">✗{run.negative_count}</span>
                    </div>
                    
                    <div className="run-overall-compact">
                      Overall: Avg {formatPNL(run.avg_pnl_all)} | 
                      Min {formatPNL(run.min_pnl_all)} / Max {formatPNL(run.max_pnl_all)}
                    </div>
                    
                    <div className="run-actions">
                      <div className="run-uuid" title={`Full UUID: ${run.run_id}`}>
                        🆔 {formatRunId(run.run_id)}
                      </div>
                      <button 
                        className="copy-btn" 
                        onClick={() => copyRunId(run.run_id)}
                        title="Copy full run_id to clipboard"
                      >
                        {copiedRunId === run.run_id ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                </td>
                
                {/* Symbol data columns */}
                {displaySymbols.map(symbol => {
                  const symbolData = symbolToRunsMap.get(symbol)?.get(run.run_id)
                  
                  if (!symbolData) {
                    return <td key={symbol} className="empty-cell"></td>
                  }
                  
                  const pnlClass = symbolData.pnl > 0 ? 'pnl-positive' : 
                                  symbolData.pnl === 0 ? 'pnl-neutral' : 'pnl-negative'
                  
                  return (
                    <td 
                      key={symbol} 
                      className={`symbol-data-cell ${pnlClass}`}
                      title={`${symbol}
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
                      <div className="metrics-compact">
                        <span className="winrate">🎯 {formatWinrate(symbolData.winrate)}</span>
                        <span className="pnl">{formatPNL(symbolData.pnl)}</span>
                        <div className="pnl-stats-mini">
                          <div className="positive">✓ {formatPNL(symbolData.avg_pnl_positive)}</div>
                          <div className="negative">✗ {formatPNL(symbolData.avg_pnl_negative)}</div>
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
    </div>
  )
}
