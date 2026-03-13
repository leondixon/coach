import { describe, it, expect, vi } from 'vitest'
import { handleLogin, type StoredCredential } from './login.post'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const storedCredential: StoredCredential = {
  accountId: ACCOUNT_ID,
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  passwordHash: 'hashed:SecurePass1!',
}

function mockStubs() {
  return {
    getCredentialByEmail: async (_email: string): Promise<StoredCredential | undefined> => storedCredential,
    verifyPassword: async (_hash: string, _password: string): Promise<boolean> => true,
    setSession: vi.fn(async (_user: { accountId: string, email: string, firstName: string, lastName: string }): Promise<void> => {}),
  }
}

function validBody() {
  return { email: 'ada@example.com', password: 'SecurePass1!' }
}

// ─── POST /api/auth/login ───

describe('POST /api/auth/login', () => {
  describe('Given valid credentials', () => {
    describe('When login is called', () => {
      it('Then returns 200 with the user account info', async () => {
        // Given
        const deps = mockStubs()

        // When
        const result = await handleLogin(validBody(), deps)

        // Then
        expect(result.status).toBe(200)
        expect(result.body).toEqual({
          accountId: ACCOUNT_ID,
          email: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
        })
      })

      it('Then sets the session with the user info', async () => {
        // Given
        const deps = mockStubs()

        // When
        await handleLogin(validBody(), deps)

        // Then
        expect(deps.setSession).toHaveBeenCalledWith({
          accountId: ACCOUNT_ID,
          email: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
        })
      })
    })
  })

  describe('Given no account exists for the provided email', () => {
    describe('When login is called', () => {
      it('Then returns 401 without calling setSession', async () => {
        // Given
        const deps = mockStubs()
        deps.getCredentialByEmail = async () => undefined

        // When
        const result = await handleLogin(validBody(), deps)

        // Then
        expect(result.status).toBe(401)
        expect(result.body).toMatchObject({ error: 'invalid_credentials' })
        expect(deps.setSession).not.toHaveBeenCalled()
      })
    })
  })

  describe('Given the password does not match', () => {
    describe('When login is called', () => {
      it('Then returns 401 without calling setSession', async () => {
        // Given
        const deps = mockStubs()
        deps.verifyPassword = async () => false

        // When
        const result = await handleLogin({ email: 'ada@example.com', password: 'wrongpassword' }, deps)

        // Then
        expect(result.status).toBe(401)
        expect(result.body).toMatchObject({ error: 'invalid_credentials' })
        expect(deps.setSession).not.toHaveBeenCalled()
      })
    })
  })

  describe('Given the request body is missing the email field', () => {
    describe('When login is called', () => {
      it('Then returns 400 with a validation error', async () => {
        // Given
        const deps = mockStubs()

        // When
        const result = await handleLogin({ password: 'SecurePass1!' }, deps)

        // Then
        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'validation_failed' })
      })
    })
  })

  describe('Given the request body is missing the password field', () => {
    describe('When login is called', () => {
      it('Then returns 400 with a validation error', async () => {
        // Given
        const deps = mockStubs()

        // When
        const result = await handleLogin({ email: 'ada@example.com' }, deps)

        // Then
        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'validation_failed' })
      })
    })
  })

  describe('Given the email field is not a valid email address', () => {
    describe('When login is called', () => {
      it('Then returns 400 with a validation error', async () => {
        // Given
        const deps = mockStubs()

        // When
        const result = await handleLogin({ email: 'not-an-email', password: 'SecurePass1!' }, deps)

        // Then
        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'validation_failed' })
      })
    })
  })

  describe('Given a dep throws an unexpected error', () => {
    describe('When login is called', () => {
      it('Then the error propagates so the Nitro error handler returns 500', async () => {
        // Given
        const deps = mockStubs()
        deps.getCredentialByEmail = async () => {
          throw new Error('Storage failure')
        }

        // When / Then
        await expect(handleLogin(validBody(), deps)).rejects.toThrow('Storage failure')
      })
    })
  })
})
