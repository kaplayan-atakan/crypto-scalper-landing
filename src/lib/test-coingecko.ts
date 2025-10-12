// Test script to verify CoinGecko API integration
// Bu script ornek-gecko-kod.js ile aynı yaklaşımı kullanarak implementasyonumuzu test eder

import { symbolToCoinGeckoId, fetchMarketChartRange } from './coingecko'

async function testCoinGeckoIntegration() {
  console.log('🧪 Testing CoinGecko Integration...\n')

  // Test 1: Symbol Mapping
  console.log('📋 Test 1: Symbol to CoinGecko ID Mapping')
  const testSymbols = ['WUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'GMXUSDT', 'PENDLEUSDT']
  
  for (const symbol of testSymbols) {
    const coinId = symbolToCoinGeckoId(symbol)
    console.log(`  ${symbol} → ${coinId || '❌ NOT FOUND'}`)
  }
  console.log()

  // Test 2: API Fetch with Range (örnek kodla aynı yaklaşım)
  console.log('📡 Test 2: Fetching Market Data (4-hour range)')
  
  const nowSec = Math.floor(Date.now() / 1000)
  const fourHoursSec = 4 * 3600
  const from = nowSec - fourHoursSec
  const to = nowSec
  
  console.log(`  Time range: ${new Date(from * 1000).toISOString()} → ${new Date(to * 1000).toISOString()}`)
  console.log()

  // Test Bitcoin
  try {
    console.log('  Testing BTC/USDT...')
    const btcId = symbolToCoinGeckoId('BTCUSDT')
    if (!btcId) throw new Error('BTC coin ID not found')
    
    const btcData = await fetchMarketChartRange(btcId, 'usd', from, to)
    console.log(`  ✅ BTC Data received: ${btcData.prices?.length || 0} price points`)
    
    if (btcData.prices && btcData.prices.length > 0) {
      const firstPoint = btcData.prices[0]
      const lastPoint = btcData.prices[btcData.prices.length - 1]
      console.log(`     First: ${new Date(firstPoint[0]).toISOString()} - $${firstPoint[1].toFixed(2)}`)
      console.log(`     Last:  ${new Date(lastPoint[0]).toISOString()} - $${lastPoint[1].toFixed(2)}`)
    }
  } catch (error) {
    console.error('  ❌ BTC Test Failed:', (error as Error).message)
  }
  console.log()

  // Test Ethereum
  try {
    console.log('  Testing ETH/USDT...')
    const ethId = symbolToCoinGeckoId('ETHUSDT')
    if (!ethId) throw new Error('ETH coin ID not found')
    
    const ethData = await fetchMarketChartRange(ethId, 'usd', from, to)
    console.log(`  ✅ ETH Data received: ${ethData.prices?.length || 0} price points`)
    
    if (ethData.prices && ethData.prices.length > 0) {
      const firstPoint = ethData.prices[0]
      const lastPoint = ethData.prices[ethData.prices.length - 1]
      console.log(`     First: ${new Date(firstPoint[0]).toISOString()} - $${firstPoint[1].toFixed(2)}`)
      console.log(`     Last:  ${new Date(lastPoint[0]).toISOString()} - $${lastPoint[1].toFixed(2)}`)
    }
  } catch (error) {
    console.error('  ❌ ETH Test Failed:', (error as Error).message)
  }
  console.log()

  // Test WUSDT (user'ın orijinal sorunu)
  try {
    console.log('  Testing WUSDT (Wormhole)...')
    const wId = symbolToCoinGeckoId('WUSDT')
    if (!wId) throw new Error('WUSDT coin ID not found')
    
    console.log(`     Mapped to: ${wId}`)
    const wData = await fetchMarketChartRange(wId, 'usd', from, to)
    console.log(`  ✅ WUSDT Data received: ${wData.prices?.length || 0} price points`)
    
    if (wData.prices && wData.prices.length > 0) {
      const firstPoint = wData.prices[0]
      const lastPoint = wData.prices[wData.prices.length - 1]
      console.log(`     First: ${new Date(firstPoint[0]).toISOString()} - $${firstPoint[1].toFixed(2)}`)
      console.log(`     Last:  ${new Date(lastPoint[0]).toISOString()} - $${lastPoint[1].toFixed(2)}`)
    }
  } catch (error) {
    console.error('  ❌ WUSDT Test Failed:', (error as Error).message)
  }
  console.log()

  // Test Solana Ecosystem coin
  try {
    console.log('  Testing JUPUSDT (Jupiter - Solana)...')
    const jupId = symbolToCoinGeckoId('JUPUSDT')
    if (!jupId) throw new Error('JUPUSDT coin ID not found')
    
    console.log(`     Mapped to: ${jupId}`)
    const jupData = await fetchMarketChartRange(jupId, 'usd', from, to)
    console.log(`  ✅ JUPUSDT Data received: ${jupData.prices?.length || 0} price points`)
    
    if (jupData.prices && jupData.prices.length > 0) {
      const firstPoint = jupData.prices[0]
      const lastPoint = jupData.prices[jupData.prices.length - 1]
      console.log(`     First: ${new Date(firstPoint[0]).toISOString()} - $${firstPoint[1].toFixed(2)}`)
      console.log(`     Last:  ${new Date(lastPoint[0]).toISOString()} - $${lastPoint[1].toFixed(2)}`)
    }
  } catch (error) {
    console.error('  ❌ JUPUSDT Test Failed:', (error as Error).message)
  }
  console.log()

  console.log('✅ CoinGecko Integration Test Complete!')
}

// Run tests
testCoinGeckoIntegration().catch(error => {
  console.error('💥 Test suite failed:', error)
})
