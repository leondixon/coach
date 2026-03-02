import { workoutResultSchema, type WorkoutResult } from '../schemas/workoutResult'

export default defineEventHandler(async (event) => {
  const body = workoutResultSchema.parse(await readBody(event))

  const storage = useStorage()
  const existing = await storage.getItem<WorkoutResult[]>('local:workout-results.json') ?? []

  await storage.setItem('local:workout-results.json', [...existing, body])

  return { success: true }
})
