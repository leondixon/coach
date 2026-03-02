import z from 'zod'
import { setSchema } from '#shared/schemas/workout'

export const workoutResultSchema = z.object({
  completedAt: z.string().datetime(),
  exercises: z.array(z.object({
    id: z.string(),
    name: z.string(),
    sets: setSchema.array(),
  })),
})

export type WorkoutResult = z.infer<typeof workoutResultSchema>
