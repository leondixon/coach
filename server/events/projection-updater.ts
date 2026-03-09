import type { Event } from './types'
import { applyAthleteRegisteredToAccountRegistry } from '../projections/account-registry'
import {
  applyGoalsSubmittedToGoalsSummary,
  applyGoalsConfirmedToGoalsSummary,
} from '../projections/goals-summary'
import {
  applyInjuriesSubmittedToInjuriesSummary,
  applyInjuriesConfirmedToInjuriesSummary,
} from '../projections/injuries-summary'
import {
  applyGoalsConfirmedToOnboardingStatus,
  applyInjuriesConfirmedToOnboardingStatus,
  applyExperienceLevelAddedToOnboardingStatus,
  applyOnboardingCompletedToOnboardingStatus,
} from '../projections/onboarding-status'
import {
  applyAthleteRegisteredToCoachingProfile,
  applyExperienceLevelAddedToCoachingProfile,
  applyGoalsConfirmedToCoachingProfile,
  applyInjuriesConfirmedToCoachingProfile,
  applyOnboardingCompletedToCoachingProfile,
} from '../projections/athlete-coaching-profile'

interface Storage {
  getItem: (key: string) => Promise<unknown>
  setItem: (key: string, value: unknown) => Promise<void>
}

type Projection = Record<string, unknown>

async function readProjection(storage: Storage, key: string): Promise<Projection> {
  const value = await storage.getItem(key)
  if (typeof value !== 'object' || value === null) return {}
  return value as Projection
}

export async function updateProjectionsForEvent(event: Event, storage: Storage): Promise<void> {
  switch (event.eventType) {
    case 'AthleteRegistered': {
      const registry = await readProjection(storage, 'projections/account-registry')
      await storage.setItem('projections/account-registry', applyAthleteRegisteredToAccountRegistry(registry, event))

      const coachingProfile = await readProjection(storage, 'projections/athlete-coaching-profile')
      await storage.setItem('projections/athlete-coaching-profile', applyAthleteRegisteredToCoachingProfile(coachingProfile, event))
      break
    }

    case 'GoalsSubmitted': {
      const goalsSummary = await readProjection(storage, 'projections/goals-summary')
      await storage.setItem('projections/goals-summary', applyGoalsSubmittedToGoalsSummary(goalsSummary, event))
      break
    }

    case 'GoalsConfirmed': {
      const goalsSummary = await readProjection(storage, 'projections/goals-summary')
      await storage.setItem('projections/goals-summary', applyGoalsConfirmedToGoalsSummary(goalsSummary, event))

      const onboardingStatus = await readProjection(storage, 'projections/onboarding-status')
      await storage.setItem('projections/onboarding-status', applyGoalsConfirmedToOnboardingStatus(onboardingStatus, event))

      const coachingProfile = await readProjection(storage, 'projections/athlete-coaching-profile')
      await storage.setItem('projections/athlete-coaching-profile', applyGoalsConfirmedToCoachingProfile(coachingProfile, event))
      break
    }

    case 'InjuriesSubmitted': {
      const injuriesSummary = await readProjection(storage, 'projections/injuries-summary')
      await storage.setItem('projections/injuries-summary', applyInjuriesSubmittedToInjuriesSummary(injuriesSummary, event))
      break
    }

    case 'InjuriesConfirmed': {
      const injuriesSummary = await readProjection(storage, 'projections/injuries-summary')
      await storage.setItem('projections/injuries-summary', applyInjuriesConfirmedToInjuriesSummary(injuriesSummary, event))

      const onboardingStatus = await readProjection(storage, 'projections/onboarding-status')
      await storage.setItem('projections/onboarding-status', applyInjuriesConfirmedToOnboardingStatus(onboardingStatus, event))

      const coachingProfile = await readProjection(storage, 'projections/athlete-coaching-profile')
      await storage.setItem('projections/athlete-coaching-profile', applyInjuriesConfirmedToCoachingProfile(coachingProfile, event))
      break
    }

    case 'ExperienceLevelAdded': {
      const onboardingStatus = await readProjection(storage, 'projections/onboarding-status')
      await storage.setItem('projections/onboarding-status', applyExperienceLevelAddedToOnboardingStatus(onboardingStatus, event))

      const coachingProfile = await readProjection(storage, 'projections/athlete-coaching-profile')
      await storage.setItem('projections/athlete-coaching-profile', applyExperienceLevelAddedToCoachingProfile(coachingProfile, event))
      break
    }

    case 'OnboardingCompleted': {
      const onboardingStatus = await readProjection(storage, 'projections/onboarding-status')
      await storage.setItem('projections/onboarding-status', applyOnboardingCompletedToOnboardingStatus(onboardingStatus, event))

      const coachingProfile = await readProjection(storage, 'projections/athlete-coaching-profile')
      await storage.setItem('projections/athlete-coaching-profile', applyOnboardingCompletedToCoachingProfile(coachingProfile, event))
      break
    }
  }
}
