import { z } from 'zod'

export const SummarisedGoalSchema = z.object({
  description: z.string(),
  targetAreas: z.array(z.string()).min(1),
  priority: z.literal([1, 2, 3, 4, 5]),
})

export type SummarisedGoal = z.infer<typeof SummarisedGoalSchema>

export const SummarisedInjuriesSchema = z.object({
  affectedAreas: z.array(z.string()).min(1),
  restrictions: z.array(z.string()),
  severity: z.enum(['mild', 'moderate', 'severe']),
  summary: z.string(),
})

export type SummarisedInjuries = z.infer<typeof SummarisedInjuriesSchema>

export const GoalsSubmittedSchema = z.object({
  accountId: z.ulid(),
  goals: z.string(),
  submittedAt: z.iso.datetime(),
})

export type GoalsSubmittedPayload = z.infer<typeof GoalsSubmittedSchema>

export const GoalsConfirmedSchema = z.object({
  accountId: z.ulid(),
  goals: z.string(),
  summarisedGoals: z.array(SummarisedGoalSchema).min(1).max(5),
  summary: z.string(),
  confirmedAt: z.iso.datetime(),
})

export type GoalsConfirmedPayload = z.infer<typeof GoalsConfirmedSchema>

export const ExperienceLevelAddedSchema = z.object({
  accountId: z.ulid(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  addedAt: z.iso.datetime(),
})

export type ExperienceLevelAddedPayload = z.infer<typeof ExperienceLevelAddedSchema>

export const InjuriesSubmittedSchema = z.object({
  accountId: z.ulid(),
  injuries: z.string(),
  submittedAt: z.iso.datetime(),
})

export type InjuriesSubmittedPayload = z.infer<typeof InjuriesSubmittedSchema>

export const InjuriesConfirmedSchema = z.object({
  accountId: z.ulid(),
  injuries: z.string(),
  summarisedInjuries: SummarisedInjuriesSchema,
  confirmedAt: z.iso.datetime(),
})

export type InjuriesConfirmedPayload = z.infer<typeof InjuriesConfirmedSchema>

export const OnboardingCompletedSchema = z.object({
  accountId: z.ulid(),
  completedAt: z.iso.datetime(),
})

export type OnboardingCompletedPayload = z.infer<typeof OnboardingCompletedSchema>

export const AthleteProfileEventType = {
  GoalsSubmitted: 'GoalsSubmitted',
  GoalsConfirmed: 'GoalsConfirmed',
  ExperienceLevelAdded: 'ExperienceLevelAdded',
  InjuriesSubmitted: 'InjuriesSubmitted',
  InjuriesConfirmed: 'InjuriesConfirmed',
  OnboardingCompleted: 'OnboardingCompleted',
} as const

export type AthleteProfileEventType = typeof AthleteProfileEventType[keyof typeof AthleteProfileEventType]

export const ATHLETE_PROFILE_AGGREGATE_TYPE = 'AthleteProfile' as const
