import type { Event } from '../events/types'
import {
  AthleteRegisteredSchema,
} from '../events/athlete-account'
import {
  ExperienceLevelAddedSchema,
  GoalsConfirmedSchema,
  InjuriesConfirmedSchema,
} from '../events/athlete-profile'

interface SummarisedGoal {
  description: string
  targetAreas: string[]
  priority: number
}

interface SummarisedInjuries {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

interface AthleteCoachingProfileEntry {
  firstName: string | undefined
  lastName: string | undefined
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | undefined
  summarisedGoals: SummarisedGoal[] | undefined
  summary: string | undefined
  summarisedInjuries: SummarisedInjuries | undefined
  onboardingComplete: boolean
}

type AthleteCoachingProfile = Record<string, AthleteCoachingProfileEntry>

function getOrCreateEntry(
  profiles: AthleteCoachingProfile,
  accountId: string,
): AthleteCoachingProfileEntry {
  return profiles[accountId] ?? {
    firstName: undefined,
    lastName: undefined,
    experienceLevel: undefined,
    summarisedGoals: undefined,
    summary: undefined,
    summarisedInjuries: undefined,
    onboardingComplete: false,
  }
}

export function applyAthleteRegisteredToCoachingProfile(
  profiles: AthleteCoachingProfile,
  event: Event,
): AthleteCoachingProfile {
  const payload = AthleteRegisteredSchema.parse(event.payload)
  const existing = getOrCreateEntry(profiles, payload.accountId)
  return {
    ...profiles,
    [payload.accountId]: {
      ...existing,
      firstName: payload.firstName,
      lastName: payload.lastName,
    },
  }
}

export function applyExperienceLevelAddedToCoachingProfile(
  profiles: AthleteCoachingProfile,
  event: Event,
): AthleteCoachingProfile {
  const payload = ExperienceLevelAddedSchema.parse(event.payload)
  const existing = getOrCreateEntry(profiles, payload.accountId)
  return {
    ...profiles,
    [payload.accountId]: {
      ...existing,
      experienceLevel: payload.experienceLevel,
    },
  }
}

export function applyGoalsConfirmedToCoachingProfile(
  profiles: AthleteCoachingProfile,
  event: Event,
): AthleteCoachingProfile {
  const payload = GoalsConfirmedSchema.parse(event.payload)
  const existing = getOrCreateEntry(profiles, payload.accountId)
  return {
    ...profiles,
    [payload.accountId]: {
      ...existing,
      summarisedGoals: payload.summarisedGoals,
      summary: payload.summary,
    },
  }
}

export function applyInjuriesConfirmedToCoachingProfile(
  profiles: AthleteCoachingProfile,
  event: Event,
): AthleteCoachingProfile {
  const payload = InjuriesConfirmedSchema.parse(event.payload)
  const existing = getOrCreateEntry(profiles, payload.accountId)
  return {
    ...profiles,
    [payload.accountId]: {
      ...existing,
      summarisedInjuries: payload.summarisedInjuries,
    },
  }
}

export function applyOnboardingCompletedToCoachingProfile(
  profiles: AthleteCoachingProfile,
  event: Event,
): AthleteCoachingProfile {
  const accountId = event.aggregateId
  const existing = getOrCreateEntry(profiles, accountId)
  return {
    ...profiles,
    [accountId]: {
      ...existing,
      onboardingComplete: true,
    },
  }
}
