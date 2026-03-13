import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import { confirmGoals } from './confirm-goals'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    appendEvent: async (_event: Event) => {},
    loadEvents: async (_aggregateType: string, _id: string) => [] as Event[],
    clock: () => '2026-03-08T13:00:00.000Z',
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
      goals: 'I want to build muscle',
      summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest'], priority: 5 }],
      summary: 'Athlete wants to build muscle.',
      confirmedAt: '2026-03-08T12:30:00.000Z',
    },
    occurredAt: '2026-03-08T12:30:00.000Z',
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
      injuries: 'No injuries',
      summarisedInjuries: {
        affectedAreas: ['none'],
        restrictions: [],
        severity: 'mild',
        summary: 'No injuries reported.',
      },
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

const validSummarisedGoals = [
  { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 },
  { description: 'Improve cardiovascular fitness', targetAreas: ['full body'], priority: 3 },
]

const validSummary = 'Athlete wants to focus on hypertrophy as primary goal, with cardio as secondary.'

// ─── ConfirmGoals command ───

describe('ConfirmGoals command', () => {
  describe('Given GoalsSubmitted exists in the stream', () => {
    describe('When ConfirmGoals is called with valid summarisedGoals', () => {
      it('Then it emits GoalsConfirmed with the goals array and summary', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedGoals: validSummarisedGoals,
          summary: validSummary,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]

        let appendedEvent: Event | undefined
        mocks.appendEvent = async (event: Event) => { appendedEvent = event }

        const result = await confirmGoals(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          eventType: 'GoalsConfirmed',
          payload: {
            accountId: ACCOUNT_ID,
            goals: 'I want to build muscle',
            summarisedGoals: validSummarisedGoals,
            summary: validSummary,
            confirmedAt: '2026-03-08T13:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given no GoalsSubmitted exists in the stream', () => {
    describe('When ConfirmGoals is called', () => {
      it('Then it rejects with goals_not_submitted', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedGoals: validSummarisedGoals,
          summary: validSummary,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => []

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await confirmGoals(input, mocks)

        expect(result).toEqual({ success: false, error: 'goals_not_submitted' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given GoalsConfirmed already exists', () => {
    describe('When ConfirmGoals is called again', () => {
      it('Then it rejects with goals_already_confirmed', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedGoals: validSummarisedGoals,
          summary: validSummary,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent(), goalsConfirmedEvent()]

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await confirmGoals(input, mocks)

        expect(result).toEqual({ success: false, error: 'goals_already_confirmed' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given GoalsSubmitted, InjuriesConfirmed, and ExperienceLevelAdded all exist', () => {
    describe('When ConfirmGoals is called (the final prerequisite)', () => {
      it('Then it emits GoalsConfirmed and OnboardingCompleted', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedGoals: validSummarisedGoals,
          summary: validSummary,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [
          goalsSubmittedEvent(1),
          injuriesConfirmedEvent(2),
          experienceLevelAddedEvent(3),
        ]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await confirmGoals(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(2)

        const eventTypes = appendedEvents.map((event) => event.eventType)
        expect(eventTypes).toContain('GoalsConfirmed')
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

  describe('Given InjuriesConfirmed exists but ExperienceLevelAdded does not', () => {
    describe('When ConfirmGoals is called', () => {
      it('Then it emits only GoalsConfirmed — onboarding is not yet complete', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          summarisedGoals: validSummarisedGoals,
          summary: validSummary,
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent(1), injuriesConfirmedEvent(2)]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await confirmGoals(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(1)
        expect(appendedEvents[0]!.eventType).toBe('GoalsConfirmed')
      })
    })
  })
})
