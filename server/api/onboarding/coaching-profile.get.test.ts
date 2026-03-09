import { describe, it, expect } from 'vitest'
import { handleCoachingProfile, type AthleteCoachingProfileEntry } from './coaching-profile.get'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const completedEntry: AthleteCoachingProfileEntry = {
  firstName: 'Leon',
  lastName: 'Test',
  experienceLevel: 'intermediate',
  summarisedGoals: [{ description: 'Build muscle mass', targetAreas: ['chest', 'back'], priority: 5 }],
  summary: 'Athlete wants to focus on hypertrophy.',
  summarisedInjuries: {
    affectedAreas: ['left shoulder'],
    restrictions: ['overhead press'],
    severity: 'mild',
    summary: 'Mild left shoulder impingement.',
  },
  onboardingComplete: true,
}

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    getCoachingProfile: async (_accountId: string): Promise<AthleteCoachingProfileEntry | undefined> => completedEntry,
  }
}

// ─── GET /api/onboarding/coaching-profile ───

describe('GET /api/onboarding/coaching-profile', () => {
  describe('Given an authenticated athlete who has completed onboarding', () => {
    describe('When the coaching profile is requested', () => {
      it('Then returns 200 with the full coaching profile entry', async () => {
        const result = await handleCoachingProfile(mockStubs())

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({
          firstName: 'Leon',
          lastName: 'Test',
          experienceLevel: 'intermediate',
          summarisedGoals: [{ description: 'Build muscle mass', targetAreas: ['chest', 'back'], priority: 5 }],
          summary: 'Athlete wants to focus on hypertrophy.',
          summarisedInjuries: {
            affectedAreas: ['left shoulder'],
            restrictions: ['overhead press'],
            severity: 'mild',
            summary: 'Mild left shoulder impingement.',
          },
          onboardingComplete: true,
        })
      })
    })
  })

  describe('Given an authenticated athlete who has just registered', () => {
    describe('When the coaching profile is requested', () => {
      it('Then returns 200 with only name fields populated', async () => {
        const deps = mockStubs()
        deps.getCoachingProfile = async () => ({
          firstName: 'Leon',
          lastName: 'Test',
          experienceLevel: undefined,
          summarisedGoals: undefined,
          summary: undefined,
          summarisedInjuries: undefined,
          onboardingComplete: false,
        })

        const result = await handleCoachingProfile(deps)

        expect(result.status).toBe(200)
        expect(result.body).toMatchObject({
          firstName: 'Leon',
          lastName: 'Test',
          onboardingComplete: false,
          experienceLevel: undefined,
          summarisedGoals: undefined,
          summary: undefined,
          summarisedInjuries: undefined,
        })
      })
    })
  })

  describe('Given an authenticated athlete with no profile entry', () => {
    describe('When the coaching profile is requested', () => {
      it('Then returns 404', async () => {
        const deps = mockStubs()
        deps.getCoachingProfile = async () => undefined

        const result = await handleCoachingProfile(deps)

        expect(result.status).toBe(404)
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When the coaching profile is requested', () => {
      it('Then returns 401 without reading the projection', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let projectionRead = false
        deps.getCoachingProfile = async () => {
          projectionRead = true
          return undefined
        }

        const result = await handleCoachingProfile(deps)

        expect(result.status).toBe(401)
        expect(projectionRead).toBe(false)
      })
    })
  })
})
