import z from 'zod'

const exercise = z.object({
  name: z.string().describe('Name of the exercise'),
  repetitions: z.string().describe('The amount of repetitions'),
  sets: z.string().describe('The amount of sets'),
  restTime: z.number().describe('The amount of seconds for rest between repetitions'),
  tips: z.string().describe('Cues on what to focus on if needed, for example, engage the glutes.'),
})

export const microcycleSchema = z.object({
  name: z.string().describe('The week number of the mesocycle, for example \'Week 23\''),
  exercises: exercise.array(),
})

export const mesocycleSchema = z.object({
  name: z.string().describe('Summerised name of the mesocycle'),
  goal: z.string().describe('The overarching goal of the mesocycle cycle'),
  microcycle: microcycleSchema.array(),
})

export const macrocycleSchema = z.object({
  name: z.string().describe('Summerised name of the Macrocycle, used as a display when looking at the overview of the workout plan'),
  goal: z.string().describe('The overarching goal of the whole cycle based on the weak areas and aims of the person'),
  objectives: z.object({
    importance: z.number().describe('The importance rating of addressing this objective'),
    value: z.string().describe('The objective'),
  }).array().describe('Based on the goal, all of the actionable objectives to achieve the goal'),
  mesocycle: mesocycleSchema.array(),
})
