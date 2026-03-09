import { z } from 'zod'
import { generateUlid } from '../utils/ulid'
import type { Event } from '../events/types'
import {
  AthleteProfileEventType,
  ATHLETE_PROFILE_AGGREGATE_TYPE,
} from '../events/athlete-profile'

const SubmitGoalsInput = z.object({
  accountId: z.ulid(),
  goals: z.string().transform(value => value.trim()).pipe(z.string().min(1, 'goals_required')),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})

type SubmitGoalsInput = z.infer<typeof SubmitGoalsInput>

interface SubmitGoalsDeps {
  appendEvent: (event: Event) => Promise<void>
  loadEvents: (aggregateType: string, id: string) => Promise<Event[]>
  clock: () => string
}

type SubmitGoalsResult =
  | { success: true }
  | { success: false, error: string }

export async function submitGoals(
  input: SubmitGoalsInput,
  deps: SubmitGoalsDeps,
): Promise<SubmitGoalsResult> {
  const validation = SubmitGoalsInput.safeParse(input)
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]
    if (firstIssue?.path.includes('goals')) {
      return { success: false, error: 'goals_required' }
    }
    if (firstIssue?.path.includes('experienceLevel')) {
      return { success: false, error: 'invalid_experience_level' }
    }
    return { success: false, error: 'validation_failed' }
  }

  const { accountId, goals, experienceLevel } = validation.data

  const existingEvents = await deps.loadEvents(ATHLETE_PROFILE_AGGREGATE_TYPE, accountId)
  const goalsAlreadyConfirmed = existingEvents.some(
    (event) => event.eventType === AthleteProfileEventType.GoalsConfirmed,
  )
  if (goalsAlreadyConfirmed) {
    return { success: false, error: 'goals_already_confirmed' }
  }

  const occurredAt = deps.clock()
  const version = existingEvents.length + 1

  await deps.appendEvent({
    eventId: generateUlid(),
    aggregateType: ATHLETE_PROFILE_AGGREGATE_TYPE,
    aggregateId: accountId,
    eventType: AthleteProfileEventType.GoalsSubmitted,
    payload: { accountId, goals, submittedAt: occurredAt },
    occurredAt,
    version,
  })

  await deps.appendEvent({
    eventId: generateUlid(),
    aggregateType: ATHLETE_PROFILE_AGGREGATE_TYPE,
    aggregateId: accountId,
    eventType: AthleteProfileEventType.ExperienceLevelAdded,
    payload: { accountId, experienceLevel, addedAt: occurredAt },
    occurredAt,
    version: version + 1,
  })

  return { success: true }
}
