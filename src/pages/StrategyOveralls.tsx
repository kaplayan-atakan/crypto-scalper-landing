import React, { useState, useEffect } from 'react'
import { fetchAllRunColumns } from '../services/backtestService'
import type { RunColumn } from '../types/supabase'
import './StrategyOveralls.css'

export function StrategyOveralls() {
  const [columns, setColumns] = useState<RunColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
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
  
  // Format helpers
  const formatWinrate = (wr: number) => `${(wr * 100).toFixed(1)}%`
  
  const formatPNL = (pnl: number) => {
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
  
  const formatRunId = (runId: string) => {
    return runId.slice(0, 8)
  }
  
  // Find max rows needed (longest symbol list)
  const maxRows = Math.max(...columns.map(col => col.symbols.length), 0)
  
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
      <header className="page-header">
        <h1>📊 Strategy Overalls</h1>
        <p>Backtest sonuçlarını karşılaştırmalı analiz</p>
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-label">Total Runs:</span>
            <span className="stat-value">{columns.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Symbols:</span>
            <span className="stat-value">{maxRows}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Positive:</span>
            <span className="stat-value positive">
              {columns.reduce((sum, c) => sum + c.positive_count, 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Negative:</span>
            <span className="stat-value negative">
              {columns.reduce((sum, c) => sum + c.negative_count, 0)}
            </span>
          </div>
        </div>
      </header>
      
      <div className="table-container">
        <table className="strategy-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.run_id} className="run-header">
                  <div className="run-id" title={col.run_id}>
                    {formatRunId(col.run_id)}
                  </div>
                  <div className="run-date">{formatDate(col.created_at)}</div>
                  <div className="run-stats">
                    <span className="positive">+{col.positive_count}</span>
                    {' / '}
                    <span className="negative">-{col.negative_count}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(col => {
                  const symbolData = col.symbols[rowIndex]
                  
                  if (!symbolData) {
                    return <td key={col.run_id} className="empty-cell"></td>
                  }
                  
                  const pnlClass = symbolData.pnl > 0 ? 'pnl-positive' : 'pnl-negative'
                  
                  return (
                    <td 
                      key={col.run_id} 
                      className={`symbol-cell ${pnlClass}`}
                      title={`${symbolData.symbol}\nWinrate: ${formatWinrate(symbolData.winrate)}\nPNL: ${formatPNL(symbolData.pnl)}`}
                    >
                      <div className="symbol-name">{symbolData.symbol}</div>
                      <div className="metrics">
                        <span className="winrate">WR: {formatWinrate(symbolData.winrate)}</span>
                        <br />
                        <span className="pnl">PNL: {formatPNL(symbolData.pnl)}</span>
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
