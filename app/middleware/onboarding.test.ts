import { describe, it, expect } from 'vitest'
import { resolveOnboardingRedirect, type OnboardingStatus } from './onboarding'

// ─── Test helpers ───

function noProgress(): OnboardingStatus {
  return {
    goalsConfirmed: false,
    injuriesConfirmed: false,
    experienceLevelAdded: false,
    onboardingComplete: false,
  }
}

function goalsConfirmed(): OnboardingStatus {
  return {
    goalsConfirmed: true,
    injuriesConfirmed: false,
    experienceLevelAdded: true,
    onboardingComplete: false,
  }
}

function fullyComplete(): OnboardingStatus {
  return {
    goalsConfirmed: true,
    injuriesConfirmed: true,
    experienceLevelAdded: true,
    onboardingComplete: true,
  }
}

// ─── resolveOnboardingRedirect ───

describe('resolveOnboardingRedirect', () => {
  describe('Given an unauthenticated visitor', () => {
    describe('When visiting a protected onboarding page', () => {
      it('Then redirects to /register', () => {
        expect(resolveOnboardingRedirect('/onboarding/goals', undefined, false)).toBe('/register')
        expect(resolveOnboardingRedirect('/onboarding/goals-review', undefined, false)).toBe('/register')
        expect(resolveOnboardingRedirect('/onboarding/injuries', undefined, false)).toBe('/register')
        expect(resolveOnboardingRedirect('/onboarding/injuries-review', undefined, false)).toBe('/register')
      })
    })

    describe('When already on /register', () => {
      it('Then no redirect is returned', () => {
        expect(resolveOnboardingRedirect('/register', undefined, false)).toBeUndefined()
      })
    })

    describe('When on the home page', () => {
      it('Then redirects to /register', () => {
        expect(resolveOnboardingRedirect('/', undefined, false)).toBe('/register')
      })
    })
  })

  describe('Given an authenticated athlete who has not started onboarding', () => {
    describe('When visiting /register', () => {
      it('Then redirects to /onboarding/goals (already authenticated)', () => {
        expect(resolveOnboardingRedirect('/register', noProgress(), true)).toBe('/onboarding/goals')
      })
    })

    describe('When visiting /onboarding/goals', () => {
      it('Then no redirect is returned (correct step)', () => {
        expect(resolveOnboardingRedirect('/onboarding/goals', noProgress(), true)).toBeUndefined()
      })
    })

    describe('When visiting /onboarding/goals-review', () => {
      it('Then no redirect is returned (page handles its own loading and polling state)', () => {
        // goals-review is intentionally not redirected back to /onboarding/goals even when goals
        // haven't been confirmed yet — the page itself is responsible for fetching the summary
        // and showing a pending/loading state while the AI processes the submission.
        expect(resolveOnboardingRedirect('/onboarding/goals-review', noProgress(), true)).toBeUndefined()
      })
    })

    describe('When visiting / (dashboard) with incomplete onboarding', () => {
      it('Then redirects to /onboarding/goals (must complete onboarding before accessing the app)', () => {
        expect(resolveOnboardingRedirect('/', noProgress(), true)).toBe('/onboarding/goals')
      })
    })

    describe('When trying to access /onboarding/injuries before goals are confirmed', () => {
      it('Then redirects to /onboarding/goals', () => {
        expect(resolveOnboardingRedirect('/onboarding/injuries', noProgress(), true)).toBe('/onboarding/goals')
      })
    })

    describe('When trying to access /onboarding/injuries-review before goals are confirmed', () => {
      it('Then redirects to /onboarding/goals', () => {
        expect(resolveOnboardingRedirect('/onboarding/injuries-review', noProgress(), true)).toBe('/onboarding/goals')
      })
    })
  })

  describe('Given an authenticated athlete who has confirmed goals', () => {
    describe('When visiting /onboarding/goals', () => {
      it('Then redirects to /onboarding/injuries (goals step is complete)', () => {
        expect(resolveOnboardingRedirect('/onboarding/goals', goalsConfirmed(), true)).toBe('/onboarding/injuries')
      })
    })

    describe('When visiting /onboarding/goals-review', () => {
      it('Then redirects to /onboarding/injuries (goals already confirmed)', () => {
        expect(resolveOnboardingRedirect('/onboarding/goals-review', goalsConfirmed(), true)).toBe('/onboarding/injuries')
      })
    })

    describe('When visiting /onboarding/injuries', () => {
      it('Then no redirect is returned (correct step)', () => {
        expect(resolveOnboardingRedirect('/onboarding/injuries', goalsConfirmed(), true)).toBeUndefined()
      })
    })

    describe('When visiting /onboarding/injuries-review', () => {
      it('Then no redirect is returned (page handles its own loading state)', () => {
        expect(resolveOnboardingRedirect('/onboarding/injuries-review', goalsConfirmed(), true)).toBeUndefined()
      })
    })

    describe('When visiting / (dashboard) with injuries step still pending', () => {
      it('Then redirects to /onboarding/injuries (must complete onboarding before accessing the app)', () => {
        expect(resolveOnboardingRedirect('/', goalsConfirmed(), true)).toBe('/onboarding/injuries')
      })
    })
  })

  describe('Given an authenticated athlete who has completed onboarding', () => {
    describe('When visiting any onboarding page', () => {
      it('Then redirects to / (dashboard)', () => {
        expect(resolveOnboardingRedirect('/onboarding/goals', fullyComplete(), true)).toBe('/')
        expect(resolveOnboardingRedirect('/onboarding/goals-review', fullyComplete(), true)).toBe('/')
        expect(resolveOnboardingRedirect('/onboarding/injuries', fullyComplete(), true)).toBe('/')
        expect(resolveOnboardingRedirect('/onboarding/injuries-review', fullyComplete(), true)).toBe('/')
      })
    })

    describe('When visiting /register', () => {
      it('Then redirects to / (onboarding is complete)', () => {
        expect(resolveOnboardingRedirect('/register', fullyComplete(), true)).toBe('/')
      })
    })

    describe('When visiting / (dashboard)', () => {
      it('Then no redirect is returned', () => {
        expect(resolveOnboardingRedirect('/', fullyComplete(), true)).toBeUndefined()
      })
    })
  })
})
