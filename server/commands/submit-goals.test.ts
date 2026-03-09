import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import { submitGoals } from './submit-goals'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

// mockStubs returns mock implementations of all command deps.
// Individual tests override only the mocks they need to assert on.
function mockStubs() {
  return {
    appendEvent: async (_event: Event) => {},
    loadEvents: async (_aggregateType: string, _id: string) => [] as Event[],
    clock: () => '2026-03-08T12:00:00.000Z',
  }
}

function goalsSubmittedEvent(version = 1): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsSubmitted',
    payload: {
      accountId: ACCOUNT_ID,
      goals: 'I want to build muscle',
      submittedAt: '2026-03-08T11:00:00.000Z',
    },
    occurredAt: '2026-03-08T11:00:00.000Z',
    version,
  }
}

function goalsConfirmedEvent(version = 2): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      goals: 'I want to build muscle',
      summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest'], priority: 5 }],
      summary: 'Athlete wants to build muscle.',
      confirmedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version,
  }
}

// ─── SubmitGoals command ───

describe('SubmitGoals command', () => {
  describe('Given an athlete with no prior goals', () => {
    describe('When SubmitGoals is called with valid goals and experience level', () => {
      it('Then it emits GoalsSubmitted and ExperienceLevelAdded', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          goals: 'I want to build muscle and get stronger',
          experienceLevel: 'intermediate' as const,
        }
        const mocks = mockStubs()

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await submitGoals(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(2)

        const eventTypes = appendedEvents.map((event) => event.eventType)
        expect(eventTypes).toContain('GoalsSubmitted')
        expect(eventTypes).toContain('ExperienceLevelAdded')

        const goalsEvent = appendedEvents.find((event) => event.eventType === 'GoalsSubmitted')!
        expect(goalsEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          payload: {
            accountId: ACCOUNT_ID,
            goals: 'I want to build muscle and get stronger',
            submittedAt: '2026-03-08T12:00:00.000Z',
          },
        })

        const experienceEvent = appendedEvents.find((event) => event.eventType === 'ExperienceLevelAdded')!
        expect(experienceEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          payload: {
            accountId: ACCOUNT_ID,
            experienceLevel: 'intermediate',
            addedAt: '2026-03-08T12:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given goals were already submitted but not yet confirmed', () => {
    describe('When SubmitGoals is called again', () => {
      it('Then re-submission is allowed and both events are emitted again', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          goals: 'Actually, I want to focus on losing fat',
          experienceLevel: 'beginner' as const,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await submitGoals(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(2)
        expect(appendedEvents.find((event) => event.eventType === 'GoalsSubmitted')!.payload.goals)
          .toBe('Actually, I want to focus on losing fat')
      })
    })
  })

  describe('Given goals have already been confirmed', () => {
    describe('When SubmitGoals is called', () => {
      it('Then it rejects with goals_already_confirmed and emits nothing', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          goals: 'New goals after confirmation',
          experienceLevel: 'intermediate' as const,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent(), goalsConfirmedEvent()]

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await submitGoals(input, mocks)

        expect(result).toEqual({ success: false, error: 'goals_already_confirmed' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given empty goals text', () => {
    describe('When SubmitGoals is called', () => {
      it('Then it rejects with goals_required and emits nothing', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          goals: '',
          experienceLevel: 'beginner' as const,
        }
        const mocks = mockStubs()

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await submitGoals(input, mocks)

        expect(result).toEqual({ success: false, error: 'goals_required' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given whitespace-only goals text', () => {
    describe('When SubmitGoals is called', () => {
      it('Then it rejects with goals_required and emits nothing', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          goals: '   ',
          experienceLevel: 'beginner' as const,
        }
        const mocks = mockStubs()

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await submitGoals(input, mocks)

        expect(result).toEqual({ success: false, error: 'goals_required' })
        expect(eventAppended).toBe(false)
      })
    })
  })
})
