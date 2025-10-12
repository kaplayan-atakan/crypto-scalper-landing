/**
 * Trade Filtering Utilities
 * Helper functions for filtering and sorting trades in the Live Actions dashboard
 */

import type { ClosedTradeSimple } from '../types/supabase';

/**
 * Get the latest trade for a specific symbol
 * @param trades - Array of all trades
 * @param symbol - Symbol to filter for (e.g., 'BTCUSDT')
 * @returns Latest trade for the symbol, or null if not found
 */
export function getLatestTradeBySymbol(
  trades: ClosedTradeSimple[],
  symbol: string
): ClosedTradeSimple | null {
  const filtered = trades
    .filter(t => t.symbol === symbol)
    .sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  
  return filtered[0] || null;
}

/**
 * Get latest N trades excluding specific symbols
 * @param trades - Array of all trades
 * @param count - Number of trades to return
 * @param excludeSymbols - Symbols to exclude (default: BTC and ETH)
 * @returns Array of latest trades (may contain nulls if not enough trades)
 */
export function getLatestOtherTrades(
  trades: ClosedTradeSimple[],
  count: number,
  excludeSymbols: string[] = ['BTCUSDT', 'ETHUSDT']
): (ClosedTradeSimple | null)[] {
  const filtered = trades
    .filter(t => !excludeSymbols.includes(t.symbol))
    .sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, count);
  
  // Fill with nulls if not enough trades
  const result: (ClosedTradeSimple | null)[] = [...filtered];
  while (result.length < count) {
    result.push(null);
  }
  
  return result;
}

/**
 * Format relative time (e.g., "5m ago", "2h ago")
 * @param timestamp - ISO timestamp string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (seconds < 30) return 'Just now';
  if (minutes < 1) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

/**
 * Get coin display name from symbol
 * @param symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @returns Display name (e.g., 'Bitcoin (BTC)')
 */
export function getCoinDisplayName(symbol: string): string {
  const nameMap: Record<string, string> = {
    'BTCUSDT': 'Bitcoin (BTC)',
    'ETHUSDT': 'Ethereum (ETH)',
    'BNBUSDT': 'BNB',
    'SOLUSDT': 'Solana (SOL)',
    'ADAUSDT': 'Cardano (ADA)',
    'XRPUSDT': 'Ripple (XRP)',
    'DOGEUSDT': 'Dogecoin (DOGE)',
    'DOTUSDT': 'Polkadot (DOT)',
    'MATICUSDT': 'Polygon (MATIC)',
    'LINKUSDT': 'Chainlink (LINK)',
    'AVAXUSDT': 'Avalanche (AVAX)',
    'ATOMUSDT': 'Cosmos (ATOM)',
    'NEARUSDT': 'NEAR Protocol',
    'APTUSDT': 'Aptos (APT)',
    'ARBUSDT': 'Arbitrum (ARB)',
    'OPUSDT': 'Optimism (OP)',
    'INJUSDT': 'Injective (INJ)',
    'SUIUSDT': 'Sui (SUI)',
    'TIAUSDT': 'Celestia (TIA)',
    'WLDUSDT': 'Worldcoin (WLD)',
    'LISTAUSDT': 'Lista DAO',
  };
  
  return nameMap[symbol] || symbol.replace('USDT', '');
}

/**
 * Extract first reason from compound reason string
 * @param reason - Reason string (may contain '|' separators)
 * @returns First reason part or 'N/A'
 */
export function getShortReason(reason: string | null | undefined): string {
  if (!reason) return 'N/A';
  const parts = reason.split('|');
  return parts[0].trim() || 'N/A';
}
