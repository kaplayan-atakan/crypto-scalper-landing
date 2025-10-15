import type { ChartDataResponse, OHLCDataResponse } from '../types/coingecko'
import { fetchWithRetry } from '../utils/fetchWithRetry'

// Use proxy in development to avoid CORS issues
const API_ROOT = import.meta.env.DEV 
  ? '/api/coingecko'  // Development: use Vite proxy
  : 'https://api.coingecko.com/api/v3'  // Production: direct API

const API_KEY = 'CG-cQBLyHVdbqvq6Jc9TJnDnycL'

// Symbol'den CoinGecko ID'ye dönüşüm mapping - GENİŞLETİLMİŞ
export const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  // ===== CLEANED MAPPING (314 unique symbols) =====
  'BTCUSDT': 'bitcoin',
  'ETHUSDT': 'ethereum',
  'BNBUSDT': 'binancecoin',
  'SOLUSDT': 'solana',
  'XRPUSDT': 'ripple',
  'ADAUSDT': 'cardano',
  'AVAXUSDT': 'avalanche-2',
  'DOTUSDT': 'polkadot',
  'TRXUSDT': 'tron',
  'LINKUSDT': 'chainlink',
  'LISTAUSDT': 'lista',
  'MATICUSDT': 'matic-network',
  'TONUSDT': 'the-open-network',
  'ICPUSDT': 'internet-computer',
  'NEARUSDT': 'near',
  'UNIUSDT': 'uniswap',
  'APTUSDT': 'aptos',
  'ATOMUSDT': 'cosmos',
  'LTCUSDT': 'litecoin',
  'FILUSDT': 'filecoin',
  'ETCUSDT': 'ethereum-classic',
  'ALGOUSDT': 'algorand',
  'EOSUSDT': 'eos',
  'XLMUSDT': 'stellar',
  'VETUSDT': 'vechain',
  'HBARUSDT': 'hedera-hashgraph',
  'EGLDUSDT': 'elrond-erd-2',
  'FLOWUSDT': 'flow',
  'FTMUSDT': 'fantom',
  'ONEUSDT': 'harmony',
  'ZILUSDT': 'zilliqa',
  'KLAYUSDT': 'klay-token',
  'WAVESUSDT': 'waves',
  'QTUMUSDT': 'qtum',
  'ICXUSDT': 'icon',
  'IOTAUSDT': 'iota',
  'NEOUSDT': 'neo',
  'ONTUSDT': 'ontology',
  'KASUSDT': 'kaspa',
  'INJUSDT': 'injective-protocol',
  'SUIUSDT': 'sui',
  'SEIUSDT': 'sei-network',
  'ROSEUSDT': 'oasis-network',
  'CFXUSDT': 'conflux-token',
  'MINAUSDT': 'mina-protocol',
  'COREUSDT': 'coredao',
  'ASTRAUSDT': 'astar',
  'CKBUSDT': 'nervos-network',
  'IOSTUSDT': 'iostoken',
  'ARBUSDT': 'arbitrum',
  'OPUSDT': 'optimism',
  'IMXUSDT': 'immutable-x',
  'LRCUSDT': 'loopring',
  'METISUSDT': 'metis-token',
  'STRKUSDT': 'starknet',
  'MANTAUSDT': 'manta-network',
  'BLASTUSDT': 'blast',
  'SCROLLUSDT': 'scroll',
  'ZKUSDT': 'zkspace',
  'LINEAUSDT': 'linea',
  'VFYUSDT': 'zkverify', // ZKVerify - auto-discovered and persisted
  'AAVEUSDT': 'aave',
  'MKRUSDT': 'maker',
  'SNXUSDT': 'havven',
  'COMPUSDT': 'compound-governance-token',
  'CRVUSDT': 'curve-dao-token',
  'SUSHIUSDT': 'sushi',
  'YFIUSDT': 'yearn-finance',
  'BALUSDT': 'balancer',
  '1INCHUSDT': '1inch',
  'RUNEUSDT': 'thorchain',
  'PERPUSDT': 'perpetual-protocol',
  'GMXUSDT': 'gmx',
  'DYDXUSDT': 'dydx',
  'CAKEUSDT': 'pancakeswap-token',
  'JOEUSDT': 'joe',
  'PENDLEUSDT': 'pendle',
  'RDNTUSDT': 'radiant-capital',
  'RPLUSDT': 'rocket-pool',
  'LDOUSDT': 'lido-dao',
  'MAVUSDT': 'maverick-protocol',
  'VELOUSDT': 'velodrome-finance',
  'FRAXUSDT': 'frax',
  'CVXUSDT': 'convex-finance',
  'FXSUSDT': 'frax-share',
  'STETHUSDT': 'staked-ether',
  'RETHUSDT': 'rocket-pool-eth',
  'BANDUSDT': 'band-protocol',
  'APIUSDT': 'api3',
  'TRBUSDT': 'tellor',
  'DAIUSDT': 'dai',
  'GRTUSDT': 'the-graph',
  'MASKUSDT': 'mask-network',
  'ACHUSDT': 'alchemy-pay',
  'ANKRUSDT': 'ankr',
  'STORJUSDT': 'storj',
  'RNDRUSDT': 'render-token',
  'ARUSDT': 'arweave',
  'OCEANUSDT': 'ocean-protocol',
  'FETUSDT': 'fetch-ai',
  'AGIXUSDT': 'singularitynet',
  'AXSUSDT': 'axie-infinity',
  'SANDUSDT': 'the-sandbox',
  'MANAUSDT': 'decentraland',
  'GALAUSDT': 'gala',
  'ENJUSDT': 'enjincoin',
  'THETAUSDT': 'theta-token',
  'CHZUSDT': 'chiliz',
  'APECUSDT': 'apecoin',
  'GMTUSDT': 'stepn',
  'MAGICUSDT': 'magic',
  'ILVSDT': 'illuvium',
  'YGGUSDT': 'yield-guild-games',
  'SLPUSDT': 'smooth-love-potion',
  'ALICEUSDT': 'my-neighbor-alice',
  'TLMUSDT': 'alien-worlds',
  'RAREUSDT': 'superrare',
  'XUSDT': 'x',
  'MOVRUSDT': 'movr',
  'WAXPUSDT': 'wax',
  'MCUSDT': 'merit-circle',
  'PIXELUSDT': 'pixels',
  'PRIMEUSDT': 'echelon-prime',
  'NFTUSDT': 'apenft',
  'BEAMXUSDT': 'beam',
  'DOGEUSDT': 'dogecoin',
  'SHIBUSDT': 'shiba-inu',
  'PEPEUSDT': 'pepe',
  'FLOKIUSDT': 'floki',
  'WIFUSDT': 'dogwifhat',
  'BONKUSDT': 'bonk',
  'BABYDOGEUSDT': 'baby-doge-coin',
  'ELOMUSDT': 'dogelon-mars',
  'SATSUSDT': '1000sats',
  'RATSUSDT': 'rats',
  'MYRIAUSDT': 'myria',
  'SMILEYUSDT': 'smiley',
  'MEMESUSDT': 'meme',
  'MOGUSDT': 'mog-coin',
  'TIAUSDT': 'celestia',
  'BOMEUSDT': 'book-of-meme',
  'PEOPLEUSDT': 'constitutiondao',
  'MEMEUSDT': 'memecoin',
  'NEIROUSDT': 'neiro',
  'TURBOUSDT': 'turbo',
  'GTUSDT': 'gatechain-token',
  'KCSUSDT': 'kucoin-shares',
  'HTUSDT': 'huobi-token',
  'CETSUSDT': 'coinex-token',
  'FTTUSDT': 'ftx-token',
  'OKBUSDT': 'okb',
  'BTTUSDT': 'bittorrent',
  'MEXCUSDT': 'mexc-token',
  'WOOAUSDT': 'woo-network',
  'USDTUSDT': 'tether',
  'USDCUSDT': 'usd-coin',
  'BUSDUSDT': 'binance-usd',
  'TUSDUSDT': 'true-usd',
  'USDPUSDT': 'paxos-standard',
  'GUSDUSDT': 'gemini-dollar',
  'LUSDUSDT': 'liquity-usd',
  'SUSDUSDT': 'nusd',
  'USTCUSDT': 'terrausd',
  'FDUSDUSDT': 'first-digital-usd',
  'PYUSDUSTUSDT': 'paypal-usd',
  'WBTCUSDT': 'wrapped-bitcoin',
  'WETHUSDT': 'weth',
  'WUSDT': 'wormhole',
  'WLDUSDT': 'worldcoin-wld',
  'NMRUSDT': 'numeraire',
  'PHBUSDT': 'phoenix-global',
  'CTXCUSDT': 'cortex',
  'IQUSDT': 'everipedia',
  'ARKMUSDT': 'arkham',
  'AIUSDT': 'sleepless-ai',
  'AGLDUSDT': 'adventure-gold',
  'TAOUSDT': 'bittensor',
  'XMRUSDT': 'monero',
  'ZECUSDT': 'zcash',
  'DASHUSDT': 'dash',
  'SCRTUSDT': 'secret',
  'XVGUSDT': 'verge',
  'BEAMUSDT': 'beam',
  'GRINUSDT': 'grin',
  'QNTUSDT': 'quant-network',
  'AXLUSDT': 'axelar',
  'CTSIUSDT': 'cartesi',
  'CELRUSDT': 'celer-network',
  'POLYXUSDT': 'polymesh',
  'WANUSDT': 'wanchain',
  'FUSIONUSDT': 'fsn',
  'ILVUSDT': 'illuvium',
  'ENSUSDT': 'ethereum-name-service',
  'IDUSDT': 'space-id',
  'CYBERUSDT': 'cyberconnect',
  'BAKEUSDT': 'bakerytoken',
  'BARUSDT': 'titanswap',
  'PSGUSDT': 'paris-saint-germain-fan-token',
  'JUVUSDT': 'juventus-fan-token',
  'ACMUSDT': 'ac-milan-fan-token',
  'ATMUSDT': 'atletico-madrid',
  'ASRUSDT': 'as-roma-fan-token',
  'OGUSDT': 'organo-gold',
  'ALPINEUSDT': 'alpine-f1-team-fan-token',
  'SANTOSUSDT': 'santos-fc-fan-token',
  'ONDOUSDT': 'ondo-finance',
  'RIOUSDT': 'realio-network',
  'MPLUSDT': 'maple',
  'CFGUSDT': 'centrifuge',
  'CREDUSDT': 'credefi',
  'GOLDUSDT': 'gold-coin',
  'SSWPUSDT': 'swell-swapped-eth',
  'SDUSDT': 'stader',
  'BCHUSDT': 'bitcoin-cash',
  'BSVUSDT': 'bitcoin-sv',
  'XTZUSDT': 'tezos',
  'XEMUSDT': 'nem',
  'DCRUSDT': 'decred',
  'BTGUSDT': 'bitcoin-gold',
  'ZRXUSDT': '0x',
  'BATUSDT': 'basic-attention-token',
  'OMGUSDT': 'omisego',
  'IOTXUSDT': 'iotex',
  'LSKUSDT': 'lisk',
  'KAVAUSDT': 'kava',
  'HNTUSDT': 'helium',
  'RVNUSDT': 'ravencoin',
  'SCUSDT': 'siacoin',
  'ZENUSDT': 'horizen',
  'SXPUSDT': 'swipe',
  'COTIUSDT': 'coti',
  'CHRUSDT': 'chromia',
  'STPTUSDT': 'stp-network',
  'PONDUSDT': 'marlin',
  'DEGOUSDT': 'dego-finance',
  'ALCXUSDT': 'alchemix',
  'CLVUSDT': 'clover-finance',
  'FORTHUSDT': 'ampleforth-governance-token',
  'TRIBEUSDT': 'tribe',
  'TORNUSDT': 'tornado-cash',
  'FIDAUSDT': 'bonfida',
  'SFPUSDT': 'safepal',
  'LITUSDT': 'litentry',
  'EPXUSDT': 'ellipsis',
  'C98USDT': 'coin98',
  'CLOUSDT': 'clore-ai',
  'ORDIUSDT': 'ordinals',
  'STXUSDT': 'blockstack',
  'RVSUSDT': 'revert-finance',
  'TURTUSDT': 'turtle-coin',
  'JITOUSDT': 'jito-governance-token',
  'JUPUSDT': 'jupiter-exchange-solana',
  'PYTHUSDT': 'pyth-network',
  'JITOSOLUSDT': 'jito-staked-sol',
  'MSOLUSDT': 'msol',
  'MNDEUSDT': 'marinade',
  'RAYUSDT': 'raydium',
  'SRMUSDT': 'serum',
  'ORCAUSDT': 'orca',
  'SABERUSDT': 'saber',
  'PORTUSDT': 'port-finance',
  'COPEUSDT': 'cope',
  'MEDIAUSDT': 'media-network',
  'STEPUSDT': 'step-finance',
  'GNSUSDT': 'gains-network',
  'JONESUSDT': 'jones-dao',
  'PLSUSDT': 'plutus-dao',
  'DPXUSDT': 'dopex',
  'SPAUSDT': 'spartadex',
  'THALESUSDT': 'thales',
  'KWENTAUSDT': 'kwenta',
  'PNGUSDT': 'pangolin',
  'QIUSDT': 'benqi',
  'YYUSDT': 'yield-yak',
  'TIMEUSDT': 'wonderland',
  'SPELLUSDT': 'spell-token',
  'MIMUSDT': 'magic-internet-money',
  'QUICKUSDT': 'quick',
  'GHSTUSDT': 'aavegotchi',
  'DQUICKUSDT': 'dragon-quick',
  'PUMPUSDT': 'pumpdotfun',
  'PUMPBTCUSDT': 'pumpbtc',
  'ACTUSDT': 'achain',
  'PNUTUSDT': 'peanut',
  'GOATUSDT': 'goatseus-maximus',
  'MOOUSDT': 'moo-deng',
  'MOTHERUSDT': 'mother-iggy',
  'GIGAUSDT': 'giga',
  'PONKEUSDT': 'ponke',
  'POPUSDT': 'popcat',
  'CATUSDT': 'simon-s-cat',
  'MEWUSDT': 'cat-in-a-dogs-world',
  'DYMUSDT': 'dymension',
  'ALTUSDT': 'altlayer',
  'ACEUSDT': 'fusionist',
  'NFPUSDT': 'nfprompt',
  'XAIUSDT': 'xai-blockchain',
  'HOOKUSDT': 'hooked-protocol',
  'GLMRUSDT': 'golem',
  'MULTUSDT': 'multichain',
  'SYNUSDT': 'synapse-2',
  'ANYUSDT': 'anyswap',
  'XDAIUSDT': 'xdai',
  'HBTCUSDT': 'huobi-btc',
  'RENUSDT': 'republic-protocol',
  'KEEPUSDT': 'keep-network',
  'NUUSDT': 'nucypher',
  'BADGERUSDT': 'badger-dao',
  'AURAUSDT': 'aura-finance',
  'ICUSDT': 'inflation-coin',
  'BLURUSDT': 'blur',
  'LOOKSUSDT': 'looksrare',
  'X2Y2USDT': 'x2y2',
  'NFTXUSDT': 'nftx',
  'BENDUSDT': 'benddao',
}

