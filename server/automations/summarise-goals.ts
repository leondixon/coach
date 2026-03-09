import { z } from 'zod'
import type { Event } from '../events/types'
import {
  SummarisedGoalSchema,
  GoalsSubmittedSchema,
  AthleteProfileEventType,
  ATHLETE_PROFILE_AGGREGATE_TYPE,
} from '../events/athlete-profile'
import { generateUlid } from '../utils/ulid'

const CoachResponseSchema = z.object({
  summarisedGoals: z.array(SummarisedGoalSchema).min(1).max(5),
  summary: z.string().min(1),
})

export interface SummariseGoalsDeps {
  coachSummarisesGoals: (goals: string) => Promise<unknown>
  loadEvents: (aggregateType: string, id: string) => Promise<Event[]>
  appendEvent: (event: Event) => Promise<void>
  clock: () => string
}

type SummariseGoalsResult =
  | { success: true }
  | { success: false, error: string }

function isOnboardingComplete(events: Event[]): boolean {
  const hasInjuriesConfirmed = events.some(
    (event) => event.eventType === AthleteProfileEventType.InjuriesConfirmed,
  )
  const hasExperienceLevelAdded = events.some(
    (event) => event.eventType === AthleteProfileEventType.ExperienceLevelAdded,
  )
  return hasInjuriesConfirmed && hasExperienceLevelAdded
}

export async function summariseGoals(
  accountId: string,
  deps: SummariseGoalsDeps,
): Promise<SummariseGoalsResult> {
  const existingEvents = await deps.loadEvents(ATHLETE_PROFILE_AGGREGATE_TYPE, accountId)

  const lastGoalsSubmittedEvent = [...existingEvents]
    .reverse()
    .find((event) => event.eventType === AthleteProfileEventType.GoalsSubmitted)

  if (!lastGoalsSubmittedEvent) {
    return { success: false, error: 'goals_not_submitted' }
  }

  const goalsAlreadyConfirmed = existingEvents.some(
    (event) => event.eventType === AthleteProfileEventType.GoalsConfirmed,
  )
  if (goalsAlreadyConfirmed) {
    return { success: false, error: 'goals_already_confirmed' }
  }

  const { goals } = GoalsSubmittedSchema.parse(lastGoalsSubmittedEvent.payload)

  let coachResponse: unknown
  try {
    coachResponse = await deps.coachSummarisesGoals(goals)
  } catch {
    return { success: false, error: 'coach_unavailable' }
  }

  const validation = CoachResponseSchema.safeParse(coachResponse)
  if (!validation.success) {
    return { success: false, error: 'invalid_coach_response' }
  }

  const { summarisedGoals, summary } = validation.data
  const occurredAt = deps.clock()
  let version = existingEvents.length + 1

  await deps.appendEvent({
    eventId: generateUlid(),
    aggregateType: ATHLETE_PROFILE_AGGREGATE_TYPE,
    aggregateId: accountId,
    eventType: AthleteProfileEventType.GoalsConfirmed,
    payload: { accountId, goals, summarisedGoals, summary, confirmedAt: occurredAt },
    occurredAt,
    version,
  })

  if (isOnboardingComplete(existingEvents)) {
    version += 1
    await deps.appendEvent({
      eventId: generateUlid(),
      aggregateType: ATHLETE_PROFILE_AGGREGATE_TYPE,
      aggregateId: accountId,
      eventType: AthleteProfileEventType.OnboardingCompleted,
      payload: { accountId, completedAt: occurredAt },
      occurredAt,
      version,
    })
  }

  return { success: true }
}
