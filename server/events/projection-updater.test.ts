import { describe, it, expect, beforeEach } from 'vitest'
import type { Event } from './types'
import { updateProjectionsForEvent } from './projection-updater'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'
const OTHER_ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ9'

function mockStorage() {
  const store: Record<string, unknown> = {}
  return {
    getItem: async (key: string): Promise<unknown> => store[key],
    setItem: async (key: string, value: unknown): Promise<void> => { store[key] = value },
    store,
  }
}

// Narrows an unknown store value to a projection map after a runtime check.
// The check justifies the cast: we've verified it is a non-null object.
function getProjection(store: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = store[key]
  if (typeof value !== 'object' || value === null || value === undefined) return {}
  return value as Record<string, unknown>
}

let eventCounter = 0

beforeEach(() => {
  eventCounter = 0
})

function makeEvent(
  aggregateType: string,
  eventType: string,
  payload: Record<string, unknown>,
  version = 1,
): Event {
  eventCounter += 1
  return {
    eventId: `01JNQP2V3K4M5N6R7S8T9W${String(eventCounter).padStart(4, '0')}`,
    aggregateType,
    aggregateId: ACCOUNT_ID,
    eventType,
    payload,
    occurredAt: '2026-03-08T12:00:00.000Z',
    version,
  }
}

// ─── updateProjectionsForEvent ───

