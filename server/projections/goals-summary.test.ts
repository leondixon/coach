import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import {
  applyGoalsSubmittedToGoalsSummary,
  applyGoalsConfirmedToGoalsSummary,
} from './goals-summary'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const summarisedGoals = [
  { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 },
  { description: 'Improve cardiovascular fitness', targetAreas: ['full body'], priority: 3 },
]

const goalsSummary = 'Athlete wants to focus on hypertrophy across major muscle groups.'

type GoalsSummaryEntry = {
  goals: string
  summarisedGoals?: typeof summarisedGoals
  summary?: string
  status: 'pending' | 'confirmed'
}

type GoalsSummaryProjection = Record<string, GoalsSummaryEntry>

function goalsSubmittedEvent(goals = 'I want to build muscle and get stronger'): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsSubmitted',
    payload: {
      accountId: ACCOUNT_ID,
      goals,
      submittedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 1,
  }
}

function goalsConfirmedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'GoalsConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      goals: 'I want to build muscle',
      summarisedGoals,
      summary: goalsSummary,
      confirmedAt: '2026-03-08T13:00:00.000Z',
    },
    occurredAt: '2026-03-08T13:00:00.000Z',
    version: 2,
  }
}

// ─── GoalsSummary projection ───

describe('GoalsSummary projection', () => {
  describe('Given an empty GoalsSummary', () => {
    describe('When GoalsSubmitted is applied', () => {
      it('Then a pending entry is created with the goals text', () => {
        const projection: GoalsSummaryProjection = {}

        const updated = applyGoalsSubmittedToGoalsSummary(projection, goalsSubmittedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          goals: 'I want to build muscle and get stronger',
          status: 'pending',
        })
      })
    })
  })

  describe('Given a pending GoalsSummary entry', () => {
    describe('When GoalsSubmitted is applied again (re-submission)', () => {
      it('Then the goals text is replaced and status stays pending', () => {
        const projection: GoalsSummaryProjection = {
          [ACCOUNT_ID]: { goals: 'Old goals text', status: 'pending' },
        }

        const updated = applyGoalsSubmittedToGoalsSummary(projection, goalsSubmittedEvent('Updated goals text'))

        expect(updated[ACCOUNT_ID]).toEqual({
          goals: 'Updated goals text',
          status: 'pending',
        })
      })
    })
  })

  describe('Given a pending GoalsSummary entry', () => {
    describe('When GoalsConfirmed is applied', () => {
      it('Then status changes to confirmed and summarisedGoals array plus summary are populated', () => {
        const projection: GoalsSummaryProjection = {
          [ACCOUNT_ID]: { goals: 'I want to build muscle', status: 'pending' },
        }

        const updated = applyGoalsConfirmedToGoalsSummary(projection, goalsConfirmedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          goals: 'I want to build muscle',
          summarisedGoals,
          summary: goalsSummary,
          status: 'confirmed',
        })
      })
    })
  })

  describe('Given entries for other accounts exist', () => {
    describe('When GoalsSubmitted is applied for a new account', () => {
      it('Then existing entries are not affected', () => {
        const projection: GoalsSummaryProjection = {
          'other-account': { goals: 'Other goals', summarisedGoals, summary: goalsSummary, status: 'confirmed' },
        }

        const updated = applyGoalsSubmittedToGoalsSummary(projection, goalsSubmittedEvent())

        expect(updated['other-account'].status).toBe('confirmed')
        expect(updated[ACCOUNT_ID].status).toBe('pending')
      })
    })
  })
})
