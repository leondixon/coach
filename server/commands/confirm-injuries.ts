import { z } from 'zod'
import { generateUlid } from '../utils/ulid'
import type { Event } from '../events/types'
import {
  SummarisedInjuriesSchema,
  InjuriesSubmittedSchema,
  AthleteProfileEventType,
  ATHLETE_PROFILE_AGGREGATE_TYPE,
} from '../events/athlete-profile'

const ConfirmInjuriesInput = z.object({
  accountId: z.ulid(),
  summarisedInjuries: SummarisedInjuriesSchema,
})

type ConfirmInjuriesInput = z.infer<typeof ConfirmInjuriesInput>

interface ConfirmInjuriesDeps {
  appendEvent: (event: Event) => Promise<void>
  loadEvents: (aggregateType: string, id: string) => Promise<Event[]>
  clock: () => string
}

type ConfirmInjuriesResult =
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

export async function confirmInjuries(
  input: ConfirmInjuriesInput,
  deps: ConfirmInjuriesDeps,
): Promise<ConfirmInjuriesResult> {
  const validation = ConfirmInjuriesInput.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'invalid_summarised_injuries' }
  }

  const { accountId, summarisedInjuries } = validation.data

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