describe('updateProjectionsForEvent', () => {
  describe('Given an AthleteRegistered event', () => {
    describe('When the projection updater runs', () => {
      it('Then AccountRegistry and AthleteCoachingProfile are updated', async () => {
        const storage = mockStorage()
        const event = makeEvent('AthleteAccount', 'AthleteRegistered', {
          accountId: ACCOUNT_ID,
          firstName: 'Leon',
          lastName: 'Test',
          email: 'leon@example.com',
          registeredAt: '2026-03-08T12:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const registry = getProjection(storage.store, 'projections/account-registry')
        expect(registry[ACCOUNT_ID]).toMatchObject({ accountType: 'athlete', email: 'leon@example.com', fullName: 'Leon Test' })

        const coachingProfile = getProjection(storage.store, 'projections/athlete-coaching-profile')
        expect(coachingProfile[ACCOUNT_ID]).toMatchObject({ firstName: 'Leon', lastName: 'Test' })
      })
    })
  })

  describe('Given a GoalsSubmitted event', () => {
    describe('When the projection updater runs', () => {
      it('Then GoalsSummary is updated with a pending entry and no other projections are written', async () => {
        const storage = mockStorage()
        const event = makeEvent('AthleteProfile', 'GoalsSubmitted', {
          accountId: ACCOUNT_ID,
          goals: 'I want to build muscle',
          submittedAt: '2026-03-08T12:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const goalsSummary = getProjection(storage.store, 'projections/goals-summary')
        expect(goalsSummary[ACCOUNT_ID]).toMatchObject({ goals: 'I want to build muscle', status: 'pending' })

        expect(storage.store['projections/onboarding-status']).toBeUndefined()
        expect(storage.store['projections/athlete-coaching-profile']).toBeUndefined()
      })
    })
  })

  describe('Given a GoalsConfirmed event', () => {
    describe('When the projection updater runs', () => {
      it('Then GoalsSummary, OnboardingStatus, and AthleteCoachingProfile are all updated', async () => {
        const storage = mockStorage()
        const summarisedGoals = [{ description: 'Build muscle', targetAreas: ['chest'], priority: 5 }]
        const event = makeEvent('AthleteProfile', 'GoalsConfirmed', {
          accountId: ACCOUNT_ID,
          goals: 'I want to build muscle',
          summarisedGoals,
          summary: 'Athlete wants to build muscle.',
          confirmedAt: '2026-03-08T13:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const goalsSummary = getProjection(storage.store, 'projections/goals-summary')
        expect(goalsSummary[ACCOUNT_ID]).toMatchObject({
          goals: 'I want to build muscle',
          summarisedGoals,
          summary: 'Athlete wants to build muscle.',
          status: 'confirmed',
        })

        const onboardingStatus = getProjection(storage.store, 'projections/onboarding-status')
        expect(onboardingStatus[ACCOUNT_ID]).toMatchObject({ goalsConfirmed: true })

        const coachingProfile = getProjection(storage.store, 'projections/athlete-coaching-profile')
        expect(coachingProfile[ACCOUNT_ID]).toMatchObject({ summarisedGoals, summary: 'Athlete wants to build muscle.' })
      })
    })
  })

  describe('Given an InjuriesSubmitted event', () => {
    describe('When the projection updater runs', () => {
      it('Then InjuriesSummary is updated with a pending entry and no other projections are written', async () => {
        const storage = mockStorage()
        const event = makeEvent('AthleteProfile', 'InjuriesSubmitted', {
          accountId: ACCOUNT_ID,
          injuries: 'Mild shoulder impingement',
          submittedAt: '2026-03-08T12:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const injuriesSummary = getProjection(storage.store, 'projections/injuries-summary')
        expect(injuriesSummary[ACCOUNT_ID]).toMatchObject({ injuries: 'Mild shoulder impingement', status: 'pending' })

        expect(storage.store['projections/onboarding-status']).toBeUndefined()
        expect(storage.store['projections/athlete-coaching-profile']).toBeUndefined()
      })
    })
  })

  describe('Given an InjuriesConfirmed event', () => {
    describe('When the projection updater runs', () => {
      it('Then InjuriesSummary, OnboardingStatus, and AthleteCoachingProfile are all updated', async () => {
        const storage = mockStorage()
        const summarisedInjuries = {
          affectedAreas: ['left shoulder'],
          restrictions: ['overhead press'],
          severity: 'mild',
          summary: 'Mild shoulder impingement.',
        }
        const event = makeEvent('AthleteProfile', 'InjuriesConfirmed', {
          accountId: ACCOUNT_ID,
          injuries: 'Mild shoulder impingement',
          summarisedInjuries,
          confirmedAt: '2026-03-08T13:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const injuriesSummary = getProjection(storage.store, 'projections/injuries-summary')
        expect(injuriesSummary[ACCOUNT_ID]).toMatchObject({
          injuries: 'Mild shoulder impingement',
          summarisedInjuries,
          status: 'confirmed',
        })

        const onboardingStatus = getProjection(storage.store, 'projections/onboarding-status')
        expect(onboardingStatus[ACCOUNT_ID]).toMatchObject({ injuriesConfirmed: true })

        const coachingProfile = getProjection(storage.store, 'projections/athlete-coaching-profile')
        expect(coachingProfile[ACCOUNT_ID]).toMatchObject({ summarisedInjuries })
      })
    })
  })

  describe('Given an ExperienceLevelAdded event', () => {
    describe('When the projection updater runs', () => {
      it('Then OnboardingStatus and AthleteCoachingProfile are updated', async () => {
        const storage = mockStorage()
        const event = makeEvent('AthleteProfile', 'ExperienceLevelAdded', {
          accountId: ACCOUNT_ID,
          experienceLevel: 'intermediate',
          addedAt: '2026-03-08T12:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const onboardingStatus = getProjection(storage.store, 'projections/onboarding-status')
        expect(onboardingStatus[ACCOUNT_ID]).toMatchObject({ experienceLevelAdded: true })

        const coachingProfile = getProjection(storage.store, 'projections/athlete-coaching-profile')
        expect(coachingProfile[ACCOUNT_ID]).toMatchObject({ experienceLevel: 'intermediate' })
      })
    })
  })

  describe('Given an OnboardingCompleted event', () => {
    describe('When the projection updater runs', () => {
      it('Then OnboardingStatus and AthleteCoachingProfile are updated', async () => {
        const storage = mockStorage()
        const event = makeEvent('AthleteProfile', 'OnboardingCompleted', {
          accountId: ACCOUNT_ID,
          completedAt: '2026-03-08T14:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const onboardingStatus = getProjection(storage.store, 'projections/onboarding-status')
        expect(onboardingStatus[ACCOUNT_ID]).toMatchObject({ onboardingComplete: true })

        const coachingProfile = getProjection(storage.store, 'projections/athlete-coaching-profile')
        expect(coachingProfile[ACCOUNT_ID]).toMatchObject({ onboardingComplete: true })
      })
    })
  })

  describe('Given existing projection data for another account', () => {
    describe('When the projection updater runs for a different account', () => {
      it('Then the other account\'s entry is preserved', async () => {
        const storage = mockStorage()
        storage.store['projections/goals-summary'] = {
          [OTHER_ACCOUNT_ID]: { goals: 'Other athlete goals', status: 'confirmed' },
        }

        const event = makeEvent('AthleteProfile', 'GoalsSubmitted', {
          accountId: ACCOUNT_ID,
          goals: 'I want to build muscle',
          submittedAt: '2026-03-08T12:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)

        const goalsSummary = getProjection(storage.store, 'projections/goals-summary')
        expect(goalsSummary[OTHER_ACCOUNT_ID]).toMatchObject({ goals: 'Other athlete goals', status: 'confirmed' })
        expect(goalsSummary[ACCOUNT_ID]).toMatchObject({ status: 'pending' })
      })
    })
  })

  describe('Given an unknown event type', () => {
    describe('When the projection updater runs', () => {
      it('Then no projections are written', async () => {
        const storage = mockStorage()
        const event = makeEvent('AthleteProfile', 'SomeUnknownEvent', { accountId: ACCOUNT_ID })

        await updateProjectionsForEvent(event, storage)

        expect(Object.keys(storage.store)).toHaveLength(0)
      })
    })
  })

  describe('Given the same GoalsSubmitted event is processed twice', () => {
    describe('When the projection updater runs twice', () => {
      it('Then the GoalsSummary reflects the latest state without duplication', async () => {
        const storage = mockStorage()
        const event = makeEvent('AthleteProfile', 'GoalsSubmitted', {
          accountId: ACCOUNT_ID,
          goals: 'I want to build muscle',
          submittedAt: '2026-03-08T12:00:00.000Z',
        })

        await updateProjectionsForEvent(event, storage)
        await updateProjectionsForEvent(event, storage)

        const goalsSummary = getProjection(storage.store, 'projections/goals-summary')
        expect(goalsSummary[ACCOUNT_ID]).toMatchObject({ goals: 'I want to build muscle', status: 'pending' })
        expect(Object.keys(goalsSummary)).toHaveLength(1)
      })
    })
  })
})
