import { z } from 'zod'
import { generateUlid } from '../utils/ulid'
import type { Event } from '../events/types'
import {
  AthleteProfileEventType,
  ATHLETE_PROFILE_AGGREGATE_TYPE,
} from '../events/athlete-profile'

const SubmitInjuriesInput = z.object({
  accountId: z.ulid(),
  injuries: z.string().transform(value => value.trim()).pipe(z.string().min(1, 'injuries_required')),
})

type SubmitInjuriesInput = z.infer<typeof SubmitInjuriesInput>

interface SubmitInjuriesDeps {
  appendEvent: (event: Event) => Promise<void>
  loadEvents: (aggregateType: string, id: string) => Promise<Event[]>
  clock: () => string
}

type SubmitInjuriesResult =
  | { success: true }
  | { success: false, error: string }

export async function submitInjuries(
  input: SubmitInjuriesInput,
  deps: SubmitInjuriesDeps,
): Promise<SubmitInjuriesResult> {
  const validation = SubmitInjuriesInput.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'injuries_required' }
  }

  const { accountId, injuries } = validation.data

  const existingEvents = await deps.loadEvents(ATHLETE_PROFILE_AGGREGATE_TYPE, accountId)
  const injuriesAlreadyConfirmed = existingEvents.some(
    (event) => event.eventType === AthleteProfileEventType.InjuriesConfirmed,
  )
  if (injuriesAlreadyConfirmed) {
    return { success: false, error: 'injuries_already_confirmed' }
  }

  const occurredAt = deps.clock()
  const version = existingEvents.length + 1

  await deps.appendEvent({
    eventId: generateUlid(),
    aggregateType: ATHLETE_PROFILE_AGGREGATE_TYPE,
    aggregateId: accountId,
    eventType: AthleteProfileEventType.InjuriesSubmitted,
    payload: { accountId, injuries, submittedAt: occurredAt },
    occurredAt,
    version,
  })

  return { success: true }
}