// Cache for auto-discovered coin IDs
const AUTO_DISCOVERED_CACHE: Record<string, string | null> = {}

// Cache for unmapped symbols (to avoid repeated searches)
const UNMAPPED_SYMBOLS_CACHE = new Set<string>()

/**
 * Automatically search CoinGecko API for unmapped symbols
 * @param symbol Original symbol (e.g., "LISTAUSDT")
 * @returns CoinGecko coin ID or null if not found
 */
async function searchCoinGeckoId(symbol: string): Promise<string | null> {
  try {
    // Check if already searched and failed
    if (UNMAPPED_SYMBOLS_CACHE.has(symbol)) {
      return null
    }

    // Check cache first
    if (symbol in AUTO_DISCOVERED_CACHE) {
      return AUTO_DISCOVERED_CACHE[symbol]
    }

    // Remove common suffixes
    const cleanSymbol = symbol
      .replace(/USDT$/i, '')
      .replace(/BUSD$/i, '')
      .replace(/USDC$/i, '')
      .replace(/BTC$/i, '')
      .replace(/ETH$/i, '')
      .trim()
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 Auto-discovering coin ID for:', symbol)
    console.log('📝 Clean symbol:', cleanSymbol)
    
    // Search CoinGecko API
    const url = `${API_ROOT}/search?query=${encodeURIComponent(cleanSymbol)}`
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    })
    
    if (!response.ok) {
      console.error('❌ Search API failed:', response.status)
      UNMAPPED_SYMBOLS_CACHE.add(symbol)
      AUTO_DISCOVERED_CACHE[symbol] = null
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      return null
    }
    
    const data = await response.json()
    
    // Find exact match by symbol
    const exactMatch = data.coins?.find((c: any) => 
      c.symbol?.toLowerCase() === cleanSymbol.toLowerCase()
    )
    
    if (exactMatch) {
      console.log('✅ Auto-discovered (exact match):', {
        symbol: cleanSymbol,
        coinId: exactMatch.id,
        name: exactMatch.name
      })
      AUTO_DISCOVERED_CACHE[symbol] = exactMatch.id
      
      // Add to main mapping (optional - for persistence)
      SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase().trim()] = exactMatch.id
      
      console.log('💡 Consider adding this to SYMBOL_TO_COINGECKO_ID:')
      console.log(`  '${symbol.toUpperCase().trim()}': '${exactMatch.id}',`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      return exactMatch.id
    }
    
    // Try to find by ID match
    const idMatch = data.coins?.find((c: any) => 
      c.id?.toLowerCase() === cleanSymbol.toLowerCase()
    )
    
    if (idMatch) {
      console.log('✅ Auto-discovered (ID match):', {
        symbol: cleanSymbol,
        coinId: idMatch.id,
        name: idMatch.name
      })
      AUTO_DISCOVERED_CACHE[symbol] = idMatch.id
      SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase().trim()] = idMatch.id
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      return idMatch.id
    }
    
    // No match found
    console.warn('❌ No match found in CoinGecko for:', symbol)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    UNMAPPED_SYMBOLS_CACHE.add(symbol)
    AUTO_DISCOVERED_CACHE[symbol] = null
    return null
    
  } catch (error) {
    console.error('💥 Auto-discovery error:', error)
    UNMAPPED_SYMBOLS_CACHE.add(symbol)
    AUTO_DISCOVERED_CACHE[symbol] = null
    return null
  }
}

