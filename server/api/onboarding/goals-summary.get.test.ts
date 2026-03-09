import { describe, it, expect } from 'vitest'
import { handleGoalsSummary, type GoalsSummaryEntry } from './goals-summary.get'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const confirmedEntry: GoalsSummaryEntry = {
  goals: 'I want to build muscle',
  summarisedGoals: [{ description: 'Build muscle mass', targetAreas: ['chest', 'back'], priority: 5 }],
  summary: 'Athlete wants to focus on hypertrophy.',
  status: 'confirmed',
}

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    getGoalsSummary: async (_accountId: string): Promise<GoalsSummaryEntry | undefined> => confirmedEntry,
  }
}

// ─── GET /api/onboarding/goals-summary ───

describe('GET /api/onboarding/goals-summary', () => {
  describe('Given an authenticated athlete with confirmed goals', () => {
    describe('When goals summary is requested', () => {
      it('Then returns 200 with the goals summary entry', async () => {
        const result = await handleGoalsSummary(mockStubs())

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({
          goals: 'I want to build muscle',
          status: 'confirmed',
          summarisedGoals: [{ description: 'Build muscle mass', targetAreas: ['chest', 'back'], priority: 5 }],
          summary: 'Athlete wants to focus on hypertrophy.',
        })
      })
    })
  })

  describe('Given an authenticated athlete with pending goals', () => {
    describe('When goals summary is requested', () => {
      it('Then returns 200 with status pending and no summarisedGoals', async () => {
        const deps = mockStubs()
        deps.getGoalsSummary = async () => ({
          goals: 'I want to improve my endurance',
          status: 'pending',
        })

        const result = await handleGoalsSummary(deps)

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({
          goals: 'I want to improve my endurance',
          status: 'pending',
        })
        expect(result.body).not.toHaveProperty('summarisedGoals')
        expect(result.body).not.toHaveProperty('summary')
      })
    })
  })

  describe('Given an authenticated athlete who has not submitted goals', () => {
    describe('When goals summary is requested', () => {
      it('Then returns 404', async () => {
        const deps = mockStubs()
        deps.getGoalsSummary = async () => undefined

        const result = await handleGoalsSummary(deps)

        expect(result.status).toBe(404)
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When goals summary is requested', () => {
      it('Then returns 401 without reading the projection', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let projectionRead = false
        deps.getGoalsSummary = async () => {
          projectionRead = true
          return undefined
        }

        const result = await handleGoalsSummary(deps)

        expect(result.status).toBe(401)
        expect(projectionRead).toBe(false)
      })
    })
  })
})
