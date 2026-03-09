import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import {
  applyGoalsConfirmedToOnboardingStatus,
  applyInjuriesConfirmedToOnboardingStatus,
  applyExperienceLevelAddedToOnboardingStatus,
  applyOnboardingCompletedToOnboardingStatus,
} from './onboarding-status'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

type OnboardingStatusEntry = {
  goalsConfirmed: boolean
  injuriesConfirmed: boolean
  experienceLevelAdded: boolean
  onboardingComplete: boolean
}

type OnboardingStatus = Record<string, OnboardingStatusEntry>

function goalsConfirmedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      goals: 'Build muscle',
      summarisedGoals: [{ description: 'Build muscle', targetAreas: ['chest'], priority: 5 }],
      summary: 'Athlete wants to build muscle.',
      confirmedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 1,
  }
}

function injuriesConfirmedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Shoulder pain',
      summarisedInjuries: {
        affectedAreas: ['left shoulder'],
        restrictions: ['overhead press'],
        severity: 'mild',
        summary: 'Summary',
      },
      confirmedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 2,
  }
}

function experienceLevelAddedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ3',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'ExperienceLevelAdded',
    payload: {
      accountId: ACCOUNT_ID,
      experienceLevel: 'intermediate',
      addedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 3,
  }
}

function onboardingCompletedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ4',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'OnboardingCompleted',
    payload: {
      accountId: ACCOUNT_ID,
      completedAt: '2026-03-08T14:00:00.000Z',
    },
    occurredAt: '2026-03-08T14:00:00.000Z',
    version: 4,
  }
}

// ─── OnboardingStatus projection ───

describe('OnboardingStatus projection', () => {
  describe('Given an empty OnboardingStatus', () => {
    describe('When GoalsConfirmed is applied', () => {
      it('Then goalsConfirmed is true, others remain false', () => {
        const status: OnboardingStatus = {}

        const updated = applyGoalsConfirmedToOnboardingStatus(status, goalsConfirmedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          goalsConfirmed: true,
          injuriesConfirmed: false,
          experienceLevelAdded: false,
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given an empty OnboardingStatus', () => {
    describe('When InjuriesConfirmed is applied', () => {
      it('Then injuriesConfirmed is true, others remain false', () => {
        const status: OnboardingStatus = {}

        const updated = applyInjuriesConfirmedToOnboardingStatus(status, injuriesConfirmedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          goalsConfirmed: false,
          injuriesConfirmed: true,
          experienceLevelAdded: false,
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given an empty OnboardingStatus', () => {
    describe('When ExperienceLevelAdded is applied', () => {
      it('Then experienceLevelAdded is true, others remain false', () => {
        const status: OnboardingStatus = {}

        const updated = applyExperienceLevelAddedToOnboardingStatus(status, experienceLevelAddedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          goalsConfirmed: false,
          injuriesConfirmed: false,
          experienceLevelAdded: true,
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given all three prerequisites are confirmed', () => {
    describe('When OnboardingCompleted is applied', () => {
      it('Then onboardingComplete becomes true', () => {
        const status: OnboardingStatus = {
          [ACCOUNT_ID]: {
            goalsConfirmed: true,
            injuriesConfirmed: true,
            experienceLevelAdded: true,
            onboardingComplete: false,
          },
        }

        const updated = applyOnboardingCompletedToOnboardingStatus(status, onboardingCompletedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          goalsConfirmed: true,
          injuriesConfirmed: true,
          experienceLevelAdded: true,
          onboardingComplete: true,
        })
      })
    })
  })

  describe('Given entries for other accounts exist', () => {
    describe('When GoalsConfirmed is applied for a new account', () => {
      it('Then existing entries are preserved', () => {
        const status: OnboardingStatus = {
          'other-account': {
            goalsConfirmed: true,
            injuriesConfirmed: true,
            experienceLevelAdded: true,
            onboardingComplete: true,
          },
        }

        const updated = applyGoalsConfirmedToOnboardingStatus(status, goalsConfirmedEvent())

        expect(updated['other-account']).toEqual({
          goalsConfirmed: true,
          injuriesConfirmed: true,
          experienceLevelAdded: true,
          onboardingComplete: true,
        })
        expect(updated[ACCOUNT_ID].goalsConfirmed).toBe(true)
        expect(updated[ACCOUNT_ID].onboardingComplete).toBe(false)
      })
    })
  })

  describe('Given a full onboarding sequence is replayed', () => {
    describe('When all four events are applied in order', () => {
      it('Then the final status has all flags true', () => {
        let status: OnboardingStatus = {}

        status = applyGoalsConfirmedToOnboardingStatus(status, goalsConfirmedEvent())
        status = applyInjuriesConfirmedToOnboardingStatus(status, injuriesConfirmedEvent())
        status = applyExperienceLevelAddedToOnboardingStatus(status, experienceLevelAddedEvent())
        status = applyOnboardingCompletedToOnboardingStatus(status, onboardingCompletedEvent())

        expect(status[ACCOUNT_ID]).toEqual({
          goalsConfirmed: true,
          injuriesConfirmed: true,
          experienceLevelAdded: true,
          onboardingComplete: true,
        })
      })
    })
  })

  describe('Given GoalsConfirmed has already been applied', () => {
    describe('When GoalsConfirmed is applied again (idempotency)', () => {
      it('Then the status remains unchanged', () => {
        const status: OnboardingStatus = {
          [ACCOUNT_ID]: {
            goalsConfirmed: true,
            injuriesConfirmed: false,
            experienceLevelAdded: false,
            onboardingComplete: false,
          },
        }

        const updated = applyGoalsConfirmedToOnboardingStatus(status, goalsConfirmedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          goalsConfirmed: true,
          injuriesConfirmed: false,
          experienceLevelAdded: false,
          onboardingComplete: false,
        })
      })
    })
  })
})
