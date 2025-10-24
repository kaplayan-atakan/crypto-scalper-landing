import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchRunIdsLight, fetchRunSummary, fetchRunDetails, deleteBacktestRun } from '../services/backtestService'
import type { RunColumn, SymbolMetrics, RunNote } from '../types/supabase'
import { NoteButton } from '../components/NoteButton'
import { PinnedNoteDisplay } from '../components/PinnedNoteDisplay'
import { supabase } from '../lib/supabase'
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
  const [pinnedNotesMap, setPinnedNotesMap] = useState<Map<string, RunNote>>(new Map())
  
  // Cursor-based pagination state
  const [hasMoreRuns, setHasMoreRuns] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastCursor, setLastCursor] = useState<{ created_at: string; run_id: string } | null>(null)
  const runsPerPage = 20
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        
        // Step 1: Fetch first page of run IDs (cursor-based)
        const runIdList = await fetchRunIdsLight(runsPerPage, null, null)
        
        if (runIdList.length === 0) {
          setColumns([])
          setHasMoreRuns(false)
          setLoading(false)
          return
        }
        
        // Set cursor for next load
        if (runIdList.length === runsPerPage) {
          const lastItem = runIdList[runIdList.length - 1]
          setLastCursor({ created_at: lastItem.created_at, run_id: lastItem.run_id })
          setHasMoreRuns(true)
        } else {
          setHasMoreRuns(false)
        }
        
        // Step 2: Fetch summary for each run (one by one)
        const summaries: any[] = []
        for (const item of runIdList) {
          const summary = await fetchRunSummary(item.run_id)
          if (summary) {
            summaries.push(summary)
          }
        }
        
        // Step 3: Fetch details for these runs
        const runIds = summaries.map((s: any) => s.run_id)
        const detailsMap = await fetchRunDetails(runIds)
        
        // Step 4: Fetch top 40 stats
        const top40Map = new Map()
        try {
          const { data: top40Data, error: e3 } = await (supabase as any).rpc('get_top40_overall_by_runs', {
            run_ids: runIds
          })
          
          if (!e3 && top40Data) {
            top40Data.forEach((item: any) => {
              top40Map.set(item.run_id, item)
            })
          }
        } catch (error) {
          console.error('Error fetching top 40 stats:', error)
        }
        
        // Build columns and sort symbols by PNL
        const data: RunColumn[] = summaries.map((s: any) => {
          const top40 = top40Map.get(s.run_id)
          const symbols = detailsMap.get(s.run_id) || []
          return {
            run_id: s.run_id,
            created_at: s.created_at,
            total_symbols: s.total_symbols,
            total_trades: s.total_trades,
            overall_winrate: s.overall_winrate,
            positive_count: s.positive_pnl_count,
            negative_count: s.negative_pnl_count,
            neutral_count: s.neutral_pnl_count,
            avg_pnl_all: s.avg_pnl_all,
            min_pnl_all: s.min_pnl_all,
            max_pnl_all: s.max_pnl_all,
            avg_pnl_positive: s.avg_pnl_positive,
            min_pnl_positive: s.min_pnl_positive,
            max_pnl_positive: s.max_pnl_positive,
            avg_pnl_negative: s.avg_pnl_negative,
            min_pnl_negative: s.min_pnl_negative,
            max_pnl_negative: s.max_pnl_negative,
            top40_total_trades: top40?.top40_total_trades,
            top40_overall_winrate: top40?.top40_overall_winrate,
            top40_avg_pnl: top40?.top40_avg_pnl,
            top40_min_pnl: top40?.top40_min_pnl,
            top40_max_pnl: top40?.top40_max_pnl,
            top40_avg_pnl_positive: top40?.top40_avg_pnl_positive,
            top40_avg_pnl_negative: top40?.top40_avg_pnl_negative,
            top40_positive_count: top40?.top40_positive_count,
            top40_negative_count: top40?.top40_negative_count,
            top40_neutral_count: top40?.top40_neutral_count,
            symbols: [...symbols].sort((a: any, b: any) => b.pnl - a.pnl)
          }
        })
        
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

  // Load more runs (cursor-based pagination)
  const loadMoreRuns = async () => {
    if (!hasMoreRuns || loadingMore || !lastCursor) return
    
    try {
      setLoadingMore(true)
      
      // Fetch next page using cursor
      const runIdList = await fetchRunIdsLight(
        runsPerPage,
        lastCursor.created_at,
        lastCursor.run_id
      )
      
      if (runIdList.length === 0) {
        setHasMoreRuns(false)
        setLoadingMore(false)
        return
      }
      
      // Update cursor for next load
      if (runIdList.length === runsPerPage) {
        const lastItem = runIdList[runIdList.length - 1]
        setLastCursor({ created_at: lastItem.created_at, run_id: lastItem.run_id })
      } else {
        setHasMoreRuns(false)
      }
      
      // Fetch summaries
      const summaries: any[] = []
      for (const item of runIdList) {
        const summary = await fetchRunSummary(item.run_id)
        if (summary) {
          summaries.push(summary)
        }
      }
      
      // Fetch details
      const runIds = summaries.map((s: any) => s.run_id)
      const detailsMap = await fetchRunDetails(runIds)
      
      // Fetch top 40 stats
      const top40Map = new Map()
      try {
        const { data: top40Data, error: e3 } = await (supabase as any).rpc('get_top40_overall_by_runs', {
          run_ids: runIds
        })
        
        if (!e3 && top40Data) {
          top40Data.forEach((item: any) => {
            top40Map.set(item.run_id, item)
          })
        }
      } catch (error) {
        console.error('Error fetching top 40 stats:', error)
      }
      
      // Build new columns
      const newData: RunColumn[] = summaries.map((s: any) => {
        const top40 = top40Map.get(s.run_id)
        const symbols = detailsMap.get(s.run_id) || []
        return {
          run_id: s.run_id,
          created_at: s.created_at,
          total_symbols: s.total_symbols,
          total_trades: s.total_trades,
          overall_winrate: s.overall_winrate,
          positive_count: s.positive_pnl_count,
          negative_count: s.negative_pnl_count,
          neutral_count: s.neutral_pnl_count,
          avg_pnl_all: s.avg_pnl_all,
          min_pnl_all: s.min_pnl_all,
          max_pnl_all: s.max_pnl_all,
          avg_pnl_positive: s.avg_pnl_positive,
          min_pnl_positive: s.min_pnl_positive,
          max_pnl_positive: s.max_pnl_positive,
          avg_pnl_negative: s.avg_pnl_negative,
          min_pnl_negative: s.min_pnl_negative,
          max_pnl_negative: s.max_pnl_negative,
          top40_total_trades: top40?.top40_total_trades,
          top40_overall_winrate: top40?.top40_overall_winrate,
          top40_avg_pnl: top40?.top40_avg_pnl,
          top40_min_pnl: top40?.top40_min_pnl,
          top40_max_pnl: top40?.top40_max_pnl,
          top40_avg_pnl_positive: top40?.top40_avg_pnl_positive,
          top40_avg_pnl_negative: top40?.top40_avg_pnl_negative,
          top40_positive_count: top40?.top40_positive_count,
          top40_negative_count: top40?.top40_negative_count,
          top40_neutral_count: top40?.top40_neutral_count,
          symbols: [...symbols].sort((a: any, b: any) => b.pnl - a.pnl)
        }
      })
      
      // Append to existing columns
      setColumns(prev => [...prev, ...newData])
      
    } catch (error) {
      console.error('Failed to load more runs:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Batch load pinned notes for all runs
  useEffect(() => {
    if (columns.length === 0 || !supabase) return

    const loadAllPinnedNotes = async () => {
      if (!supabase) return // Extra null guard inside async
      
      try {
        const runIds = columns.map(c => c.run_id)
        
        // ✅ Single batch request for ALL pinned notes
        const { data, error } = await supabase
          .from('run_notes')
          .select('*')
          .in('run_id', runIds)
          .eq('is_pinned', true)
        
        if (error) throw error
        
        // Convert to Map for fast lookup
        const notes = data as RunNote[] || []
        const map = new Map(notes.map(note => [note.run_id, note]))
        setPinnedNotesMap(map)
        
        console.log(`✅ Loaded ${map.size} pinned notes in batch`)
      } catch (err) {
        console.error('Failed to load pinned notes:', err)
      }
    }

    loadAllPinnedNotes()
  }, [columns])

  // Listen for pin changes and refresh batch
  useEffect(() => {
    const handlePinChange = () => {
      if (columns.length === 0 || !supabase) return
      
      // Re-fetch all pinned notes when any pin changes
      const refreshPinnedNotes = async () => {
        if (!supabase) return // Extra null guard inside async
        
        const runIds = columns.map(c => c.run_id)
        const { data } = await supabase
          .from('run_notes')
          .select('*')
          .in('run_id', runIds)
          .eq('is_pinned', true)
        
        const notes = data as RunNote[] || []
        const map = new Map(notes.map(note => [note.run_id, note]))
        setPinnedNotesMap(map)
      }
      
      refreshPinnedNotes()
    }

    window.addEventListener('notesPinChanged', handlePinChange)
    return () => window.removeEventListener('notesPinChanged', handlePinChange)
  }, [columns])
  
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

  const handleDeleteRun = async (runId: string, runLabel: string) => {
    const confirmed = confirm(
      `⚠️ DELETE ${runLabel}?\n\n` +
      `This will permanently delete:\n` +
      `✗ All backtest results\n` +
      `✗ All trade summaries\n` +
      `✗ All notes for this run\n\n` +
      `⚠️ This action CANNOT be undone!\n\n` +
      `Click OK to delete permanently.`
    )
    
    if (!confirmed) return
    
    setLoading(true)
    const success = await deleteBacktestRun(runId)
    
    if (success) {
      // Reload data from start
      window.location.reload()
    } else {
      alert('❌ Failed to delete run. Check console for errors.')
      setLoading(false)
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
            <span className="stat-label">Loaded Runs:</span>
            <span className="stat-value">{columns.length}</span>
          </div>
          {hasMoreRuns && (
            <div className="stat-item">
              <span className="stat-label">Status:</span>
              <span className="stat-value">More available ⬇️</span>
            </div>
          )}
          <div className="stat-item">
            <span className="stat-label">Unique Symbols:</span>
            <span className="stat-value">{allSymbols.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Max Columns:</span>
            <span className="stat-value">{maxSymbolCount}</span>
          </div>
        </div>
        
        {/* Load More Button */}
        {hasMoreRuns && (
          <div className="pagination-controls">
            <button
              className="pagination-btn load-more-btn"
              onClick={loadMoreRuns}
              disabled={loadingMore}
            >
              {loadingMore ? '⏳ Loading...' : '📥 Load More Runs'}
            </button>
          </div>
        )}
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
                          <NoteButton runId={run.run_id} runLabel={`Run #${runIndex + 1}`} />
                          <span className="run-date">{formatDate(run.created_at)}</span>
                          <span className="run-time">⏰ {formatTime(run.created_at)}</span>
                        </div>

                        <PinnedNoteDisplay pinnedNote={pinnedNotesMap.get(run.run_id) || null} />
                        
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

                        {/* Delete Run Button */}
                        <button
                          className="delete-run-btn"
                          onClick={() => handleDeleteRun(run.run_id, `Run #${runIndex + 1}`)}
                          title="Delete this run permanently"
                        >
                          🗑️ Delete Run
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
