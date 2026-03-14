import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import type { Coach } from './coach'
import {
  SummarisedGoalSchema,
  SummarisedInjuriesSchema,
} from '../events/athlete-profile'

const goalsResponseSchema = z.object({
  summarisedGoals: z.array(SummarisedGoalSchema).min(1).max(5),
  summary: z.string().min(1),
})

const injuriesResponseSchema = SummarisedInjuriesSchema

const SYSTEM_INSTRUCTION =
  'You are an experienced fitness coach. Analyse what the athlete tells you and produce structured JSON output. Be concise and practical.'

export function createGeminiCoach(apiKey: string): Coach {
  const ai = new GoogleGenAI({ apiKey })
  const model = 'gemini-3-flash-preview'

  return {
    async summariseGoals(goals: string): Promise<unknown> {
      const response = await ai.models.generateContent({
        model,
        contents: `The athlete described their fitness goals:\n\n${goals}\n\nSummarise into structured goals. Each goal needs a description, target areas (muscle groups or fitness areas), and a priority from 1 (lowest) to 5 (highest). Also provide a brief overall summary.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(goalsResponseSchema),
          temperature: 0.3,
        },
      })
      return JSON.parse(response.text!)
    },

    async summariseInjuries(injuries: string): Promise<unknown> {
      const response = await ai.models.generateContent({
        model,
        contents: `The athlete described their injuries or physical limitations:\n\n${injuries}\n\nSummarise into structured data: affected body areas, exercise restrictions, severity (mild/moderate/severe), and a brief summary.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(injuriesResponseSchema),
          temperature: 0.3,
        },
      })
      return JSON.parse(response.text!)
    },
  }
}