export function symbolToCoinGeckoId(symbol: string): string | null {
  // USDT suffix'ini kaldır ve uppercase yap
  const cleanSymbol = symbol.toUpperCase().trim()
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 symbolToCoinGeckoId() called')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 Input:', { original: symbol, clean: cleanSymbol })
  
  // Direct match
  if (SYMBOL_TO_COINGECKO_ID[cleanSymbol]) {
    const result = SYMBOL_TO_COINGECKO_ID[cleanSymbol]
    console.log('✅ Direct match found!')
    console.log('📤 Output:', { symbol: cleanSymbol, coinId: result })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    return result
  }
  
  // Try without USDT suffix
  if (cleanSymbol.endsWith('USDT')) {
    const withoutUSDT = cleanSymbol.slice(0, -4)
    console.log('🔄 Trying without USDT suffix:', withoutUSDT)
    
    // Special case for single letter + USDT (like WUSDT)
    if (withoutUSDT === 'W') {
      console.log('✅ Special case: W → wormhole')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      return 'wormhole'
    }
    
    // Try to find partial match
    for (const [key, value] of Object.entries(SYMBOL_TO_COINGECKO_ID)) {
      if (key.startsWith(withoutUSDT + 'USDT')) {
        console.log('✅ Partial match found:', { key, value })
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        return value
      }
    }
  }
  
  // Fallback - try to guess based on symbol
  const guessMapping: Record<string, string> = {
    'W': 'wormhole',
    'PUMP': 'pump-fun',
    'PUMPBTC': 'pump-fun'
  }
  
  const symbolWithoutUSDT = cleanSymbol.replace('USDT', '')
  if (guessMapping[symbolWithoutUSDT]) {
    console.log('✅ Guess match found:', guessMapping[symbolWithoutUSDT])
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    return guessMapping[symbolWithoutUSDT]
  }
  
  console.warn('❌ Unmapped symbol:', symbol)
  console.warn('💡 Consider adding this symbol to SYMBOL_TO_COINGECKO_ID mapping')
  console.warn('💡 Will attempt auto-discovery if called from async context')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  return null
}

