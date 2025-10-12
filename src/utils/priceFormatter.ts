/**
 * Price Formatting Utilities for Crypto Trading Dashboard
 * 
 * Provides dynamic decimal precision based on coin value for optimal readability
 * in scalping scenarios where micro price movements are critical.
 */

/**
 * Determines optimal decimal precision based on price magnitude
 * 
 * @param price - The price value to format
 * @returns Number of decimal places to display
 * 
 * @example
 * getOptimalPrecision(45000)    // 2  - BTC: $45,123.45
 * getOptimalPrecision(2345)     // 3  - ETH: $2,345.678
 * getOptimalPrecision(0.35)     // 6  - LISTA: $0.354321
 * getOptimalPrecision(0.00012)  // 8  - SHIB: $0.00012345
 */
export function getOptimalPrecision(price: number): number {
  const absPrice = Math.abs(price)
  
  if (absPrice >= 1000) return 2      // BTC, High-value: $45,123.45
  if (absPrice >= 100) return 3       // ETH, Mid-high: $2,345.678
  if (absPrice >= 10) return 4        // BNB, Mid: $345.6789
  if (absPrice >= 1) return 5         // ADA, Low-mid: $1.23456
  if (absPrice >= 0.1) return 6       // DOGE, LISTA: $0.123456
  if (absPrice >= 0.01) return 7      // Very low: $0.0123456
  if (absPrice >= 0.001) return 8     // Micro: $0.00123456
  if (absPrice >= 0.0001) return 9    // Ultra-micro: $0.000123456
  
  return 10                            // Extreme micro: $0.0000123456
}

/**
 * Formats a price with optimal decimal precision
 * 
 * @param price - The price to format
 * @param forceDecimals - Optional: force specific number of decimals
 * @returns Formatted price string
 * 
 * @example
 * formatPrice(45123.456)   // "45123.46"
 * formatPrice(0.354321)    // "0.354321"
 * formatPrice(0.1, 8)      // "0.10000000" (forced)
 */
export function formatPrice(price: number, forceDecimals?: number): string {
  const decimals = forceDecimals ?? getOptimalPrecision(price)
  return price.toFixed(decimals)
}

/**
 * Formats a price with currency symbol
 * 
 * @param price - The price to format
 * @param currency - Currency symbol (default: '$')
 * @param forceDecimals - Optional: force specific number of decimals
 * @returns Formatted price with currency symbol
 * 
 * @example
 * formatPriceWithCurrency(0.354321)        // "$0.354321"
 * formatPriceWithCurrency(45123.45, '€')   // "€45123.45"
 */
export function formatPriceWithCurrency(
  price: number, 
  currency: string = '$', 
  forceDecimals?: number
): string {
  return `${currency}${formatPrice(price, forceDecimals)}`
}

/**
 * Formats price change with + or - prefix and percentage
 * 
 * @param change - The price change amount
 * @param percentChange - The percentage change
 * @returns Formatted change string
 * 
 * @example
 * formatPriceChange(0.001234, 0.35)   // "+0.001234 (+0.35%)"
 * formatPriceChange(-0.000876, -0.25) // "-0.000876 (-0.25%)"
 */
export function formatPriceChange(change: number, percentChange: number): string {
  const prefix = change >= 0 ? '+' : ''
  const formattedChange = formatPrice(Math.abs(change))
  const formattedPercent = percentChange.toFixed(2)
  
  return `${prefix}${formattedChange} (${prefix}${formattedPercent}%)`
}

/**
 * Formats volume with K, M, B suffixes
 * 
 * @param volume - The volume to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted volume string
 * 
 * @example
 * formatVolume(1234)         // "1.23K"
 * formatVolume(1234567)      // "1.23M"
 * formatVolume(1234567890)   // "1.23B"
 */
export function formatVolume(volume: number, decimals: number = 2): string {
  const absVolume = Math.abs(volume)
  
  if (absVolume >= 1_000_000_000) {
    return (volume / 1_000_000_000).toFixed(decimals) + 'B'
  }
  if (absVolume >= 1_000_000) {
    return (volume / 1_000_000).toFixed(decimals) + 'M'
  }
  if (absVolume >= 1_000) {
    return (volume / 1_000).toFixed(decimals) + 'K'
  }
  
  return volume.toFixed(decimals)
}

/**
 * Calculates and formats spread (High - Low)
 * 
 * @param high - High price
 * @param low - Low price
 * @returns Object with absolute and percentage spread
 * 
 * @example
 * calculateSpread(0.367890, 0.363210)
 * // { absolute: 0.00468, percent: 1.29, formatted: "$0.004680 (1.29%)" }
 */
export function calculateSpread(high: number, low: number) {
  const absolute = high - low
  const percent = (absolute / low) * 100
  
  return {
    absolute,
    percent,
    formatted: `${formatPriceWithCurrency(absolute)} (${percent.toFixed(2)}%)`
  }
}

/**
 * Calculates and formats price change
 * 
 * @param close - Close price
 * @param open - Open price
 * @returns Object with absolute and percentage change
 * 
 * @example
 * calculatePriceChange(0.364521, 0.365000)
 * // { absolute: -0.000479, percent: -0.13, formatted: "-$0.000479 (-0.13%)" }
 */
export function calculatePriceChange(close: number, open: number) {
  const absolute = close - open
  const percent = (absolute / open) * 100
  const prefix = absolute >= 0 ? '+' : ''
  
  return {
    absolute,
    percent,
    formatted: `${prefix}${formatPriceWithCurrency(absolute)} (${prefix}${percent.toFixed(2)}%)`
  }
}

/**
 * Formats a timestamp for chart display
 * 
 * @param timestamp - ISO timestamp string or Date object
 * @param format - 'short' | 'long' | 'time' (default: 'short')
 * @returns Formatted time string
 * 
 * @example
 * formatChartTime(date, 'short')  // "13:28"
 * formatChartTime(date, 'long')   // "13:28:43"
 * formatChartTime(date, 'time')   // "13:28:43.123"
 */
export function formatChartTime(
  timestamp: string | Date, 
  format: 'short' | 'long' | 'time' = 'short'
): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const ms = date.getMilliseconds().toString().padStart(3, '0')
  
  switch (format) {
    case 'short':
      return `${hours}:${minutes}`
    case 'long':
      return `${hours}:${minutes}:${seconds}`
    case 'time':
      return `${hours}:${minutes}:${seconds}.${ms}`
    default:
      return `${hours}:${minutes}`
  }
}

/**
 * Type guard to check if a price is valid
 * 
 * @param price - Value to check
 * @returns true if price is a valid number
 */
export function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && !isNaN(price) && isFinite(price)
}

/**
 * Safe price formatter that handles invalid inputs
 * 
 * @param price - Price to format (may be invalid)
 * @param fallback - Fallback string if invalid (default: 'N/A')
 * @returns Formatted price or fallback
 */
export function safeFormatPrice(price: unknown, fallback: string = 'N/A'): string {
  if (isValidPrice(price)) {
    return formatPrice(price)
  }
  return fallback
}
