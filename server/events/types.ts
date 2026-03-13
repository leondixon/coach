import { z } from 'zod'

export const EventSchema = z.object({
  eventId: z.ulid(),
  aggregateType: z.string(),
  aggregateId: z.ulid(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.iso.datetime(),
  version: z.number().int().positive(),
})

export type Event = z.infer<typeof EventSchema>
