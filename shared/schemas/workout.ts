import z from 'zod'

export type Set = z.infer<typeof setSchema>

export const setSchema = z.object({
  reps: z.number(),
  weight: z.union([z.number(), z.literal('bodyweight')]),
})

export type Exercise = z.infer<typeof exerciseSchema>
export const exerciseSchema = z.object({
  id: z.ulid(),
  name: z.string(),
  warmupSets: setSchema.array().optional(),
  sets: setSchema.array(),
})

export type Workout = z.infer<typeof workoutSchema>
export const workoutSchema = exerciseSchema.array()
