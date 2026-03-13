import { describe, it, expect, vi } from 'vitest'
import { handleLogout } from './logout.post'

// ─── Test helpers ───

function mockStubs() {
  return {
    clearSession: vi.fn(async (): Promise<void> => {}),
  }
}

// ─── POST /api/auth/logout ───

describe('POST /api/auth/logout', () => {
  describe('When logout is called', () => {
    it('Then returns 200 with success', async () => {
      // Given
      const deps = mockStubs()

      // When
      const result = await handleLogout(deps)

      // Then
      expect(result.status).toBe(200)
      expect(result.body).toEqual({ success: true })
    })

    it('Then clears the session', async () => {
      // Given
      const deps = mockStubs()

      // When
      await handleLogout(deps)

      // Then
      expect(deps.clearSession).toHaveBeenCalledOnce()
    })
  })

  describe('Given a dep throws an unexpected error', () => {
    describe('When logout is called', () => {
      it('Then the error propagates so the Nitro error handler returns 500', async () => {
        // Given
        const deps = mockStubs()
        deps.clearSession = vi.fn(async () => {
          throw new Error('Session store unavailable')
        })

        // When / Then
        await expect(handleLogout(deps)).rejects.toThrow('Session store unavailable')
      })
    })
  })
})
