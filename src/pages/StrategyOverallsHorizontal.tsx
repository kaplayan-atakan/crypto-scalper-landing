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
        // Sort each run's symbols by PNL DESC (highest first)
        const sortedData = data.map(run => ({
          ...run,
          symbols: [...run.symbols].sort((a, b) => b.pnl - a.pnl)
        }))
        setColumns(sortedData)
      } catch (err) {
        console.error('Failed to load backtest data:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Get all unique symbols across all runs (no sorting here, just collection)
  const allSymbols = useMemo(() => {
    const symbolSet = new Set<string>()
    columns.forEach(run => {
      run.symbols.forEach(s => symbolSet.add(s.symbol))
    })
    return Array.from(symbolSet)
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
  
  // Align columns (symbols) to match selected run's symbol order
  const alignColumnsToRun = (targetRunId: string) => {
    if (alignedSymbol === targetRunId) {
      // Toggle off alignment
      setAlignedSymbol(null)
      return
    }
    setAlignedSymbol(targetRunId)
  }
  
  // Get symbol order for display
  // If aligned: use target run's symbol order for ALL runs
  // If not aligned: each run uses its own symbol order (already sorted by PNL DESC)
  const getSymbolsForRun = (run: RunColumn): string[] => {
    const filtered = filterSymbols(run.symbols.map(s => s.symbol))
    
    if (!alignedSymbol) {
      // No alignment: use this run's own symbol order (already PNL sorted)
      return filtered
    }
    
    // Alignment active: use target run's symbol order
    const targetRun = columns.find(r => r.run_id === alignedSymbol)
    if (!targetRun) return filtered
    
    // Get target run's symbol order
    const targetOrder = targetRun.symbols.map(s => s.symbol)
    
    // Reorder current run's symbols to match target order
    const orderedSymbols: string[] = []
    const remainingSet = new Set(filtered)
    
    // First: add symbols in target order
    targetOrder.forEach(symbol => {
      if (remainingSet.has(symbol)) {
        orderedSymbols.push(symbol)
        remainingSet.delete(symbol)
      }
    })
    
    // Second: add remaining symbols in current run's PNL order
    const remaining = filtered.filter(s => remainingSet.has(s))
    orderedSymbols.push(...remaining)
    
    return orderedSymbols
  }
  
  // Display data
  const displayRuns = [...columns].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  
  // Get max number of columns needed (for table structure)
  const maxSymbolCount = useMemo(() => {
    return Math.max(...displayRuns.map(run => 
      filterSymbols(run.symbols.map(s => s.symbol)).length
    ), 0)
  }, [displayRuns, searchQuery, filterType])
  
  // Format helpers
  const formatWinrate = (wr: number | null) => {
    if (wr == null) return 'N/A'
    return `${(wr * 100).toFixed(1)}%`
  }
  
  const formatPNL = (pnl: number | null) => {
    if (pnl == null) return 'N/A'
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
            <span className="stat-label">Max Columns:</span>
            <span className="stat-value">{maxSymbolCount}</span>
          </div>
        </div>
      </header>
      
      <div className="table-container">
        <table className="strategy-table-horizontal">
          <tbody>
            {/* Each row = one run */}
            {displayRuns.map((run, runIndex) => {
              const runSymbols = getSymbolsForRun(run)
              const symbolDataMap = new Map(run.symbols.map(s => [s.symbol, s]))
              
              return (
                <React.Fragment key={run.run_id}>
                  {/* Run info row */}
                  <tr className="run-row">
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
                          <span>🎯 WR: {run.overall_winrate != null ? (run.overall_winrate * 100).toFixed(1) : 'N/A'}%</span>
                        </div>
                    
                        <div className="run-split">
                          <span className="positive">✓{run.positive_count}</span>
                          <span className="neutral">●{run.neutral_count}</span>
                          <span className="negative">✗{run.negative_count}</span>
                        </div>
                        
                        <div className="run-overall-compact">
                          <div className="overall-label">📈 ALL COINS</div>
                          Avg {formatPNL(run.avg_pnl_all)} | 
                          Min {formatPNL(run.min_pnl_all)} / Max {formatPNL(run.max_pnl_all)}
                        </div>
                        
                        {/* Top 40 Overall Statistics */}
                        {run.top40_avg_pnl != null && (
                          <div className="run-top40-compact">
                            <div className="top40-header">
                              <span className="top40-label">🏆 TOP 40 COINS</span>
                              <span className="top40-split">
                                <span className="positive">✓{run.top40_positive_count}</span>
                                <span className="neutral">●{run.top40_neutral_count}</span>
                                <span className="negative">✗{run.top40_negative_count}</span>
                              </span>
                            </div>
                            <div className="top40-stats">
                              <span>📊 {run.top40_total_trades?.toLocaleString()} trades</span>
                              <span>🎯 WR: {run.top40_overall_winrate != null ? (run.top40_overall_winrate * 100).toFixed(1) : 'N/A'}%</span>
                            </div>
                            <div className="top40-pnl">
                              Avg {formatPNL(run.top40_avg_pnl ?? null)} | 
                              Min {formatPNL(run.top40_min_pnl ?? null)} / Max {formatPNL(run.top40_max_pnl ?? null)}
                            </div>
                            <div className="top40-trades">
                              <span className="positive">✓ {formatPNL(run.top40_avg_pnl_positive ?? null)}</span>
                              <span className="negative">✗ {formatPNL(run.top40_avg_pnl_negative ?? null)}</span>
                            </div>
                          </div>
                        )}
                        
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
                        
                        {/* Align All Runs Button */}
                        <button
                          className={`align-btn ${alignedSymbol === run.run_id ? 'active' : ''}`}
                          onClick={() => alignColumnsToRun(run.run_id)}
                          title={alignedSymbol === run.run_id ? 'Clear alignment' : 'Align all runs to this run\'s symbol order'}
                        >
                          {alignedSymbol === run.run_id ? '🔓 Clear' : '🔗 Align All'}
                        </button>
                      </div>
                    </td>
                    
                    {/* Symbol data columns - each run shows its own symbol order */}
                    {runSymbols.map(symbol => {
                      const symbolData = symbolDataMap.get(symbol)
                      
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
⚡ Sharpe: ${symbolData.sharpe != null ? symbolData.sharpe.toFixed(2) : 'N/A'}
📉 Max DD: ${symbolData.max_dd != null ? symbolData.max_dd.toFixed(2) : 'N/A'}`}
                        >
                          <div className="metrics-compact">
                            <div className="symbol-name-in-card">{symbol}</div>
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
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
