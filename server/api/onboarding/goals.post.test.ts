import { describe, it, expect } from 'vitest'
import { handleSubmitGoals, type SubmitGoalsResult } from './goals.post'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    submitGoals: async (input: unknown): Promise<SubmitGoalsResult> =>
      ({ success: true }),
  }
}

function validBody() {
  return {
    goals: 'I want to build muscle and improve my posture',
    experienceLevel: 'intermediate',
  }
}

// ─── POST /api/onboarding/goals ───

describe('POST /api/onboarding/goals', () => {
  describe('Given an authenticated athlete with valid input', () => {
    describe('When submit goals is called', () => {
      it('Then returns 200 and calls the submitGoals command with the accountId', async () => {
        const deps = mockStubs()

        let commandInput: unknown
        deps.submitGoals = async (input: unknown) => {
          commandInput = input
          return { success: true }
        }

        const result = await handleSubmitGoals(validBody(), deps)

        expect(result.status).toBe(200)
        expect(commandInput).toMatchObject({
          accountId: ACCOUNT_ID,
          goals: 'I want to build muscle and improve my posture',
        })
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When submit goals is called', () => {
      it('Then returns 401 without calling the command', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let commandCalled = false
        deps.submitGoals = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleSubmitGoals(validBody(), deps)

        expect(result.status).toBe(401)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given goals have already been confirmed', () => {
    describe('When submit goals is called', () => {
      it('Then returns 409 with goals_already_confirmed', async () => {
        const deps = mockStubs()
        deps.submitGoals = async () =>
          ({ success: false, error: 'goals_already_confirmed' })

        const result = await handleSubmitGoals(validBody(), deps)

        expect(result.status).toBe(409)
        expect(result.body).toMatchObject({ error: 'goals_already_confirmed' })
      })
    })
  })

  describe('Given the request body is missing the goals field', () => {
    describe('When submit goals is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.submitGoals = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleSubmitGoals({ experienceLevel: 'beginner' }, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given the request body has an empty goals string', () => {
    describe('When submit goals is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.submitGoals = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleSubmitGoals({ goals: '', experienceLevel: 'beginner' }, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given the command reports invalid_experience_level', () => {
    describe('When submit goals is called', () => {
      it('Then returns 400', async () => {
        const deps = mockStubs()
        deps.submitGoals = async () =>
          ({ success: false, error: 'invalid_experience_level' })

        const result = await handleSubmitGoals(
          { goals: 'Build muscle', experienceLevel: 'expert' },
          deps,
        )

        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'invalid_experience_level' })
      })
    })
  })

  describe('Given a dep throws an unexpected error', () => {
    describe('When submit goals is called', () => {
      it('Then the error propagates so the Nitro error handler returns 500', async () => {
        const deps = mockStubs()
        deps.submitGoals = async () => {
          throw new Error('Unexpected storage failure')
        }

        await expect(handleSubmitGoals(validBody(), deps)).rejects.toThrow('Unexpected storage failure')
      })
    })
  })
})
