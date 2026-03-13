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

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const accountId = (session.user as { accountId?: string } | undefined)?.accountId
  if (!accountId) {
    setResponseStatus(event, 401)
    return { error: 'unauthenticated' }
  }

  const storage = useStorage('local:')
  const projection = await storage.getItem('projections/athlete-coaching-profile') as Record<string, AthleteCoachingProfileEntry> | null
  const entry = projection?.[accountId]
  if (!entry) {
    setResponseStatus(event, 404)
    return { error: 'not_found' }
  }

  return entry
})
