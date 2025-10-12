import React, { useState, useEffect, useMemo } from 'react';
import { SimpleCandlestickChart } from '../SimpleCandlestickChart';
import { useCoinGecko } from '../../hooks/useCoinGecko';
import { formatPrice } from '../../utils/priceFormatter';
import { getCoinDisplayName, getShortReason, formatRelativeTime } from '../../utils/tradeFilters';
import { CacheTTL, ChartTimeframe } from '../../types/coingecko';
import type { OHLCPoint } from '../../types/coingecko';
import type { ClosedTradeSimple } from '../../types/supabase';
import '../MultiCoinChartSection/MultiCoinChartSection.css';

interface MiniTradeChartProps {
  trade: ClosedTradeSimple | null;
  title: string;
  color: 'orange' | 'purple' | 'cyan' | 'green';
  onDetailClick?: (trade: ClosedTradeSimple) => void;
}

/**
 * Mini trade chart card for dashboard overview
 * Shows compact chart with trade info and quick stats
 */
export function MiniTradeChart({ trade, title, color, onDetailClick }: MiniTradeChartProps) {
  // Memoize config to prevent unnecessary re-renders
  const coinGeckoConfig = useMemo(() => ({
    mode: 'ohlc' as const,
    timeframe: ChartTimeframe.FIVE_MIN,
    cacheTtl: CacheTTL.MEDIUM // 4 hours cache for mini charts
  }), []);

  const { data, loading, error } = useCoinGecko(
    trade?.symbol || '',
    trade?.created_at || '',
    coinGeckoConfig
  );

  // Type guard to check if data is OHLC
  const isOHLCData = (d: typeof data): d is OHLCPoint[] => {
    return d !== null && d.length > 0 && 'open' in d[0];
  };

  // If no trade data, show empty state
  if (!trade) {
    return (
      <div className="mini-trade-card mini-trade-card--empty">
        <h3 className="mini-trade-card__title">
          {title}
        </h3>
        <div className="mini-trade-card__empty">
          <div className="mini-trade-card__empty-icon">📊</div>
          <div className="mini-trade-card__empty-text">No trades yet</div>
        </div>
      </div>
    );
  }

  const displayName = getCoinDisplayName(trade.symbol);
  const shortReason = getShortReason(trade.reason);
  const relativeTime = formatRelativeTime(trade.created_at);

  return (
    <div
      className={`mini-trade-card mini-trade-card--${color}`}
      onClick={() => onDetailClick?.(trade)}
    >
      {/* Header */}
      <div className="mini-trade-card__header">
        <div className="mini-trade-card__title-group">
          <h3 className="mini-trade-card__title">{title}</h3>
          <div className="mini-trade-card__subtitle">
            {displayName}
          </div>
        </div>
        <div className="mini-trade-card__stats">
          <div
            className={`mini-trade-card__pnl ${
              trade.pnl >= 0 ? 'mini-trade-card__pnl--positive' : 'mini-trade-card__pnl--negative'
            }`}
          >
            {trade.pnl >= 0 ? '+' : ''}
            {trade.pnl.toFixed(2)}%
          </div>
          <div className="mini-trade-card__time">
            {relativeTime}
          </div>
        </div>
      </div>

      {/* Trade Info Pills */}
      <div className="mini-trade-card__pills">
        <span className="mini-trade-pill mini-trade-pill--score">
          Score: {trade.score.toFixed(2)}
        </span>
        <span
          className="mini-trade-pill mini-trade-pill--reason"
          title={shortReason}
        >
          {shortReason}
        </span>
      </div>

      {/* Chart */}
      <div className="mini-trade-card__chart">
        {loading ? (
          <div className="mini-trade-card__chart-loading">
            <div className="mini-trade-card__chart-spinner" />
            <div className="mini-trade-card__chart-text">Loading chart...</div>
          </div>
        ) : error ? (
          <div className="mini-trade-card__chart-error">
            <div className="mini-trade-card__chart-icon">⚠️</div>
            <div className="mini-trade-card__chart-text">Chart unavailable</div>
          </div>
        ) : data && isOHLCData(data) ? (
          <SimpleCandlestickChart
            data={data}
            height={192}
            accentColor={color}
            tradeExecutionTime={new Date(trade.created_at)}
            compactMode={true}
          />
        ) : (
          <div className="mini-trade-card__chart-empty">
            <div className="mini-trade-card__chart-icon">📊</div>
            <div className="mini-trade-card__chart-text">No data</div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mini-trade-card__quick-stats">
        <div className="mini-stat">
          <div className="mini-stat__label">Score</div>
          <div className="mini-stat__value">{trade.score.toFixed(2)}</div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat__label">R1M</div>
          <div className="mini-stat__value">{trade.r1m.toFixed(2)}</div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat__label">ATR5M</div>
          <div className="mini-stat__value">{trade.atr5m.toFixed(4)}</div>
        </div>
      </div>

      {/* Click hint */}
      <div className="mini-trade-card__footer">
        Click for full details →
      </div>
    </div>
  );
}
