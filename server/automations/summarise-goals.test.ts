import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import type { SummarisedGoal } from '../events/athlete-profile'
import { summariseGoals } from './summarise-goals'

// ─── Types ───

type CoachGoalsResponse = {
  summarisedGoals: SummarisedGoal[]
  summary: string
}

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const validCoachGoalsResponse: CoachGoalsResponse = {
  summarisedGoals: [
    { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 },
    { description: 'Improve cardiovascular fitness', targetAreas: ['full body'], priority: 3 },
  ],
  summary: 'Athlete wants to focus on hypertrophy as primary goal, with cardio as secondary.',
}

function mockStubs() {
  return {
    coachSummarisesGoals: async (_goals: string): Promise<CoachGoalsResponse> => validCoachGoalsResponse,
    loadEvents: async (_aggregateType: string, _id: string): Promise<Event[]> => [],
    appendEvent: async (_event: Event): Promise<void> => {},
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
      goals: 'I want to build muscle and improve my cardiovascular fitness',
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
      goals: 'I want to build muscle and improve my cardiovascular fitness',
      summarisedGoals: validCoachGoalsResponse.summarisedGoals,
      summary: validCoachGoalsResponse.summary,
      confirmedAt: '2026-03-08T12:30:00.000Z',
    },
    occurredAt: '2026-03-08T12:30:00.000Z',
    version,
  }
}

function injuriesConfirmedEvent(version = 2): Event {
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

function experienceLevelAddedEvent(version = 3): Event {
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

// ─── SummariseGoals automation ───

describe('SummariseGoals automation', () => {
  describe('Given GoalsSubmitted exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then it appends GoalsConfirmed with the structured coach output', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]

        let appendedEvent: Event | undefined
        mocks.appendEvent = async (event: Event) => { appendedEvent = event }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          eventType: 'GoalsConfirmed',
          payload: {
            accountId: ACCOUNT_ID,
            goals: 'I want to build muscle and improve my cardiovascular fitness',
            summarisedGoals: validCoachGoalsResponse.summarisedGoals,
            summary: validCoachGoalsResponse.summary,
            confirmedAt: '2026-03-08T13:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given GoalsSubmitted exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then the goals text from the event is passed verbatim to the coach', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]

        let capturedGoals: string | undefined
        mocks.coachSummarisesGoals = async (goals: string) => {
          capturedGoals = goals
          return validCoachGoalsResponse
        }

        await summariseGoals(ACCOUNT_ID, mocks)

        expect(capturedGoals).toBe('I want to build muscle and improve my cardiovascular fitness')
      })
    })
  })

  describe('Given no GoalsSubmitted exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then it returns goals_not_submitted and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => []

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'goals_not_submitted' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given GoalsConfirmed already exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then it returns goals_already_confirmed and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent(1), goalsConfirmedEvent(2)]

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'goals_already_confirmed' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given GoalsSubmitted, InjuriesConfirmed, and ExperienceLevelAdded all exist', () => {
    describe('When the automation runs (completing the final onboarding prerequisite)', () => {
      it('Then it appends GoalsConfirmed and OnboardingCompleted', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [
          goalsSubmittedEvent(1),
          injuriesConfirmedEvent(2),
          experienceLevelAddedEvent(3),
        ]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

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
    describe('When the automation runs', () => {
      it('Then it appends only GoalsConfirmed — onboarding is not yet complete', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent(1), injuriesConfirmedEvent(2)]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(1)
        expect(appendedEvents[0]!.eventType).toBe('GoalsConfirmed')
      })
    })
  })

  describe('Given the coach returns an empty summarisedGoals array', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]
        mocks.coachSummarisesGoals = async (_goals: string) => ({
          summarisedGoals: [],
          summary: 'No goals found.',
        })

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach returns more than 5 goals', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]
        mocks.coachSummarisesGoals = async (_goals: string): Promise<CoachGoalsResponse> => ({
          summarisedGoals: Array.from({ length: 6 }, (_, index) => ({
            description: `Goal ${index + 1}`,
            targetAreas: ['legs'],
            priority: 3,
          })),
          summary: 'Too many goals.',
        })

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach returns a goal with no targetAreas', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]
        mocks.coachSummarisesGoals = async (_goals: string): Promise<CoachGoalsResponse> => ({
          summarisedGoals: [{ description: 'Build muscle', targetAreas: [], priority: 5 }],
          summary: 'Athlete wants to build muscle.',
        })

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach returns a goal with an out-of-range priority', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]
        // priority 0 is outside the valid range 1–5; we cast via unknown because
        // TypeScript rejects the literal at compile time, but we need to verify
        // the Zod schema also rejects it at runtime.
        mocks.coachSummarisesGoals = async (_goals: string) =>
          ({ summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest'], priority: 0 }], summary: 'x' } as unknown as CoachGoalsResponse)

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach returns an empty summary string', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]
        mocks.coachSummarisesGoals = async (_goals: string) => ({
          summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest'], priority: 5 }],
          summary: '',
        })

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach is unavailable', () => {
    describe('When the automation runs', () => {
      it('Then it returns coach_unavailable and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsSubmittedEvent()]
        mocks.coachSummarisesGoals = async (_goals: string) => {
          throw new Error('Connection refused')
        }

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseGoals(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'coach_unavailable' })
        expect(eventAppended).toBe(false)
      })
    })
  })
})
