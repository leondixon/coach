import { describe, it, expect, vi } from 'vitest'
import { createAuth } from './useAuth'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function fetchError(statusCode: number, data?: Record<string, unknown>) {
  return { statusCode, data }
}

function makeFetchThatReturnsSession() {
  return vi.fn().mockResolvedValue({ accountId: ACCOUNT_ID, email: 'athlete@example.com' })
}

// ─── useAuth ───

describe('useAuth', () => {
  describe('Given no session exists', () => {
    describe('When the composable is created', () => {
      it('Then isAuthenticated is false and currentUser is undefined', () => {
        // Given / When
        const mockFetch = vi.fn()
        const { isAuthenticated, currentUser } = createAuth({ fetch: mockFetch })

        // Then
        expect(isAuthenticated.value).toBe(false)
        expect(currentUser.value).toBeUndefined()
      })
    })

    describe('When refresh is called and the server returns 401', () => {
      it('Then isAuthenticated remains false and currentUser remains undefined', async () => {
        // Given
        const mockFetch = vi.fn().mockRejectedValue(fetchError(401, { error: 'unauthenticated' }))
        const { isAuthenticated, currentUser, refresh } = createAuth({ fetch: mockFetch })

        // When
        await refresh()

        // Then
        expect(isAuthenticated.value).toBe(false)
        expect(currentUser.value).toBeUndefined()
      })
    })

    describe('When login is called with valid credentials', () => {
      it('Then calls POST /api/auth/login with the provided credentials', async () => {
        // Given
        const mockFetch = makeFetchThatReturnsSession()
        const { login } = createAuth({ fetch: mockFetch })

        // When
        await login('athlete@example.com', 'securepassword')

        // Then
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          body: { email: 'athlete@example.com', password: 'securepassword' },
        })
      })

      it('Then returns success and isAuthenticated becomes true', async () => {
        // Given
        const mockFetch = makeFetchThatReturnsSession()
        const { login, isAuthenticated } = createAuth({ fetch: mockFetch })

        // When
        const result = await login('athlete@example.com', 'securepassword')

        // Then
        expect(result.success).toBe(true)
        expect(isAuthenticated.value).toBe(true)
      })

      it('Then currentUser is set to the authenticated account details', async () => {
        // Given
        const mockFetch = makeFetchThatReturnsSession()
        const { login, currentUser } = createAuth({ fetch: mockFetch })

        // When
        await login('athlete@example.com', 'securepassword')

        // Then
        expect(currentUser.value).toEqual({ accountId: ACCOUNT_ID, email: 'athlete@example.com' })
      })
    })

    describe('When login is called with invalid credentials', () => {
      it('Then returns failure with an error code', async () => {
        // Given
        const mockFetch = vi.fn().mockRejectedValue(fetchError(401, { error: 'invalid_credentials' }))
        const { login } = createAuth({ fetch: mockFetch })

        // When
        const result = await login('athlete@example.com', 'wrongpassword')

        // Then
        expect(result.success).toBe(false)
        expect(result.error).toBe('invalid_credentials')
      })

      it('Then isAuthenticated remains false', async () => {
        // Given
        const mockFetch = vi.fn().mockRejectedValue(fetchError(401, { error: 'invalid_credentials' }))
        const { login, isAuthenticated } = createAuth({ fetch: mockFetch })

        // When
        await login('athlete@example.com', 'wrongpassword')

        // Then
        expect(isAuthenticated.value).toBe(false)
      })
    })
  })

  describe('Given a valid session exists', () => {
    describe('When refresh is called', () => {
      it('Then calls GET /api/auth/me', async () => {
        // Given
        const mockFetch = makeFetchThatReturnsSession()
        const { refresh } = createAuth({ fetch: mockFetch })

        // When
        await refresh()

        // Then
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me')
      })

      it('Then isAuthenticated is true and currentUser is populated', async () => {
        // Given
        const mockFetch = makeFetchThatReturnsSession()
        const { isAuthenticated, currentUser, refresh } = createAuth({ fetch: mockFetch })

        // When
        await refresh()

        // Then
        expect(isAuthenticated.value).toBe(true)
        expect(currentUser.value).toEqual({ accountId: ACCOUNT_ID, email: 'athlete@example.com' })
      })
    })

    describe('When logout is called', () => {
      it('Then calls POST /api/auth/logout', async () => {
        // Given
        const mockFetch = makeFetchThatReturnsSession()
        const { login, logout } = createAuth({ fetch: mockFetch })
        await login('athlete@example.com', 'securepassword')
        mockFetch.mockResolvedValue({})

        // When
        await logout()

        // Then
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
      })

      it('Then isAuthenticated becomes false and currentUser is cleared', async () => {
        // Given
        const mockFetch = makeFetchThatReturnsSession()
        const { login, logout, isAuthenticated, currentUser } = createAuth({ fetch: mockFetch })
        await login('athlete@example.com', 'securepassword')
        mockFetch.mockResolvedValue({})

        // When
        await logout()

        // Then
        expect(isAuthenticated.value).toBe(false)
        expect(currentUser.value).toBeUndefined()
      })
    })
  })
})
