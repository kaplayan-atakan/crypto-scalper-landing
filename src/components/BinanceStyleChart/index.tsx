import React, { useEffect, useRef } from 'react'
import type { OHLCPoint } from '../../types/coingecko'

interface BinanceStyleChartProps {
  data: OHLCPoint[]
  volumeData?: Array<{ time: number; value: number; color?: string }>
  height?: number
  showVolume?: boolean
  tradeTimestamp?: string
}

/**
 * Binance-Style Professional Candlestick Chart
 * Uses lightweight-charts for high-performance, professional trading UI
 * 
 * CRITICAL: Uses dynamic import to avoid SSR/HMR issues with lightweight-charts
 */
export function BinanceStyleChart({
  data,
  volumeData = [],
  height = 400,
  showVolume = true,
  tradeTimestamp,
}: BinanceStyleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candlestickSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const didInitRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (didInitRef.current) {
      console.log('⏭️ BinanceStyleChart: Skipping double init (StrictMode)')
      return
    }

    if (!chartContainerRef.current || data.length === 0) return

    const container = chartContainerRef.current
    let cleanupFn: (() => void) | null = null

    console.log('📊 BinanceStyleChart: Creating chart with', data.length, 'candles')

    // Dynamic import to avoid SSR/HMR issues with lightweight-charts
    ;(async () => {
      try {
        // Import lightweight-charts dynamically (client-only)
        const { createChart } = await import('lightweight-charts')

        if (!container || !container.clientWidth) {
          console.error('❌ BinanceStyleChart: Container not ready')
          return
        }

        // Create chart with Binance styling
        const chartInstance = createChart(container, {
          width: container.clientWidth,
          height,

          layout: {
            background: { color: '#1e2329' },
            textColor: '#848e9c',
            fontSize: 11,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "SF Mono", monospace',
          },

          grid: {
            vertLines: {
              color: 'rgba(255, 255, 255, 0.05)',
              style: 0,
              visible: true,
            },
            horzLines: {
              color: 'rgba(255, 255, 255, 0.08)',
              style: 0,
              visible: true,
            },
          },

          crosshair: {
            mode: 1, // Normal crosshair
            vertLine: {
              color: 'rgba(255, 255, 255, 0.3)',
              width: 1,
              style: 0,
              labelVisible: false,
            },
            horzLine: {
              color: 'rgba(255, 255, 255, 0.3)',
              width: 1,
              style: 0,
              labelVisible: true,
              labelBackgroundColor: '#2b3139',
            },
          },

          rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderVisible: true,
            scaleMargins: {
              top: 0.1,
              bottom: showVolume ? 0.3 : 0.1,
            },
            entireTextOnly: false,
          },

          timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderVisible: true,
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 5,
            barSpacing: 8,
            minBarSpacing: 3,
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: true,
          },

          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
          },

          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        })

        // Verify chart API
        if (!chartInstance || typeof (chartInstance as any).addCandlestickSeries !== 'function') {
          console.error('❌ BinanceStyleChart: Invalid chart API - addCandlestickSeries not found')
          return
        }

        chartRef.current = chartInstance
        didInitRef.current = true

        console.log('✅ BinanceStyleChart: Chart instance created')

        // Add candlestick series with Binance colors
        const candlestickSeries = (chartInstance as any).addCandlestickSeries({
          upColor: '#0ecb81', // Binance green
          downColor: '#f6465d', // Binance red
          borderUpColor: '#0ecb81',
          borderDownColor: '#f6465d',
          wickUpColor: '#0ecb81',
          wickDownColor: '#f6465d',
          borderVisible: true,
          wickVisible: true,
          priceLineVisible: true,
          lastValueVisible: true,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        })

        candlestickSeriesRef.current = candlestickSeries

        // Convert OHLCPoint[] to candlestick data
        const candlestickData = data.map((candle) => ({
          time: candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }))

        candlestickSeries.setData(candlestickData)

        console.log('✅ Candlestick data loaded:', candlestickData.length, 'candles')

        // Add volume histogram if data available
        if (showVolume && volumeData.length > 0) {
          const volumeSeries = (chartInstance as any).addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: '', // Separate scale for volume
            scaleMargins: {
              top: 0.7, // Volume takes bottom 30%
              bottom: 0,
            },
          })

          volumeSeriesRef.current = volumeSeries

          // Color volume bars based on price direction
          const coloredVolumeData = volumeData.map((vol, idx) => {
            const isUp = idx === 0 || data[idx].close >= data[idx].open
            return {
              time: vol.time,
              value: vol.value,
              color: isUp ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)',
            }
          })

          volumeSeries.setData(coloredVolumeData)
          console.log('✅ Volume data loaded:', coloredVolumeData.length, 'bars')
        }

        // Current price line (last close price)
        if (data.length > 0) {
          const lastCandle = data[data.length - 1]
          candlestickSeries.createPriceLine({
            price: lastCandle.close,
            color: '#2962ff',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: '',
          })
          console.log('✅ Current price line:', lastCandle.close)
        }

        // Trade execution marker (vertical line)
        if (tradeTimestamp) {
          const tradeTime = Math.floor(new Date(tradeTimestamp).getTime() / 1000)
          console.log('🎯 Trade marker at:', new Date(tradeTime * 1000).toISOString())

          // Create a price line at trade time (will appear as vertical marker on hover)
          // Note: lightweight-charts doesn't have vertical markers directly,
          // but we can add a custom marker
          const markers = [
            {
              time: tradeTime,
              position: 'inBar' as const,
              color: '#ff0066',
              shape: 'arrowUp' as const,
              text: 'Trade',
            },
          ]
          candlestickSeries.setMarkers(markers)
        }

        // Fit content
        chartInstance.timeScale().fitContent()

        // Responsive resize
        const handleResize = () => {
          if (container && chartInstance) {
            chartInstance.applyOptions({
              width: container.clientWidth,
            })
          }
        }

        window.addEventListener('resize', handleResize)

        // Setup cleanup function
        cleanupFn = () => {
          console.log('🧹 BinanceStyleChart: Cleaning up chart')
          window.removeEventListener('resize', handleResize)
          if (chartInstance) {
            chartInstance.remove()
          }
          chartRef.current = null
          candlestickSeriesRef.current = null
          volumeSeriesRef.current = null
          didInitRef.current = false
        }
      } catch (err) {
        console.error('❌ BinanceStyleChart: Failed to create chart:', err)
      }
    })()

    // Cleanup
    return () => {
      if (cleanupFn) {
        cleanupFn()
      }
    }
  }, [data, volumeData, height, showVolume, tradeTimestamp])

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e2329',
          borderRadius: '8px',
          color: '#848e9c',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div style={{ fontSize: '14px' }}>No chart data available</div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={chartContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  )
}
