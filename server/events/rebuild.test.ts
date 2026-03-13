import { describe, it, expect } from 'vitest'
import type { Event } from './types'
import { rebuildAllProjections } from './rebuild'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const PROJECTION_KEYS = [
  'projections/account-registry',
  'projections/goals-summary',
  'projections/injuries-summary',
  'projections/onboarding-status',
  'projections/athlete-coaching-profile',
]

function makeEvent(aggregateType: string, eventType: string, version = 1): Event {
  return {
    eventId: `01JNQP2V3K4M5N6R7S8T9W${String(version).padStart(4, '0')}`,
    aggregateType,
    aggregateId: ACCOUNT_ID,
    eventType,
    payload: { accountId: ACCOUNT_ID },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version,
  }
}

function mockStubs() {
  const processedEvents: Event[] = []
  const clearedKeys: string[] = []

  return {
    loadAllEventsForType: async (aggregateType: string): Promise<Event[]> => [],
    updateProjectionsForEvent: async (event: Event): Promise<void> => { processedEvents.push(event) },
    clearProjection: async (key: string): Promise<void> => { clearedKeys.push(key) },
    processedEvents,
    clearedKeys,
  }
}

// ─── rebuildAllProjections ───

describe('rebuildAllProjections', () => {
  describe('Given no events in any stream', () => {
    describe('When rebuildAllProjections is called', () => {
      it('Then all five projections are cleared and no events are processed', async () => {
        const deps = mockStubs()

        await rebuildAllProjections(deps)

        expect(deps.processedEvents).toHaveLength(0)
        expect(deps.clearedKeys).toEqual(expect.arrayContaining(PROJECTION_KEYS))
        expect(deps.clearedKeys).toHaveLength(PROJECTION_KEYS.length)
      })
    })
  })

  describe('Given events in the AthleteAccount stream', () => {
    describe('When rebuildAllProjections is called', () => {
      it('Then AthleteAccount events are loaded and processed in stream order', async () => {
        const registeredEvent = makeEvent('AthleteAccount', 'AthleteRegistered', 1)
        const deps = mockStubs()
        deps.loadAllEventsForType = async (aggregateType: string) => {
          if (aggregateType === 'AthleteAccount') return [registeredEvent]
          return []
        }

        await rebuildAllProjections(deps)

        expect(deps.processedEvents).toEqual([registeredEvent])
      })
    })
  })

  describe('Given events in the AthleteProfile stream', () => {
    describe('When rebuildAllProjections is called', () => {
      it('Then AthleteProfile events are loaded and processed in stream order', async () => {
        const goalsSubmittedEvent = makeEvent('AthleteProfile', 'GoalsSubmitted', 1)
        const goalsConfirmedEvent = makeEvent('AthleteProfile', 'GoalsConfirmed', 2)
        const deps = mockStubs()
        deps.loadAllEventsForType = async (aggregateType: string) => {
          if (aggregateType === 'AthleteProfile') return [goalsSubmittedEvent, goalsConfirmedEvent]
          return []
        }

        await rebuildAllProjections(deps)

        expect(deps.processedEvents).toEqual([goalsSubmittedEvent, goalsConfirmedEvent])
      })
    })
  })

  describe('Given events in both AthleteAccount and AthleteProfile streams', () => {
    describe('When rebuildAllProjections is called', () => {
      it('Then AthleteAccount events are processed before AthleteProfile events', async () => {
        const registeredEvent = makeEvent('AthleteAccount', 'AthleteRegistered', 1)
        const goalsSubmittedEvent = makeEvent('AthleteProfile', 'GoalsSubmitted', 1)
        const deps = mockStubs()
        deps.loadAllEventsForType = async (aggregateType: string) => {
          if (aggregateType === 'AthleteAccount') return [registeredEvent]
          if (aggregateType === 'AthleteProfile') return [goalsSubmittedEvent]
          return []
        }

        await rebuildAllProjections(deps)

        expect(deps.processedEvents).toEqual([registeredEvent, goalsSubmittedEvent])
      })
    })
  })

  describe('Given projections with existing data', () => {
    describe('When rebuildAllProjections is called', () => {
      it('Then all projections are cleared before any event is processed', async () => {
        const operations: string[] = []

        const goalsEvent = makeEvent('AthleteProfile', 'GoalsSubmitted', 1)
        const deps = mockStubs()
        deps.loadAllEventsForType = async (aggregateType: string) => {
          if (aggregateType === 'AthleteProfile') return [goalsEvent]
          return []
        }
        deps.clearProjection = async (key: string): Promise<void> => { operations.push(`clear:${key}`) }
        deps.updateProjectionsForEvent = async (event: Event): Promise<void> => { operations.push(`process:${event.eventType}`) }

        await rebuildAllProjections(deps)

        const firstProcessIndex = operations.findIndex((operation) => operation.startsWith('process:'))
        const lastClearIndex = operations.findLastIndex((operation) => operation.startsWith('clear:'))

        expect(firstProcessIndex).toBeGreaterThan(-1)
        expect(lastClearIndex).toBeGreaterThan(-1)
        expect(lastClearIndex).toBeLessThan(firstProcessIndex)
      })
    })
  })
})
