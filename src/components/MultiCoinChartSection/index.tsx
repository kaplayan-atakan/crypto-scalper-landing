import React, { useMemo } from 'react';
import LiveMarketChart from '../LiveMarketChart';
import { MiniTradeChart } from '../MiniTradeChart';
import { getLatestTradeBySymbol, getLatestOtherTrades } from '../../utils/tradeFilters';
import type { ClosedTradeSimple } from '../../types/supabase';
import './MultiCoinChartSection.css';

interface MultiCoinChartSectionProps {
  trades: ClosedTradeSimple[];
  isLoading?: boolean;
  onTradeClick?: (trade: ClosedTradeSimple) => void;
}

/**
 * Multi-Coin Comparison Chart Section
 * Displays 2x2 grid:
 * - Top-Left: BTC Live Market (real-time market data)
 * - Top-Right: ETH Live Market (real-time market data)
 * - Bottom-Left: Most recent trade from other coins
 * - Bottom-Right: 2nd most recent trade from other coins
 * 
 * BTC/ETH show LIVE MARKET CONDITIONS (trade-independent)
 * Other coins show HISTORICAL TRADE DATA (trade-based)
 */
export function MultiCoinChartSection({
  trades,
  isLoading = false,
  onTradeClick,
}: MultiCoinChartSectionProps) {
  // Memoize trade filtering to prevent unnecessary recalculations
  // Note: BTC/ETH no longer needed for charts (live market data used instead)
  // Only filtering for display count purposes
  const { latestOthers } = useMemo(() => {
    const others = getLatestOtherTrades(trades, 2);

    return {
      latestOthers: others,
    };
  }, [trades]);

  if (isLoading && trades.length === 0) {
    return (
      <section className="multicoin-section">
        <div className="multicoin-header">
          <div className="multicoin-header__content">
            <h2 className="multicoin-header__title">
              📊 Market Overview - Latest Trades
            </h2>
          </div>
        </div>
        <div className="multicoin-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="multicoin-skeleton">
              <div className="multicoin-skeleton__title"></div>
              <div className="multicoin-skeleton__chart"></div>
              <div className="multicoin-skeleton__footer"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="multicoin-section">
      {/* Section Header */}
      <div className="multicoin-header">
        <div className="multicoin-header__content">
          <h2 className="multicoin-header__title">
            📊 Market Overview - Live BTC/ETH + Latest Trades
          </h2>
          <p className="multicoin-header__subtitle">
            Real-time BTC/ETH market monitoring + recent bot trades with historical charts
          </p>
        </div>
        <div className="multicoin-header__badge">
          {trades.length} total trades
        </div>
      </div>

      {/* 2x2 Grid Layout */}
      <div className="multicoin-grid">
        {/* Top-Left: BTC Live Market (Real-time) */}
        <LiveMarketChart
          symbol="BTCUSDT"
          coinId="bitcoin"
          color="orange"
        />

        {/* Top-Right: ETH Live Market (Real-time) */}
        <LiveMarketChart
          symbol="ETHUSDT"
          coinId="ethereum"
          color="purple"
        />

        {/* Bottom-Left: Latest Other Trade #1 */}
        <MiniTradeChart
          trade={latestOthers[0]}
          title="Latest Trade"
          color="cyan"
          onDetailClick={onTradeClick}
        />

        {/* Bottom-Right: Latest Other Trade #2 */}
        <MiniTradeChart
          trade={latestOthers[1]}
          title="2nd Latest Trade"
          color="green"
          onDetailClick={onTradeClick}
        />
      </div>

      {/* Info Footer */}
      <div className="multicoin-info">
        <div className="multicoin-info__icon">💡</div>
        <div className="multicoin-info__text">
          <strong>How it works:</strong> BTC and ETH cards (orange/purple borders) show
          <strong> LIVE MARKET CONDITIONS</strong> - real-time price, 24h change, and current
          market stats. These update every 60 seconds and are trade-independent. The other two 
          cards (cyan/green borders) show <strong>HISTORICAL TRADE DATA</strong> from your bot's 
          recent trades with 4-hour price history and trade markers (🎯). Click any trade card 
          to see full details.
        </div>
      </div>
    </section>
  );
}
