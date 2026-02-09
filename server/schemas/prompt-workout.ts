import { z } from 'zod'
import { macrocycleSchema } from './workout'

export const promptMarcocycleSchema = macrocycleSchema.omit({ mesocycle: true }).extend({
  weekDetails: z.record(z.literal(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']), z.object({
    preExistingRoutine: z.string().nullable().array().nullable().describe('pre existing routine components eg, sports massage, yoga etc'),
    training: z.string().nullable().array().nullable().describe('the additional training added to the day'),
  }).describe('training information regrading the day')),
})

export type PromptMacroCycle = z.infer<typeof promptMarcocycleSchema>
// tuesday: z.object({
//       preExistingRoutine: z.string().nullable().describe('pre existing routine if not leave undefined'),
//       training: z.string().nullable().describe('the training which has been added to the day if any has'),
//     }).describe('training information regrading tuesday'),
//     wednesday: z.object({
//       preExistingRoutine: z.string().nullable().describe('pre existing routine if not leave undefined'),
//       training: z.string().nullable().describe('the training which has been added to the day if any has'),
//     }).describe('training information regrading wednesday'),
//     thursday: z.object({
//       preExistingRoutine: z.string().nullable().describe('pre existing routine if not leave undefined'),
//       training: z.string().nullable().describe('the training which has been added to the day if any has'),
//     }).describe('training information regrading thursday'),
//     friday: z.object({
//       preExistingRoutine: z.string().nullable().describe('pre existing routine if not leave undefined'),
//       training: z.string().nullable().describe('the training which has been added to the day if any has'),
//     }).describe('training information regrading friday'),
//     preExistingRoutine: z.string().nullable().describe('pre existing routine if not le:workoutave undefined'),
//     training: z.string().nullable().describe('the training which has been added to the day if any has'),
//   }).describe('training information regrading saturday'),
//   sunday: z.object({
//     preExistingRoutine: z.string().nullable().describe('pre existing routine if not leave undefined'),
//     training: z.string().nullable().describe('the training which has been added to the day if any has'),
//   }).describe('training information regrading sunday'),