/**
 * Async version with auto-discovery fallback
 * Use this in async contexts (hooks, API calls)
 */
export async function symbolToCoinGeckoIdAsync(symbol: string): Promise<string | null> {
  // Try sync lookup first (fast path)
  const syncResult = symbolToCoinGeckoId(symbol)
  if (syncResult) {
    return syncResult
  }
  
  // If not found, try auto-discovery
  console.log('🔍 Attempting auto-discovery for:', symbol)
  const discovered = await searchCoinGeckoId(symbol)
  return discovered
}

// API Headers - DÜZELTME
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  
  if (API_KEY) {
    // CoinGecko Demo API key header
    headers['x-cg-demo-api-key'] = API_KEY
    console.log('🔑 API Key added to headers:', API_KEY.substring(0, 10) + '...')
  } else {
    console.warn('⚠️ No API key found in environment variables')
  }
  
  return headers
}

// Market Chart - Line Chart için
export async function fetchMarketChart(
  coinId: string, 
  vs: string = 'usd', 
  days: number = 1
): Promise<ChartDataResponse> {
  const url = `${API_ROOT}/coins/${coinId}/market_chart?vs_currency=${vs}&days=${days}`
  
  console.log('🌐 Fetching Market Chart from:', url)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  console.log('📡 Response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ API Error Response:', errorText)
    throw new Error(`CoinGecko API Error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  console.log('✅ API Response data points:', data.prices?.length || 0)
  return data
}

// Market Chart Range - Belirli zaman aralığı için (with retry)
export async function fetchMarketChartRange(
  coinId: string,
  vs: string = 'usd',
  fromTs: number,
  toTs: number
): Promise<ChartDataResponse> {
  const url = `${API_ROOT}/coins/${coinId}/market_chart/range?vs_currency=${vs}&from=${fromTs}&to=${toTs}`
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌐 fetchMarketChartRange() called')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 Parameters:', { coinId, vs, fromTs, toTs })
  console.log('🔗 API URL:', url)
  console.log('📅 Time range:', {
    from: new Date(fromTs * 1000).toISOString(),
    to: new Date(toTs * 1000).toISOString(),
    duration: `${Math.round((toTs - fromTs) / 60)} minutes`
  })
  
  try {
    // Try with retry logic (3 attempts with exponential backoff)
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: getHeaders(),
      retries: 3,
      backoffBaseMs: 300,
      onRetry: (attempt, error) => {
        console.log(`🔄 Retry attempt ${attempt}/3 for ${coinId}:`, error.message)
      }
    })
    
    console.log('📡 Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error Response:', errorText)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      throw new Error(`CoinGecko API Error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('✅ API Response received!')
    console.log('📊 Data summary:', {
      prices: data.prices?.length || 0,
      market_caps: data.market_caps?.length || 0,
      total_volumes: data.total_volumes?.length || 0
    })
    if (data.prices && data.prices.length > 0) {
      console.log('📈 Price range:', {
        first: `$${data.prices[0][1].toFixed(2)}`,
        last: `$${data.prices[data.prices.length - 1][1].toFixed(2)}`
      })
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    return data
  } catch (error: any) {
    console.error('❌ fetchMarketChartRange failed:', error)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    throw error
  }
}

// OHLC Data - Candlestick Chart için
export async function fetchOHLC(
  coinId: string,
  vs: string = 'usd',
  days: number = 1
): Promise<number[][]> {
  const url = `${API_ROOT}/coins/${coinId}/ohlc?vs_currency=${vs}&days=${days}`
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 fetchOHLC() called')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 Parameters:', { coinId, vs, days })
  console.log('🔗 API URL:', url)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  console.log('📡 Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ API Error Response:', errorText)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    throw new Error(`CoinGecko API Error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  console.log('✅ API Response received!')
  console.log('📊 OHLC points:', data.length || 0)
  if (data && data.length > 0) {
    console.log('📈 First candle:', {
      time: new Date(data[0][0]).toISOString(),
      open: `$${data[0][1].toFixed(2)}`,
      high: `$${data[0][2].toFixed(2)}`,
      low: `$${data[0][3].toFixed(2)}`,
      close: `$${data[0][4].toFixed(2)}`
    })
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  return data
}

/**
 * Fetch current market data (price, 24h change, market cap, volume)
 * Used for LiveMarketChart component
 */
export async function fetchCoinGeckoMarketData(coinId: string) {
  const url = `${API_ROOT}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 fetchCoinGeckoMarketData() called')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📥 CoinID:', coinId)
  console.log('🔗 API URL:', url)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  console.log('📡 Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ API Error Response:', errorText)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    throw new Error(`CoinGecko API Error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  
  const marketData = {
    current_price: data.market_data.current_price.usd,
    price_change_24h: data.market_data.price_change_24h,
    price_change_percentage_24h: data.market_data.price_change_percentage_24h,
    market_cap: data.market_data.market_cap.usd,
    total_volume: data.market_data.total_volume.usd,
    high_24h: data.market_data.high_24h.usd,
    low_24h: data.market_data.low_24h.usd,
  }
  
  console.log('✅ Market Data received:', {
    currentPrice: `$${marketData.current_price.toFixed(2)}`,
    change24h: `${marketData.price_change_percentage_24h.toFixed(2)}%`,
    high24h: `$${marketData.high_24h.toFixed(2)}`,
    low24h: `$${marketData.low_24h.toFixed(2)}`,
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  return marketData
}

/**
 * Convert price array to candlestick format
 * CoinGecko free tier doesn't provide OHLC, so we approximate from price points
 */
export function convertPricesToCandles(
  prices: [number, number][],  // [timestamp_ms, price]
  intervalMinutes: number = 5
): Array<{ timestamp: number; open: number; high: number; low: number; close: number }> {
  if (!prices || prices.length === 0) return []
  
  const intervalMs = intervalMinutes * 60 * 1000
  const candles: Map<number, { open: number; high: number; low: number; close: number; prices: number[] }> = new Map()
  
  // Group prices by candle interval
  prices.forEach(([timestamp, price]) => {
    const candleTime = Math.floor(timestamp / intervalMs) * intervalMs
    const candleTimeSec = Math.floor(candleTime / 1000)
    
    if (!candles.has(candleTimeSec)) {
      candles.set(candleTimeSec, {
        open: price,
        high: price,
        low: price,
        close: price,
        prices: [price]
      })
    } else {
      const candle = candles.get(candleTimeSec)!
      candle.high = Math.max(candle.high, price)
      candle.low = Math.min(candle.low, price)
      candle.close = price
      candle.prices.push(price)
    }
  })
  
  // Convert to array and sort by timestamp
  const result = Array.from(candles.entries())
    .map(([timestamp, data]) => ({
      timestamp,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
  
  console.log(`📊 Converted ${prices.length} prices to ${result.length} candles (${intervalMinutes}m interval)`)
  
  return result
}

