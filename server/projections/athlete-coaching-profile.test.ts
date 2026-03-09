import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import {
  applyAthleteRegisteredToCoachingProfile,
  applyExperienceLevelAddedToCoachingProfile,
  applyGoalsConfirmedToCoachingProfile,
  applyInjuriesConfirmedToCoachingProfile,
  applyOnboardingCompletedToCoachingProfile,
} from './athlete-coaching-profile'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const summarisedGoals = [
  { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 },
  { description: 'Improve cardiovascular fitness', targetAreas: ['full body'], priority: 3 },
]

const goalsSummary = 'Athlete wants to focus on hypertrophy across major muscle groups.'

const summarisedInjuries = {
  affectedAreas: ['left shoulder'],
  restrictions: ['overhead press', 'behind-the-neck movements'],
  severity: 'mild' as const,
  summary: 'Athlete has a mild left shoulder impingement.',
}

type CoachingProfileEntry = {
  firstName: string | undefined
  lastName: string | undefined
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  summarisedGoals?: typeof summarisedGoals
  summary?: string
  summarisedInjuries?: typeof summarisedInjuries
  onboardingComplete: boolean
}

type CoachingProfile = Record<string, CoachingProfileEntry>

function athleteRegisteredEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteAccount',
    aggregateId: ACCOUNT_ID,
    eventType: 'AthleteRegistered',
    payload: {
      accountId: ACCOUNT_ID,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      registeredAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 1,
  }
}

function experienceLevelAddedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'ExperienceLevelAdded',
    payload: {
      accountId: ACCOUNT_ID,
      experienceLevel: 'intermediate',
      addedAt: '2026-03-08T12:30:00.000Z',
    },
    occurredAt: '2026-03-08T12:30:00.000Z',
    version: 2,
  }
}

function goalsConfirmedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ3',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      goals: 'Build muscle',
      summarisedGoals,
      summary: goalsSummary,
      confirmedAt: '2026-03-08T13:00:00.000Z',
    },
    occurredAt: '2026-03-08T13:00:00.000Z',
    version: 3,
  }
}

function injuriesConfirmedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ4',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Shoulder pain',
      summarisedInjuries,
      confirmedAt: '2026-03-08T13:30:00.000Z',
    },
    occurredAt: '2026-03-08T13:30:00.000Z',
    version: 4,
  }
}

function onboardingCompletedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ5',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'OnboardingCompleted',
    payload: {
      accountId: ACCOUNT_ID,
      completedAt: '2026-03-08T14:00:00.000Z',
    },
    occurredAt: '2026-03-08T14:00:00.000Z',
    version: 5,
  }
}

// ─── AthleteCoachingProfile projection ───

