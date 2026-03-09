import { EventSchema, type Event } from './types'

function storageKey(aggregateType: string, aggregateId: string): string {
  return `events/${aggregateType}/${aggregateId}`
}

export async function appendEvent(event: Event): Promise<void> {
  const storage = useStorage('local:')
  const key = storageKey(event.aggregateType, event.aggregateId)
  const existing = await loadEvents(event.aggregateType, event.aggregateId)
  await storage.setItem(key, [...existing, event])
}

export async function loadEvents(aggregateType: string, aggregateId: string): Promise<Event[]> {
  const storage = useStorage('local:')
  const key = storageKey(aggregateType, aggregateId)
  const raw = await storage.getItem(key)
  if (!Array.isArray(raw)) return []
  return raw.map((item) => EventSchema.parse(item))
}

export async function loadAllEventsForType(aggregateType: string): Promise<Event[]> {
  const storage = useStorage('local:')
  const keys = await storage.getKeys(`events/${aggregateType}`)
  const allEvents: Event[] = []
  for (const key of keys) {
    const raw = await storage.getItem(key)
    if (Array.isArray(raw)) {
      for (const item of raw) {
        allEvents.push(EventSchema.parse(item))
      }
    }
  }
  return allEvents
}
