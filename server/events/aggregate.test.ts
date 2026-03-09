import { describe, it, expect } from 'vitest'
import type { Event } from './types'
import { rehydrateAthleteAccount, rehydrateAthleteProfile } from './aggregate'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    loadEvents: async (_aggregateType: string, _id: string): Promise<Event[]> => [],
  }
}

function athleteRegisteredEvent(version = 1): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteAccount',
    aggregateId: ACCOUNT_ID,
    eventType: 'AthleteRegistered',
    payload: {
      accountId: ACCOUNT_ID,
      firstName: 'Leon',
      lastName: 'Test',
      email: 'leon@test.com',
      registeredAt: '2026-03-08T10:00:00.000Z',
    },
    occurredAt: '2026-03-08T10:00:00.000Z',
    version,
  }
}

function goalsSubmittedEvent(version = 1): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
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
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ3',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      goals: 'I want to build muscle',
      summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest', 'back'], priority: 5 }],
      summary: 'Athlete wants to build muscle.',
      confirmedAt: '2026-03-08T11:30:00.000Z',
    },
    occurredAt: '2026-03-08T11:30:00.000Z',
    version,
  }
}

function experienceLevelAddedEvent(version = 2): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ4',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'ExperienceLevelAdded',
    payload: {
      accountId: ACCOUNT_ID,
      experienceLevel: 'intermediate',
      addedAt: '2026-03-08T11:00:00.000Z',
    },
    occurredAt: '2026-03-08T11:00:00.000Z',
    version,
  }
}

function injuriesSubmittedEvent(version = 3): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ5',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesSubmitted',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Minor left knee pain',
      submittedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version,
  }
}

function injuriesConfirmedEvent(version = 4): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ6',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Minor left knee pain',
      summarisedInjuries: {
        affectedAreas: ['left knee'],
        restrictions: ['avoid deep squats'],
        severity: 'mild',
        summary: 'Minor left knee pain with squat restrictions.',
      },
      confirmedAt: '2026-03-08T12:30:00.000Z',
    },
    occurredAt: '2026-03-08T12:30:00.000Z',
    version,
  }
}

function onboardingCompletedEvent(version = 5): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ7',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'OnboardingCompleted',
    payload: {
      accountId: ACCOUNT_ID,
      completedAt: '2026-03-08T13:00:00.000Z',
    },
    occurredAt: '2026-03-08T13:00:00.000Z',
    version,
  }
}

// ─── rehydrateAthleteAccount ───

describe('rehydrateAthleteAccount', () => {
  describe('Given no events in the AthleteAccount stream', () => {
    describe('When rehydrateAthleteAccount is called', () => {
      it('Then returns undefined', async () => {
        const deps = mockStubs()

        const result = await rehydrateAthleteAccount(ACCOUNT_ID, deps)

        expect(result).toBeUndefined()
      })
    })
  })

  describe('Given an AthleteRegistered event exists', () => {
    describe('When rehydrateAthleteAccount is called', () => {
      it('Then returns the full account state', async () => {
        const deps = mockStubs()
        deps.loadEvents = async () => [athleteRegisteredEvent()]

        const result = await rehydrateAthleteAccount(ACCOUNT_ID, deps)

        expect(result).toEqual({
          accountId: ACCOUNT_ID,
          firstName: 'Leon',
          lastName: 'Test',
          email: 'leon@test.com',
          registeredAt: '2026-03-08T10:00:00.000Z',
        })
      })
    })
  })

  describe('Given rehydrateAthleteAccount is invoked', () => {
    describe('When called with an accountId', () => {
      it('Then loads events from the AthleteAccount aggregate stream for that id', async () => {
        const deps = mockStubs()

        let capturedAggregateType: string | undefined
        let capturedId: string | undefined
        deps.loadEvents = async (aggregateType: string, id: string) => {
          capturedAggregateType = aggregateType
          capturedId = id
          return []
        }

        await rehydrateAthleteAccount(ACCOUNT_ID, deps)

        expect(capturedAggregateType).toBe('AthleteAccount')
        expect(capturedId).toBe(ACCOUNT_ID)
      })
    })
  })
})

// ─── rehydrateAthleteProfile ───

