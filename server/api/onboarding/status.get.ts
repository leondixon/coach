interface OnboardingStatusEntry {
  goalsConfirmed: boolean
  injuriesConfirmed: boolean
  experienceLevelAdded: boolean
  onboardingComplete: boolean
}

const defaultStatus: OnboardingStatusEntry = {
  goalsConfirmed: false,
  injuriesConfirmed: false,
  experienceLevelAdded: false,
  onboardingComplete: false,
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const accountId = (session.user as { accountId?: string } | undefined)?.accountId
  if (!accountId) {
    setResponseStatus(event, 401)
    return { error: 'unauthenticated' }
  }

  const storage = useStorage('local:')
  const projection = await storage.getItem('projections/onboarding-status') as Record<string, OnboardingStatusEntry> | null
  return projection?.[accountId] ?? defaultStatus
})
