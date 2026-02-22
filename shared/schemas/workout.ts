import z from 'zod'

export type Set = z.infer<typeof setSchema>

export const setSchema = z.object({
  warmup: z.boolean().optional(),
  reps: z.number(),
  weight: z.union([z.number(), z.literal('bodyweight')]),
})

export type Exercise = z.infer<typeof exerciseSchema>
export const exerciseSchema = z.object({
  name: z.string(),
  sets: setSchema.array(),
})

export type Workout = z.infer<typeof workoutSchema>
export const workoutSchema = exerciseSchema.array()
