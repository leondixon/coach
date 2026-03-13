import { describe, it, expect } from 'vitest'
import { handleMe, type SessionUser } from './me.get'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const authenticatedUser: SessionUser = {
  accountId: ACCOUNT_ID,
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
}

function mockStubs() {
  return {
    getSessionUser: async (): Promise<SessionUser | undefined> => authenticatedUser,
  }
}

// ─── GET /api/auth/me ───

describe('GET /api/auth/me', () => {
  describe('Given an authenticated user', () => {
    describe('When the endpoint is called', () => {
      it('Then returns 200 with the user session info', async () => {
        // Given
        const deps = mockStubs()

        // When
        const result = await handleMe(deps)

        // Then
        expect(result.status).toBe(200)
        expect(result.body).toEqual({
          accountId: ACCOUNT_ID,
          email: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
        })
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When the endpoint is called', () => {
      it('Then returns 401 without accessing any user data', async () => {
        // Given
        const deps = mockStubs()
        deps.getSessionUser = async () => undefined

        // When
        const result = await handleMe(deps)

        // Then
        expect(result.status).toBe(401)
        expect(result.body).toMatchObject({ error: 'unauthenticated' })
      })
    })
  })
})
