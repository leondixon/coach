import { z } from 'zod'

export const AthleteRegisteredSchema = z.object({
  accountId: z.ulid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  registeredAt: z.iso.datetime(),
})

export type AthleteRegisteredPayload = z.infer<typeof AthleteRegisteredSchema>

export const AthleteAccountEventType = {
  AthleteRegistered: 'AthleteRegistered',
} as const

export type AthleteAccountEventType = typeof AthleteAccountEventType[keyof typeof AthleteAccountEventType]

export const ATHLETE_ACCOUNT_AGGREGATE_TYPE = 'AthleteAccount' as const
