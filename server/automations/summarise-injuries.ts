import { z } from 'zod'
import type { Event } from '../events/types'
import {
  SummarisedInjuriesSchema,
  InjuriesSubmittedSchema,
  AthleteProfileEventType,
  ATHLETE_PROFILE_AGGREGATE_TYPE,
} from '../events/athlete-profile'
import { generateUlid } from '../utils/ulid'

const CoachResponseSchema = SummarisedInjuriesSchema.extend({
  summary: z.string().min(1),
})

export interface SummariseInjuriesDeps {
  coachSummarisesInjuries: (injuries: string) => Promise<unknown>
  loadEvents: (aggregateType: string, id: string) => Promise<Event[]>
  appendEvent: (event: Event) => Promise<void>
  clock: () => string
}

type SummariseInjuriesResult =
  | { success: true }
  | { success: false, error: string }

function isOnboardingComplete(events: Event[]): boolean {
  const hasGoalsConfirmed = events.some(
    (event) => event.eventType === AthleteProfileEventType.GoalsConfirmed,
  )
  const hasExperienceLevelAdded = events.some(
    (event) => event.eventType === AthleteProfileEventType.ExperienceLevelAdded,
  )
  return hasGoalsConfirmed && hasExperienceLevelAdded
}

export async function summariseInjuries(
  accountId: string,
  deps: SummariseInjuriesDeps,
): Promise<SummariseInjuriesResult> {
  const existingEvents = await deps.loadEvents(ATHLETE_PROFILE_AGGREGATE_TYPE, accountId)

  const lastInjuriesSubmittedEvent = [...existingEvents]
    .reverse()
    .find((event) => event.eventType === AthleteProfileEventType.InjuriesSubmitted)

  if (!lastInjuriesSubmittedEvent) {
    return { success: false, error: 'injuries_not_submitted' }
  }

  const injuriesAlreadyConfirmed = existingEvents.some(
    (event) => event.eventType === AthleteProfileEventType.InjuriesConfirmed,
  )
  if (injuriesAlreadyConfirmed) {
    return { success: false, error: 'injuries_already_confirmed' }
  }

  const { injuries } = InjuriesSubmittedSchema.parse(lastInjuriesSubmittedEvent.payload)

  let coachResponse: unknown
  try {
    coachResponse = await deps.coachSummarisesInjuries(injuries)
  } catch {
    return { success: false, error: 'coach_unavailable' }
  }

  const validation = CoachResponseSchema.safeParse(coachResponse)
  if (!validation.success) {
    return { success: false, error: 'invalid_coach_response' }
  }

  const summarisedInjuries = validation.data
  const occurredAt = deps.clock()
  let version = existingEvents.length + 1

  await deps.appendEvent({
    eventId: generateUlid(),
    aggregateType: ATHLETE_PROFILE_AGGREGATE_TYPE,
    aggregateId: accountId,
    eventType: AthleteProfileEventType.InjuriesConfirmed,
    payload: { accountId, injuries, summarisedInjuries, confirmedAt: occurredAt },
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
