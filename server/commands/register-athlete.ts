import { z } from 'zod'
import {
  AthleteRegisteredSchema,
  ATHLETE_ACCOUNT_AGGREGATE_TYPE,
  AthleteAccountEventType,
} from '../events/athlete-account'
import type { Event } from '../events/types'

const RegisterAthleteInput = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
})

type RegisterAthleteInput = z.infer<typeof RegisterAthleteInput>

interface RegisterAthleteDeps {
  createCredential: (email: string, password: string) => Promise<{ success: true } | { success: false, error: string }>
  generateId: () => string
  appendEvent: (event: Event) => Promise<void>
  loadEvents: (aggregateType: string, id: string) => Promise<unknown[]>
  clock: () => string
}

type RegisterAthleteResult =
  | { success: true, accountId: string }
  | { success: false, error: string }

export async function registerAthlete(
  input: RegisterAthleteInput,
  deps: RegisterAthleteDeps,
): Promise<RegisterAthleteResult> {
  const validation = RegisterAthleteInput.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'validation_failed' }
  }

  const { firstName, lastName, email, password } = validation.data
  const accountId = deps.generateId()

  const existingEvents = await deps.loadEvents(ATHLETE_ACCOUNT_AGGREGATE_TYPE, accountId)
  if (existingEvents.length > 0) {
    return { success: false, error: 'account_already_exists' }
  }

  const credentialResult = await deps.createCredential(email, password)
  if (!credentialResult.success) {
    return { success: false, error: credentialResult.error }
  }

  const occurredAt = deps.clock()

  const event: Event = {
    eventId: deps.generateId(),
    aggregateType: ATHLETE_ACCOUNT_AGGREGATE_TYPE,
    aggregateId: accountId,
    eventType: AthleteAccountEventType.AthleteRegistered,
    payload: {
      accountId,
      firstName,
      lastName,
      email,
      registeredAt: occurredAt,
    },
    occurredAt,
    version: 1,
  }

  await deps.appendEvent(event)

  return { success: true, accountId }
}
