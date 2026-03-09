import { describe, it, expect } from 'vitest'
import { handleConfirmGoals, type GoalsSummaryEntry, type SummarisedGoal, type ConfirmGoalsResult } from './confirm.post'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const summarisedGoals: SummarisedGoal[] = [
  { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 },
]
const goalsSummary = 'Athlete wants to focus on hypertrophy across major muscle groups.'

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    getGoalsSummary: async (accountId: string): Promise<GoalsSummaryEntry | undefined> => ({
      goals: 'I want to build muscle',
      summarisedGoals,
      summary: goalsSummary,
      status: 'pending',
    }),
    confirmGoals: async (input: unknown): Promise<ConfirmGoalsResult> =>
      ({ success: true }),
  }
}

// ─── POST /api/onboarding/goals/confirm ───

describe('POST /api/onboarding/goals/confirm', () => {
  describe('Given an authenticated athlete whose goals summary is ready to confirm', () => {
    describe('When confirm goals is called', () => {
      it('Then returns 200 and calls confirmGoals with summarised data from the projection', async () => {
        const deps = mockStubs()

        let commandInput: unknown
        deps.confirmGoals = async (input: unknown) => {
          commandInput = input
          return { success: true }
        }

        const result = await handleConfirmGoals(deps)

        expect(result.status).toBe(200)
        expect(commandInput).toMatchObject({
          accountId: ACCOUNT_ID,
          summarisedGoals,
          summary: goalsSummary,
        })
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When confirm goals is called', () => {
      it('Then returns 401 without calling the command', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let commandCalled = false
        deps.confirmGoals = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleConfirmGoals(deps)

        expect(result.status).toBe(401)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given no goals summary exists in the projection yet', () => {
    describe('When confirm goals is called', () => {
      it('Then returns 400 with goals_not_submitted', async () => {
        const deps = mockStubs()
        deps.getGoalsSummary = async () => undefined

        const result = await handleConfirmGoals(deps)

        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'goals_not_submitted' })
      })
    })
  })

  describe('Given goals were submitted but AI enrichment has not completed yet', () => {
    describe('When confirm goals is called', () => {
      it('Then returns 400 with goals_summary_not_ready', async () => {
        const deps = mockStubs()
        deps.getGoalsSummary = async () => ({
          goals: 'I want to build muscle',
          status: 'pending',
          // summarisedGoals and summary absent — AI has not run yet
        })

        const result = await handleConfirmGoals(deps)

        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'goals_summary_not_ready' })
      })
    })
  })

  describe('Given goals have already been confirmed', () => {
    describe('When confirm goals is called', () => {
      it('Then returns 409 with goals_already_confirmed', async () => {
        const deps = mockStubs()
        deps.confirmGoals = async () =>
          ({ success: false, error: 'goals_already_confirmed' })

        const result = await handleConfirmGoals(deps)

        expect(result.status).toBe(409)
        expect(result.body).toMatchObject({ error: 'goals_already_confirmed' })
      })
    })
  })

  describe('Given a dep throws an unexpected error', () => {
    describe('When confirm goals is called', () => {
      it('Then the error propagates so the Nitro error handler returns 500', async () => {
        const deps = mockStubs()
        deps.confirmGoals = async () => {
          throw new Error('Unexpected storage failure')
        }

        await expect(handleConfirmGoals(deps)).rejects.toThrow('Unexpected storage failure')
      })
    })
  })
})
