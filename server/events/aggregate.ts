import type { Event } from './types'
import {
  AthleteAccountEventType,
  ATHLETE_ACCOUNT_AGGREGATE_TYPE,
  AthleteRegisteredSchema,
} from '../events/athlete-account'
import {
  AthleteProfileEventType,
  ATHLETE_PROFILE_AGGREGATE_TYPE,
  GoalsSubmittedSchema,
  GoalsConfirmedSchema,
  ExperienceLevelAddedSchema,
  InjuriesSubmittedSchema,
  InjuriesConfirmedSchema,
  OnboardingCompletedSchema,
  type SummarisedGoal,
  type SummarisedInjuries,
} from '../events/athlete-profile'

interface AggregateDeps {
  loadEvents: (aggregateType: string, id: string) => Promise<Event[]>
}

// ─── AthleteAccount ───

interface AthleteAccountState {
  accountId: string
  firstName: string
  lastName: string
  email: string
  registeredAt: string
}

export async function rehydrateAthleteAccount(
  accountId: string,
  deps: AggregateDeps,
): Promise<AthleteAccountState | undefined> {
  const events = await deps.loadEvents(ATHLETE_ACCOUNT_AGGREGATE_TYPE, accountId)
  if (events.length === 0) return undefined

  let state: AthleteAccountState | undefined

  for (const event of events) {
    if (event.eventType === AthleteAccountEventType.AthleteRegistered) {
      const payload = AthleteRegisteredSchema.parse(event.payload)
      state = {
        accountId: payload.accountId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        registeredAt: payload.registeredAt,
      }
    }
  }

  return state
}

// ─── AthleteProfile ───

interface AthleteProfileState {
  goals?: string
  goalsSubmittedAt?: string
  goalsConfirmedAt?: string
  summarisedGoals?: SummarisedGoal[]
  goalsSummary?: string
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  injuries?: string
  injuriesSubmittedAt?: string
  injuriesConfirmedAt?: string
  summarisedInjuries?: SummarisedInjuries
  onboardingCompletedAt?: string
}

export async function rehydrateAthleteProfile(
  accountId: string,
  deps: AggregateDeps,
): Promise<AthleteProfileState> {
  const events = await deps.loadEvents(ATHLETE_PROFILE_AGGREGATE_TYPE, accountId)
  const state: AthleteProfileState = {}

  for (const event of events) {
    if (event.eventType === AthleteProfileEventType.GoalsSubmitted) {
      const payload = GoalsSubmittedSchema.parse(event.payload)
      state.goals = payload.goals
      state.goalsSubmittedAt = payload.submittedAt
    }

    if (event.eventType === AthleteProfileEventType.GoalsConfirmed) {
      const payload = GoalsConfirmedSchema.parse(event.payload)
      state.summarisedGoals = payload.summarisedGoals
      state.goalsSummary = payload.summary
      state.goalsConfirmedAt = payload.confirmedAt
    }

    if (event.eventType === AthleteProfileEventType.ExperienceLevelAdded) {
      const payload = ExperienceLevelAddedSchema.parse(event.payload)
      state.experienceLevel = payload.experienceLevel
    }

    if (event.eventType === AthleteProfileEventType.InjuriesSubmitted) {
      const payload = InjuriesSubmittedSchema.parse(event.payload)
      state.injuries = payload.injuries
      state.injuriesSubmittedAt = payload.submittedAt
    }

    if (event.eventType === AthleteProfileEventType.InjuriesConfirmed) {
      const payload = InjuriesConfirmedSchema.parse(event.payload)
      state.summarisedInjuries = payload.summarisedInjuries
      state.injuriesConfirmedAt = payload.confirmedAt
    }

    if (event.eventType === AthleteProfileEventType.OnboardingCompleted) {
      const payload = OnboardingCompletedSchema.parse(event.payload)
      state.onboardingCompletedAt = payload.completedAt
    }
  }

  return state
}
