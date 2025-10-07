import { useBotSelector } from '../hooks/useBotSelector'
import '../App.css'

export function BotSelector() {
  const { selectedBot, availableBots, isLoading, error, handleBotChange } = useBotSelector()

  if (isLoading) {
    return (
      <div className="bot-selector bot-selector--loading">
        <div className="bot-selector__spinner"></div>
        <span>Botlar yükleniyor...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bot-selector bot-selector--error">
        <span className="bot-selector__error-icon">⚠️</span>
        <span>Bot listesi yüklenemedi</span>
      </div>
    )
  }

  if (!availableBots || availableBots.length === 0) {
    return (
      <div className="bot-selector bot-selector--error">
        <span className="bot-selector__error-icon">🤖</span>
        <span>Henüz bot bulunamadı</span>
      </div>
    )
  }

  // Bot isimlerini güzelleştir
  const formatBotName = (botId: string): string => {
    // scalper_core_MOM_1DK_V9_BinanceV7_Live -> Scalper Core MOM V9 (Live)
    return botId
      .replace(/_/g, ' ')
      .replace(/(\b[a-z])/g, (char) => char.toUpperCase())
      .trim()
  }

  // Son işlem zamanını formatla
  const formatLastTrade = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Az önce'
    if (hours < 24) return `${hours} saat önce`
    
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} gün önce`
    
    return date.toLocaleDateString('tr-TR')
  }

  const currentBot = availableBots.find(b => b.project_id === selectedBot)

  return (
    <div className="bot-selector">
      <div className="bot-selector__label">
        <span className="bot-selector__icon">🤖</span>
        <span>Bot Seçimi</span>
      </div>
      
      <div className="bot-selector__dropdown-wrapper">
        <select
          value={selectedBot}
          onChange={(e) => handleBotChange(e.target.value)}
          className="bot-selector__dropdown"
        >
          {availableBots.map((bot) => (
            <option key={bot.project_id} value={bot.project_id}>
              {formatBotName(bot.project_id)}
            </option>
          ))}
        </select>
        
        <div className="bot-selector__dropdown-arrow">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      {/* Bot bilgileri */}
      {currentBot && (
        <div className="bot-selector__info">
          <span className="bot-selector__info-item">
            🕐 {formatLastTrade(currentBot.last_trade_at)}
          </span>
        </div>
      )}
    </div>
  )
}
