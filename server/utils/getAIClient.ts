import { GoogleGenAI } from '@google/genai'

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
let client: GoogleGenAI | undefined

export function getAIClient() {
  if (client === undefined) {
    const config = useRuntimeConfig()
    client = new GoogleGenAI({ apiKey: config.geminiApiKey })
  }
  return client
}
