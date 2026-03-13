import { describe, it, expect } from 'vitest'
import { handleRegister, type RegisterResult } from './register.post'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    registerAthlete: async (input: unknown): Promise<RegisterResult> =>
      ({ success: true, accountId: ACCOUNT_ID }),
  }
}

function validBody() {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'SecurePass1!',
  }
}

// ─── POST /api/auth/register ───

describe('POST /api/auth/register', () => {
  describe('Given valid registration input', () => {
    describe('When register is called', () => {
      it('Then returns 200 with the new accountId', async () => {
        const result = await handleRegister(validBody(), mockStubs())

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ accountId: ACCOUNT_ID })
      })
    })
  })

  describe('Given credential creation fails (email already in use)', () => {
    describe('When register is called', () => {
      it('Then returns 409 with error', async () => {
        const deps = mockStubs()
        deps.registerAthlete = async () =>
          ({ success: false, error: 'email_already_exists' })

        const result = await handleRegister(validBody(), deps)

        expect(result.status).toBe(409)
        expect(result.body).toMatchObject({ error: 'email_already_exists' })
      })
    })
  })

  describe('Given the request body is missing firstName', () => {
    describe('When register is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.registerAthlete = async () => {
          commandCalled = true
          return { success: true, accountId: ACCOUNT_ID }
        }

        const result = await handleRegister({ lastName: 'Lovelace', email: 'ada@example.com', password: 'SecurePass1!' }, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given the request body is missing lastName', () => {
    describe('When register is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.registerAthlete = async () => {
          commandCalled = true
          return { success: true, accountId: ACCOUNT_ID }
        }

        const result = await handleRegister({ firstName: 'Ada', email: 'ada@example.com', password: 'SecurePass1!' }, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given the request body has an invalid email', () => {
    describe('When register is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.registerAthlete = async () => {
          commandCalled = true
          return { success: true, accountId: ACCOUNT_ID }
        }

        const result = await handleRegister({ firstName: 'Ada', lastName: 'Lovelace', email: 'not-an-email', password: 'SecurePass1!' }, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given the request body is missing password', () => {
    describe('When register is called', () => {
      it('Then returns 422 without calling the command', async () => {
        const deps = mockStubs()

        let commandCalled = false
        deps.registerAthlete = async () => {
          commandCalled = true
          return { success: true, accountId: ACCOUNT_ID }
        }

        const result = await handleRegister({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }, deps)

        expect(result.status).toBe(422)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given a dep throws an unexpected error', () => {
    describe('When register is called', () => {
      it('Then the error propagates so the Nitro error handler returns 500', async () => {
        const deps = mockStubs()
        deps.registerAthlete = async () => {
          throw new Error('Unexpected storage failure')
        }

        await expect(handleRegister(validBody(), deps)).rejects.toThrow('Unexpected storage failure')
      })
    })
  })
})
