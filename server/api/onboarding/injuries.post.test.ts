import { describe, it, expect } from 'vitest'
import { handleSubmitInjuries, type SubmitInjuriesResult } from './injuries.post'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    submitInjuries: async (input: unknown): Promise<SubmitInjuriesResult> =>
      ({ success: true }),
  }
}

function validBody() {
  return { injuries: 'I have a mild shoulder impingement on the left side' }
}

// ─── POST /api/onboarding/injuries ───

describe('POST /api/onboarding/injuries', () => {
  describe('Given an authenticated athlete with valid input', () => {
    describe('When submit injuries is called', () => {
      it('Then returns 200 and calls the submitInjuries command with the accountId', async () => {
        const deps = mockStubs()

        let commandInput: unknown
        deps.submitInjuries = async (input: unknown) => {
          commandInput = input
          return { success: true }
        }

        const result = await handleSubmitInjuries(validBody(), deps)

        expect(result.status).toBe(200)
        expect(commandInput).toMatchObject({
          accountId: ACCOUNT_ID,
          injuries: 'I have a mild shoulder impingement on the left side',
        })
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When submit injuries is called', () => {
      it('Then returns 401 without calling the command', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let commandCalled = false
        deps.submitInjuries = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleSubmitInjuries(validBody(), deps)

        expect(result.status).toBe(401)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given injuries have already been confirmed', () => {
    describe('When submit injuries is called', () => {
      it('Then returns 409 with injuries_already_confirmed', async () => {
        const deps = mockStubs()
        deps.submitInjuries = async () =>
          ({ success: false, error: 'injuries_already_confirmed' })

        const result = await handleSubmitInjuries(validBody(), deps)

        expect(result.status).toBe(409)
        expect(result.body).toMatchObject({ error: 'injuries_already_confirmed' })
      })
    })
  })

  describe('Given the request body is missing the injuries field', () => {
    describe('When submit injuries is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.submitInjuries = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleSubmitInjuries({}, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given the request body has an empty injuries string', () => {
    describe('When submit injuries is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.submitInjuries = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleSubmitInjuries({ injuries: '' }, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })
})
