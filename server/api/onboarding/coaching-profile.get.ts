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

export interface AthleteCoachingProfileEntry {
  firstName: string | undefined
  lastName: string | undefined
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | undefined
  summarisedGoals: SummarisedGoal[] | undefined
  summary: string | undefined
  summarisedInjuries: SummarisedInjuries | undefined
  onboardingComplete: boolean
}

interface CoachingProfileDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  getCoachingProfile: (accountId: string) => Promise<AthleteCoachingProfileEntry | undefined>
}

export async function handleCoachingProfile(
  deps: CoachingProfileDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const entry = await deps.getCoachingProfile(accountId)
  if (!entry) {
    return { status: 404, body: { error: 'not_found' } }
  }

  return { status: 200, body: entry }
}
