import { describe, it, expect } from 'vitest'
import { handleOnboardingStatus, type OnboardingStatusEntry } from './status.get'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    getOnboardingStatus: async (accountId: string): Promise<OnboardingStatusEntry | undefined> => ({
      goalsConfirmed: false,
      injuriesConfirmed: false,
      experienceLevelAdded: false,
      onboardingComplete: false,
    }),
  }
}

// ─── GET /api/onboarding/status ───

describe('GET /api/onboarding/status', () => {
  describe('Given an authenticated athlete who has not started onboarding', () => {
    describe('When status is requested', () => {
      it('Then returns 200 with all flags false', async () => {
        const result = await handleOnboardingStatus(mockStubs())

        expect(result.status).toBe(200)
        expect(result.body).toEqual({
          goalsConfirmed: false,
          injuriesConfirmed: false,
          experienceLevelAdded: false,
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given an authenticated athlete who has confirmed goals and injuries', () => {
    describe('When status is requested', () => {
      it('Then returns 200 with goalsConfirmed and injuriesConfirmed true', async () => {
        const deps = mockStubs()
        deps.getOnboardingStatus = async () => ({
          goalsConfirmed: true,
          injuriesConfirmed: true,
          experienceLevelAdded: false,
          onboardingComplete: false,
        })

        const result = await handleOnboardingStatus(deps)

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({
          goalsConfirmed: true,
          injuriesConfirmed: true,
          onboardingComplete: false,
        })
      })
    })
  })

  describe('Given an authenticated athlete who has completed onboarding', () => {
    describe('When status is requested', () => {
      it('Then returns 200 with onboardingComplete true', async () => {
        const deps = mockStubs()
        deps.getOnboardingStatus = async () => ({
          goalsConfirmed: true,
          injuriesConfirmed: true,
          experienceLevelAdded: true,
          onboardingComplete: true,
        })

        const result = await handleOnboardingStatus(deps)

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({ onboardingComplete: true })
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When status is requested', () => {
      it('Then returns 401 without reading the projection', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let projectionRead = false
        deps.getOnboardingStatus = async () => {
          projectionRead = true
          return undefined
        }

        const result = await handleOnboardingStatus(deps)

        expect(result.status).toBe(401)
        expect(projectionRead).toBe(false)
      })
    })
  })

  describe('Given an authenticated athlete with no entry in the projection', () => {
    describe('When status is requested', () => {
      it('Then returns 200 with all flags false as the default status', async () => {
        const deps = mockStubs()
        deps.getOnboardingStatus = async () => undefined

        const result = await handleOnboardingStatus(deps)

        expect(result.status).toBe(200)
        expect(result.body).toEqual({
          goalsConfirmed: false,
          injuriesConfirmed: false,
          experienceLevelAdded: false,
          onboardingComplete: false,
        })
      })
    })
  })
})
