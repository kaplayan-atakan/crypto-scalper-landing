import React, { useRef, useEffect } from 'react';
import type { OHLCPoint } from '../../types/coingecko';

interface SimpleCandlestickChartProps {
  data: OHLCPoint[];
  height: number;
  accentColor?: 'orange' | 'purple' | 'cyan' | 'green';
  tradeExecutionTime?: Date;
  compactMode?: boolean;
  showCurrentPriceLine?: boolean;
  currentPrice?: number;
}

/**
 * Simplified candlestick chart for mini trade cards
 * Uses canvas for better performance with compact layout
 */
export function SimpleCandlestickChart({
  data,
  height,
  accentColor = 'cyan',
  tradeExecutionTime,
  compactMode = false,
  showCurrentPriceLine = false,
  currentPrice,
}: SimpleCandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Color scheme
    const colorScheme = {
      orange: { up: '#f97316', down: '#dc2626', wick: '#fb923c', bg: '#1f2937' },
      purple: { up: '#a855f7', down: '#dc2626', wick: '#c084fc', bg: '#1f2937' },
      cyan: { up: '#06b6d4', down: '#dc2626', wick: '#22d3ee', bg: '#1f2937' },
      green: { up: '#10b981', down: '#dc2626', wick: '#34d399', bg: '#1f2937' },
    };
    const colors = colorScheme[accentColor];

    // Clear canvas
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, rect.width, height);

    // Calculate price range
    const prices = data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    // Scale functions
    const scaleY = (price: number) => {
      return height - ((price - minPrice + padding) / (priceRange + 2 * padding)) * height;
    };

    const candleWidth = rect.width / data.length;
    const wickWidth = 2;

    // Draw candles
    data.forEach((candle, i) => {
      const x = i * candleWidth + candleWidth / 2;
      const isUp = candle.close >= candle.open;
      const color = isUp ? colors.up : colors.down;

      // Draw wick
      ctx.strokeStyle = colors.wick;
      ctx.lineWidth = wickWidth;
      ctx.beginPath();
      ctx.moveTo(x, scaleY(candle.high));
      ctx.lineTo(x, scaleY(candle.low));
      ctx.stroke();

      // Draw body
      const bodyTop = Math.min(candle.open, candle.close);
      const bodyBottom = Math.max(candle.open, candle.close);
      const bodyHeight = Math.max(scaleY(bodyTop) - scaleY(bodyBottom), 1);
      
      ctx.fillStyle = color;
      ctx.fillRect(
        x - candleWidth * 0.3,
        scaleY(bodyBottom),
        candleWidth * 0.6,
        bodyHeight
      );
    });

    // Draw trade marker
    if (tradeExecutionTime) {
      const tradeTs = Math.floor(tradeExecutionTime.getTime() / 1000);
      const closestIndex = data.findIndex(d => d.timestamp >= tradeTs);
      
      if (closestIndex !== -1) {
        const x = closestIndex * candleWidth + candleWidth / 2;
        const candle = data[closestIndex];
        const y = scaleY(candle.low) + 15;

        // Draw arrow
        ctx.fillStyle = colors.up;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 8);
        ctx.lineTo(x + 5, y + 8);
        ctx.closePath();
        ctx.fill();

        // Draw target emoji
        if (!compactMode) {
          ctx.font = '16px Arial';
          ctx.fillText('🎯', x - 8, y - 5);
        }
      }
    }

    // Draw grid lines (horizontal only in compact mode)
    if (!compactMode) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw current price line (for live market charts)
    if (showCurrentPriceLine && currentPrice) {
      const y = scaleY(currentPrice);
      
      // Draw solid line
      ctx.strokeStyle = colors.up;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();

      // Draw price label
      ctx.fillStyle = colors.up;
      ctx.font = 'bold 12px Arial';
      const priceText = `$${currentPrice.toFixed(2)}`;
      const textWidth = ctx.measureText(priceText).width;
      
      // Background for label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(rect.width - textWidth - 12, y - 10, textWidth + 8, 20);
      
      // Price text
      ctx.fillStyle = colors.up;
      ctx.fillText(priceText, rect.width - textWidth - 8, y + 4);
    }

  }, [data, height, accentColor, tradeExecutionTime, compactMode, showCurrentPriceLine, currentPrice]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height: `${height}px` }}
      >
        No data available
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '8px',
      }}
    />
  );
}
