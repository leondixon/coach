import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import { confirmInjuries } from './confirm-injuries'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const validSummarisedInjuries = {
  affectedAreas: ['left shoulder'],
  restrictions: ['overhead press', 'behind-the-neck movements'],
  severity: 'mild' as const,
  summary: 'Athlete has a mild left shoulder impingement. Avoid overhead pressing movements.',
}

function mockStubs() {
  return {
    appendEvent: async (_event: Event) => {},
    loadEvents: async (_aggregateType: string, _id: string) => [] as Event[],
    clock: () => '2026-03-08T13:00:00.000Z',
  }
}

function injuriesSubmittedEvent(version = 1): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesSubmitted',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'I have a mild shoulder impingement on the left side',
      submittedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
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
      goals: 'Build muscle',
      summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest'], priority: 5 }],
      summary: 'Athlete wants to build muscle.',
      confirmedAt: '2026-03-08T11:30:00.000Z',
    },
    occurredAt: '2026-03-08T11:30:00.000Z',
    version,
  }
}

function injuriesConfirmedEvent(version = 3): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ3',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'I have a mild shoulder impingement on the left side',
      summarisedInjuries: validSummarisedInjuries,
      confirmedAt: '2026-03-08T12:30:00.000Z',
    },
    occurredAt: '2026-03-08T12:30:00.000Z',
    version,
  }
}

function experienceLevelAddedEvent(version = 4): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ4',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'ExperienceLevelAdded',
    payload: {
      accountId: ACCOUNT_ID,
      experienceLevel: 'intermediate',
      addedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version,
  }
}

// ─── ConfirmInjuries command ───

describe('ConfirmInjuries command', () => {
  describe('Given InjuriesSubmitted exists in the stream', () => {
    describe('When ConfirmInjuries is called with valid summarisedInjuries', () => {
      it('Then it emits InjuriesConfirmed', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedInjuries: validSummarisedInjuries,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]

        let appendedEvent: Event | undefined
        mocks.appendEvent = async (event: Event) => { appendedEvent = event }

        const result = await confirmInjuries(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          eventType: 'InjuriesConfirmed',
          payload: {
            accountId: ACCOUNT_ID,
            injuries: 'I have a mild shoulder impingement on the left side',
            summarisedInjuries: validSummarisedInjuries,
            confirmedAt: '2026-03-08T13:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given no InjuriesSubmitted exists in the stream', () => {
    describe('When ConfirmInjuries is called', () => {
      it('Then it rejects with injuries_not_submitted', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedInjuries: validSummarisedInjuries,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => []

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await confirmInjuries(input, mocks)

        expect(result).toEqual({ success: false, error: 'injuries_not_submitted' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given InjuriesConfirmed already exists', () => {
    describe('When ConfirmInjuries is called again', () => {
      it('Then it rejects with injuries_already_confirmed', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedInjuries: validSummarisedInjuries,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent(), injuriesConfirmedEvent()]

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await confirmInjuries(input, mocks)

        expect(result).toEqual({ success: false, error: 'injuries_already_confirmed' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given GoalsConfirmed, InjuriesSubmitted, and ExperienceLevelAdded all exist', () => {
    describe('When ConfirmInjuries is called (the final prerequisite)', () => {
      it('Then it emits InjuriesConfirmed and OnboardingCompleted', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedInjuries: validSummarisedInjuries,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [
          goalsConfirmedEvent(1),
          injuriesSubmittedEvent(2),
          experienceLevelAddedEvent(3),
        ]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await confirmInjuries(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(2)

        const eventTypes = appendedEvents.map((event) => event.eventType)
        expect(eventTypes).toContain('InjuriesConfirmed')
        expect(eventTypes).toContain('OnboardingCompleted')

        const onboardingEvent = appendedEvents.find((event) => event.eventType === 'OnboardingCompleted')!
        expect(onboardingEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          payload: {
            accountId: ACCOUNT_ID,
            completedAt: '2026-03-08T13:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given GoalsConfirmed exists but ExperienceLevelAdded does not', () => {
    describe('When ConfirmInjuries is called', () => {
      it('Then it emits only InjuriesConfirmed — onboarding is not yet complete', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedInjuries: validSummarisedInjuries,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsConfirmedEvent(1), injuriesSubmittedEvent(2)]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await confirmInjuries(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(1)
        expect(appendedEvents[0]!.eventType).toBe('InjuriesConfirmed')
      })
    })
  })
})
