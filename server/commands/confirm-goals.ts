import { z } from 'zod'
import { generateUlid } from '../utils/ulid'
import type { Event } from '../events/types'
import {
  SummarisedGoalSchema,
  GoalsSubmittedSchema,
  AthleteProfileEventType,
  ATHLETE_PROFILE_AGGREGATE_TYPE,
} from '../events/athlete-profile'

const ConfirmGoalsInput = z.object({
  accountId: z.ulid(),
  summarisedGoals: z.array(SummarisedGoalSchema).min(1).max(5),
  summary: z.string(),
})

type ConfirmGoalsInput = z.infer<typeof ConfirmGoalsInput>

interface ConfirmGoalsDeps {
  appendEvent: (event: Event) => Promise<void>
  loadEvents: (aggregateType: string, id: string) => Promise<Event[]>
  clock: () => string
}

type ConfirmGoalsResult =
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

function validationErrorCode(error: z.ZodError): string {
  const firstIssue = error.issues[0]
  if (!firstIssue) return 'invalid_input'
  const field = firstIssue.path[0]
  if (field === 'summarisedGoals') return 'invalid_summarised_goals'
  if (field === 'summary') return 'summary_required'
  return 'invalid_input'
}

export async function confirmGoals(
  input: ConfirmGoalsInput,
  deps: ConfirmGoalsDeps,
): Promise<ConfirmGoalsResult> {
  const validation = ConfirmGoalsInput.safeParse(input)
  if (!validation.success) {
    return { success: false, error: validationErrorCode(validation.error) }
  }

  const { accountId, summarisedGoals, summary } = validation.data

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