describe('rehydrateAthleteProfile', () => {
  describe('Given no events in the AthleteProfile stream', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then returns an empty profile state', async () => {
        const deps = mockStubs()

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result).toEqual({})
      })
    })
  })

  describe('Given a GoalsSubmitted event exists', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then the profile state includes goals and goalsSubmittedAt', async () => {
        const deps = mockStubs()
        deps.loadEvents = async () => [goalsSubmittedEvent()]

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result.goals).toBe('I want to build muscle')
        expect(result.goalsSubmittedAt).toBe('2026-03-08T11:00:00.000Z')
        expect(result.goalsConfirmedAt).toBeUndefined()
      })
    })
  })

  describe('Given GoalsSubmitted is followed by GoalsConfirmed', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then the profile state includes the summarised goals and confirmation timestamp', async () => {
        const deps = mockStubs()
        deps.loadEvents = async () => [goalsSubmittedEvent(1), goalsConfirmedEvent(2)]

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result.goals).toBe('I want to build muscle')
        expect(result.summarisedGoals).toEqual([
          { description: 'Build muscle', targetAreas: ['chest', 'back'], priority: 5 },
        ])
        expect(result.goalsSummary).toBe('Athlete wants to build muscle.')
        expect(result.goalsConfirmedAt).toBe('2026-03-08T11:30:00.000Z')
      })
    })
  })

  describe('Given a GoalsSubmitted is re-submitted after the first', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then the profile state reflects the latest GoalsSubmitted goals text', async () => {
        const resubmittedGoalsEvent: Event = {
          ...goalsSubmittedEvent(1),
          eventId: '01JNQP2V3K4M5N6R7S8T9WXYZA',
          payload: {
            accountId: ACCOUNT_ID,
            goals: 'Updated: I want to focus on fat loss',
            submittedAt: '2026-03-08T11:10:00.000Z',
          },
          occurredAt: '2026-03-08T11:10:00.000Z',
          version: 2,
        }
        const deps = mockStubs()
        deps.loadEvents = async () => [goalsSubmittedEvent(1), resubmittedGoalsEvent]

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result.goals).toBe('Updated: I want to focus on fat loss')
      })
    })
  })

  describe('Given an ExperienceLevelAdded event exists', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then the profile state includes the experience level', async () => {
        const deps = mockStubs()
        deps.loadEvents = async () => [goalsSubmittedEvent(1), experienceLevelAddedEvent(2)]

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result.experienceLevel).toBe('intermediate')
      })
    })
  })

  describe('Given an InjuriesSubmitted event exists', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then the profile state includes injuries and injuriesSubmittedAt', async () => {
        const deps = mockStubs()
        deps.loadEvents = async () => [injuriesSubmittedEvent()]

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result.injuries).toBe('Minor left knee pain')
        expect(result.injuriesSubmittedAt).toBe('2026-03-08T12:00:00.000Z')
        expect(result.injuriesConfirmedAt).toBeUndefined()
      })
    })
  })

  describe('Given InjuriesSubmitted is followed by InjuriesConfirmed', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then the profile state includes the summarised injuries and confirmation timestamp', async () => {
        const deps = mockStubs()
        deps.loadEvents = async () => [injuriesSubmittedEvent(3), injuriesConfirmedEvent(4)]

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result.summarisedInjuries).toEqual({
          affectedAreas: ['left knee'],
          restrictions: ['avoid deep squats'],
          severity: 'mild',
          summary: 'Minor left knee pain with squat restrictions.',
        })
        expect(result.injuriesConfirmedAt).toBe('2026-03-08T12:30:00.000Z')
      })
    })
  })

  describe('Given all onboarding events exist including OnboardingCompleted', () => {
    describe('When rehydrateAthleteProfile is called', () => {
      it('Then the profile state includes onboardingCompletedAt', async () => {
        const deps = mockStubs()
        deps.loadEvents = async () => [
          goalsSubmittedEvent(1),
          experienceLevelAddedEvent(2),
          goalsConfirmedEvent(3),
          injuriesSubmittedEvent(4),
          injuriesConfirmedEvent(5),
          onboardingCompletedEvent(6),
        ]

        const result = await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(result.onboardingCompletedAt).toBe('2026-03-08T13:00:00.000Z')
      })
    })
  })

  describe('Given rehydrateAthleteProfile is invoked', () => {
    describe('When called with an accountId', () => {
      it('Then loads events from the AthleteProfile aggregate stream for that id', async () => {
        const deps = mockStubs()

        let capturedAggregateType: string | undefined
        let capturedId: string | undefined
        deps.loadEvents = async (aggregateType: string, id: string) => {
          capturedAggregateType = aggregateType
          capturedId = id
          return []
        }

        await rehydrateAthleteProfile(ACCOUNT_ID, deps)

        expect(capturedAggregateType).toBe('AthleteProfile')
        expect(capturedId).toBe(ACCOUNT_ID)
      })
    })
  })
})