describe('AthleteCoachingProfile projection', () => {
  describe('Given an empty projection', () => {
    describe('When AthleteRegistered is applied', () => {
      it('Then a profile entry is created with name and onboardingComplete false', () => {
        const projection: CoachingProfile = {}

        const updated = applyAthleteRegisteredToCoachingProfile(projection, athleteRegisteredEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          firstName: 'Ada',
          lastName: 'Lovelace',
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given a profile exists', () => {
    describe('When ExperienceLevelAdded is applied', () => {
      it('Then experienceLevel is added to the profile', () => {
        const projection: CoachingProfile = {
          [ACCOUNT_ID]: { firstName: 'Ada', lastName: 'Lovelace', onboardingComplete: false },
        }

        const updated = applyExperienceLevelAddedToCoachingProfile(projection, experienceLevelAddedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          firstName: 'Ada',
          lastName: 'Lovelace',
          experienceLevel: 'intermediate',
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given a profile exists', () => {
    describe('When GoalsConfirmed is applied', () => {
      it('Then summarisedGoals array and summary are added to the profile', () => {
        const projection: CoachingProfile = {
          [ACCOUNT_ID]: { firstName: 'Ada', lastName: 'Lovelace', onboardingComplete: false },
        }

        const updated = applyGoalsConfirmedToCoachingProfile(projection, goalsConfirmedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          firstName: 'Ada',
          lastName: 'Lovelace',
          summarisedGoals,
          summary: goalsSummary,
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given a profile exists', () => {
    describe('When InjuriesConfirmed is applied', () => {
      it('Then summarisedInjuries is added to the profile', () => {
        const projection: CoachingProfile = {
          [ACCOUNT_ID]: { firstName: 'Ada', lastName: 'Lovelace', onboardingComplete: false },
        }

        const updated = applyInjuriesConfirmedToCoachingProfile(projection, injuriesConfirmedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          firstName: 'Ada',
          lastName: 'Lovelace',
          summarisedInjuries,
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given a profile with all prerequisites filled', () => {
    describe('When OnboardingCompleted is applied', () => {
      it('Then onboardingComplete becomes true', () => {
        const projection: CoachingProfile = {
          [ACCOUNT_ID]: {
            firstName: 'Ada',
            lastName: 'Lovelace',
            experienceLevel: 'intermediate',
            summarisedGoals,
            summary: goalsSummary,
            summarisedInjuries,
            onboardingComplete: false,
          },
        }

        const updated = applyOnboardingCompletedToCoachingProfile(projection, onboardingCompletedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          firstName: 'Ada',
          lastName: 'Lovelace',
          experienceLevel: 'intermediate',
          summarisedGoals,
          summary: goalsSummary,
          summarisedInjuries,
          onboardingComplete: true,
        })
      })
    })
  })

  describe('Given a full onboarding sequence is replayed', () => {
    describe('When all events are applied in order', () => {
      it('Then the final profile has all fields populated', () => {
        let projection: CoachingProfile = {}

        projection = applyAthleteRegisteredToCoachingProfile(projection, athleteRegisteredEvent())
        projection = applyExperienceLevelAddedToCoachingProfile(projection, experienceLevelAddedEvent())
        projection = applyGoalsConfirmedToCoachingProfile(projection, goalsConfirmedEvent())
        projection = applyInjuriesConfirmedToCoachingProfile(projection, injuriesConfirmedEvent())
        projection = applyOnboardingCompletedToCoachingProfile(projection, onboardingCompletedEvent())

        expect(projection[ACCOUNT_ID]).toEqual({
          firstName: 'Ada',
          lastName: 'Lovelace',
          experienceLevel: 'intermediate',
          summarisedGoals,
          summary: goalsSummary,
          summarisedInjuries,
          onboardingComplete: true,
        })
      })
    })
  })

  describe('Given entries for other accounts exist', () => {
    describe('When events are applied for a new account', () => {
      it('Then existing entries are preserved', () => {
        const projection: CoachingProfile = {
          'other-account': { firstName: 'Other', lastName: 'Person', onboardingComplete: true },
        }

        const updated = applyAthleteRegisteredToCoachingProfile(projection, athleteRegisteredEvent())

        expect(updated['other-account'].onboardingComplete).toBe(true)
        expect(updated[ACCOUNT_ID].firstName).toBe('Ada')
      })
    })
  })

  describe('Given no AthleteRegistered has been applied yet', () => {
    describe('When ExperienceLevelAdded is applied for a new account', () => {
      it('Then a partial entry is created with experienceLevel and undefined name fields', () => {
        const projection: CoachingProfile = {}

        const updated = applyExperienceLevelAddedToCoachingProfile(projection, experienceLevelAddedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          firstName: undefined,
          lastName: undefined,
          experienceLevel: 'intermediate',
          onboardingComplete: false,
        })
      })
    })

    describe('When AthleteRegistered is applied afterwards', () => {
      it('Then the name fills in and experienceLevel is preserved', () => {
        let projection: CoachingProfile = {}

        projection = applyExperienceLevelAddedToCoachingProfile(projection, experienceLevelAddedEvent())
        projection = applyAthleteRegisteredToCoachingProfile(projection, athleteRegisteredEvent())

        expect(projection[ACCOUNT_ID]).toEqual({
          firstName: 'Ada',
          lastName: 'Lovelace',
          experienceLevel: 'intermediate',
          onboardingComplete: false,
        })
      })
    })
  })
})
