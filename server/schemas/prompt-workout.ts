import { macrocycleSchema } from './workout'

export const promptMarcocycleSchema = macrocycleSchema.omit({ mesocycle: true })
