import type { Coach } from './coach'
import { createGeminiCoach } from './gemini-coach'

let coach: Coach | undefined

export function useCoach(): Coach {
  if (!coach) {
    const config = useRuntimeConfig()
    switch (config.aiProvider) {
      case 'gemini':
        if (!config.geminiApiKey) throw new Error('NUXT_GEMINI_API_KEY is not configured')
        coach = createGeminiCoach(config.geminiApiKey)
        break
      default:
        throw new Error(`Unknown AI provider: ${config.aiProvider}`)
    }
  }
  return coach
}
