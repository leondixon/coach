export interface OnboardingStatusEntry {
  goalsConfirmed: boolean
  injuriesConfirmed: boolean
  experienceLevelAdded: boolean
  onboardingComplete: boolean
}

interface OnboardingStatusDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  getOnboardingStatus: (accountId: string) => Promise<OnboardingStatusEntry | undefined>
}

const defaultStatus: OnboardingStatusEntry = {
  goalsConfirmed: false,
  injuriesConfirmed: false,
  experienceLevelAdded: false,
  onboardingComplete: false,
}

export async function handleOnboardingStatus(
  deps: OnboardingStatusDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const entry = await deps.getOnboardingStatus(accountId)
  return { status: 200, body: entry ?? defaultStatus }
}
