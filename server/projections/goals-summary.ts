import type { Event } from '../events/types'
import { GoalsSubmittedSchema, GoalsConfirmedSchema } from '../events/athlete-profile'

interface SummarisedGoal {
  description: string
  targetAreas: string[]
  priority: number
}

interface GoalsSummaryEntry {
  goals: string
  summarisedGoals?: SummarisedGoal[]
  summary?: string
  status: 'pending' | 'confirmed'
}

type GoalsSummary = Record<string, GoalsSummaryEntry>

export function applyGoalsSubmittedToGoalsSummary(
  projection: GoalsSummary,
  event: Event,
): GoalsSummary {
  const payload = GoalsSubmittedSchema.parse(event.payload)
  return {
    ...projection,
    [payload.accountId]: {
      goals: payload.goals,
      status: 'pending',
    },
  }
}

export function applyGoalsConfirmedToGoalsSummary(
  projection: GoalsSummary,
  event: Event,
): GoalsSummary {
  const payload = GoalsConfirmedSchema.parse(event.payload)
  return {
    ...projection,
    [payload.accountId]: {
      goals: payload.goals,
      summarisedGoals: payload.summarisedGoals,
      summary: payload.summary,
      status: 'confirmed',
    },
  }
}
