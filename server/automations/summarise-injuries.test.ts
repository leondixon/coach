import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import type { SummarisedInjuries } from '../events/athlete-profile'
import { summariseInjuries } from './summarise-injuries'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const validSummarisedInjuries: SummarisedInjuries = {
  affectedAreas: ['left shoulder'],
  restrictions: ['overhead press', 'behind-the-neck movements'],
  severity: 'mild',
  summary: 'Athlete has a mild left shoulder impingement. Avoid overhead pressing movements.',
}

function mockStubs() {
  return {
    coachSummarisesInjuries: async (_injuries: string): Promise<SummarisedInjuries> => validSummarisedInjuries,
    loadEvents: async (_aggregateType: string, _id: string): Promise<Event[]> => [],
    appendEvent: async (_event: Event): Promise<void> => {},
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
      injuries: 'Mild shoulder impingement on the left side',
      submittedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version,
  }
}

function injuriesConfirmedEvent(version = 2): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Mild shoulder impingement on the left side',
      summarisedInjuries: validSummarisedInjuries,
      confirmedAt: '2026-03-08T12:30:00.000Z',
    },
    occurredAt: '2026-03-08T12:30:00.000Z',
    version,
  }
}

function goalsConfirmedEvent(version = 2): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ3',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      goals: 'I want to build muscle',
      summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest'], priority: 5 }],
      summary: 'Athlete wants to build muscle.',
      confirmedAt: '2026-03-08T11:30:00.000Z',
    },
    occurredAt: '2026-03-08T11:30:00.000Z',
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

// ─── SummariseInjuries automation ───

describe('SummariseInjuries automation', () => {
  describe('Given InjuriesSubmitted exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then it appends InjuriesConfirmed with the structured coach output', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]

        let appendedEvent: Event | undefined
        mocks.appendEvent = async (event: Event) => { appendedEvent = event }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          eventType: 'InjuriesConfirmed',
          payload: {
            accountId: ACCOUNT_ID,
            injuries: 'Mild shoulder impingement on the left side',
            summarisedInjuries: validSummarisedInjuries,
            confirmedAt: '2026-03-08T13:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given InjuriesSubmitted exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then the injuries text from the event is passed verbatim to the coach', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]

        let capturedInjuries: string | undefined
        mocks.coachSummarisesInjuries = async (injuries: string) => {
          capturedInjuries = injuries
          return validSummarisedInjuries
        }

        await summariseInjuries(ACCOUNT_ID, mocks)

        expect(capturedInjuries).toBe('Mild shoulder impingement on the left side')
      })
    })
  })

  describe('Given no InjuriesSubmitted exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then it returns injuries_not_submitted and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => []

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'injuries_not_submitted' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given InjuriesConfirmed already exists in the stream', () => {
    describe('When the automation runs', () => {
      it('Then it returns injuries_already_confirmed and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent(1), injuriesConfirmedEvent(2)]

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'injuries_already_confirmed' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given InjuriesSubmitted, GoalsConfirmed, and ExperienceLevelAdded all exist', () => {
    describe('When the automation runs (completing the final onboarding prerequisite)', () => {
      it('Then it appends InjuriesConfirmed and OnboardingCompleted', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [
          goalsConfirmedEvent(1),
          injuriesSubmittedEvent(2),
          experienceLevelAddedEvent(3),
        ]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

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
    describe('When the automation runs', () => {
      it('Then it appends only InjuriesConfirmed — onboarding is not yet complete', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [goalsConfirmedEvent(1), injuriesSubmittedEvent(2)]

        const appendedEvents: Event[] = []
        mocks.appendEvent = async (event: Event) => { appendedEvents.push(event) }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvents).toHaveLength(1)
        expect(appendedEvents[0]!.eventType).toBe('InjuriesConfirmed')
      })
    })
  })

  describe('Given the coach returns an empty affectedAreas array', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]
        mocks.coachSummarisesInjuries = async (_injuries: string) => ({
          affectedAreas: [],
          restrictions: [],
          severity: 'mild',
          summary: 'No affected areas identified.',
        })

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach returns an invalid severity value', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]
        // severity 'critical' is not in the valid enum; cast as string because
        // TypeScript rejects the literal at compile time, and we need to verify
        // Zod also rejects it at runtime.
        mocks.coachSummarisesInjuries = async (_injuries: string) =>
          ({ affectedAreas: ['left shoulder'], restrictions: [], severity: 'critical', summary: 'Bad severity.' } as unknown as SummarisedInjuries)

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach returns an empty summary string', () => {
    describe('When the automation runs', () => {
      it('Then it returns invalid_coach_response and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]
        mocks.coachSummarisesInjuries = async (_injuries: string) => ({
          affectedAreas: ['left shoulder'],
          restrictions: ['overhead press'],
          severity: 'mild',
          summary: '',
        })

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'invalid_coach_response' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given the coach is unavailable', () => {
    describe('When the automation runs', () => {
      it('Then it returns coach_unavailable and does not append any event', async () => {
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]
        mocks.coachSummarisesInjuries = async (_injuries: string) => {
          throw new Error('Connection refused')
        }

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await summariseInjuries(ACCOUNT_ID, mocks)

        expect(result).toEqual({ success: false, error: 'coach_unavailable' })
        expect(eventAppended).toBe(false)
      })
    })
  })
})
