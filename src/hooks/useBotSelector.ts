import { useState, useEffect, useCallback } from 'react'
import { dataService } from '../services/dataService'
import type { BotInfo } from '../types/supabase'

export function useBotSelector() {
  const [selectedBot, setSelectedBot] = useState<string>(dataService.getCurrentBot())
  const [availableBots, setAvailableBots] = useState<BotInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Bot listesini yükle
  const loadBots = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await dataService.getAvailableBots()
      if (error) throw error
      
      setAvailableBots(data || [])
      
      // Eğer seçili bot listede yoksa, ilkini seç
      if (data && data.length > 0) {
        const botExists = data.some(bot => bot.project_id === selectedBot)
        if (!botExists) {
          handleBotChange(data[0].project_id)
        }
      }
    } catch (err) {
      setError(err as Error)
      console.error('Failed to load bots:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedBot])

  // Bot değişikliği
  const handleBotChange = useCallback((botId: string) => {
    setSelectedBot(botId)
    dataService.setCurrentBot(botId)
    
    // Sayfayı yenile veya event emit et
    window.dispatchEvent(new CustomEvent('botChanged', { detail: { botId } }))
  }, [])

  useEffect(() => {
    loadBots()
  }, [])

  return {
    selectedBot,
    availableBots,
    isLoading,
    error,
    handleBotChange,
    refreshBots: loadBots
  }
}
