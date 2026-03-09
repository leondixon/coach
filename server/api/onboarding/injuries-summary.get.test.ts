import { describe, it, expect } from 'vitest'
import { handleInjuriesSummary, type InjuriesSummaryEntry } from './injuries-summary.get'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const confirmedEntry: InjuriesSummaryEntry = {
  injuries: 'Mild shoulder impingement on the left side',
  summarisedInjuries: {
    affectedAreas: ['left shoulder'],
    restrictions: ['overhead press'],
    severity: 'mild',
    summary: 'Mild left shoulder impingement. Avoid overhead pressing.',
  },
  status: 'confirmed',
}

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    getInjuriesSummary: async (_accountId: string): Promise<InjuriesSummaryEntry | undefined> => confirmedEntry,
  }
}

// ─── GET /api/onboarding/injuries-summary ───

describe('GET /api/onboarding/injuries-summary', () => {
  describe('Given an authenticated athlete with confirmed injuries', () => {
    describe('When injuries summary is requested', () => {
      it('Then returns 200 with the injuries summary entry', async () => {
        const result = await handleInjuriesSummary(mockStubs())

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({
          injuries: 'Mild shoulder impingement on the left side',
          status: 'confirmed',
          summarisedInjuries: {
            affectedAreas: ['left shoulder'],
            restrictions: ['overhead press'],
            severity: 'mild',
            summary: 'Mild left shoulder impingement. Avoid overhead pressing.',
          },
        })
      })
    })
  })

  describe('Given an authenticated athlete with pending injuries', () => {
    describe('When injuries summary is requested', () => {
      it('Then returns 200 with status pending and no summarisedInjuries', async () => {
        const deps = mockStubs()
        deps.getInjuriesSummary = async () => ({
          injuries: 'Lower back pain',
          status: 'pending',
        })

        const result = await handleInjuriesSummary(deps)

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({
          injuries: 'Lower back pain',
          status: 'pending',
        })
        expect(result.body).not.toHaveProperty('summarisedInjuries')
      })
    })
  })

  describe('Given an authenticated athlete who has not submitted injuries', () => {
    describe('When injuries summary is requested', () => {
      it('Then returns 404', async () => {
        const deps = mockStubs()
        deps.getInjuriesSummary = async () => undefined

        const result = await handleInjuriesSummary(deps)

        expect(result.status).toBe(404)
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When injuries summary is requested', () => {
      it('Then returns 401 without reading the projection', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let projectionRead = false
        deps.getInjuriesSummary = async () => {
          projectionRead = true
          return undefined
        }

        const result = await handleInjuriesSummary(deps)

        expect(result.status).toBe(401)
        expect(projectionRead).toBe(false)
      })
    })
  })
})
