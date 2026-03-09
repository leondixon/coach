import type { Event } from '../events/types'

interface OnboardingStatusEntry {
  goalsConfirmed: boolean
  injuriesConfirmed: boolean
  experienceLevelAdded: boolean
  onboardingComplete: boolean
}

type OnboardingStatus = Record<string, OnboardingStatusEntry>

function getOrCreateEntry(status: OnboardingStatus, accountId: string): OnboardingStatusEntry {
  return status[accountId] ?? {
    goalsConfirmed: false,
    injuriesConfirmed: false,
    experienceLevelAdded: false,
    onboardingComplete: false,
  }
}

export function applyGoalsConfirmedToOnboardingStatus(
  status: OnboardingStatus,
  event: Event,
): OnboardingStatus {
  const accountId = event.aggregateId
  return {
    ...status,
    [accountId]: { ...getOrCreateEntry(status, accountId), goalsConfirmed: true },
  }
}

export function applyInjuriesConfirmedToOnboardingStatus(
  status: OnboardingStatus,
  event: Event,
): OnboardingStatus {
  const accountId = event.aggregateId
  return {
    ...status,
    [accountId]: { ...getOrCreateEntry(status, accountId), injuriesConfirmed: true },
  }
}

export function applyExperienceLevelAddedToOnboardingStatus(
  status: OnboardingStatus,
  event: Event,
): OnboardingStatus {
  const accountId = event.aggregateId
  return {
    ...status,
    [accountId]: { ...getOrCreateEntry(status, accountId), experienceLevelAdded: true },
  }
}

export function applyOnboardingCompletedToOnboardingStatus(
  status: OnboardingStatus,
  event: Event,
): OnboardingStatus {
  const accountId = event.aggregateId
  return {
    ...status,
    [accountId]: { ...getOrCreateEntry(status, accountId), onboardingComplete: true },
  }
}
