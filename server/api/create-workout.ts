import { promptMarcocycleSchema } from '../schemas/prompt-workout'

export default defineEventHandler(async (event) => {
  const { goal, name, objectives, weekDetails } = promptMarcocycleSchema.parse(await readBody(event))
  const prompt = `
    Create a 
  `
  const ai = getAIClient()
  await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: promptMarcocycleSchema.toJSONSchema(),
    },
  })
})
