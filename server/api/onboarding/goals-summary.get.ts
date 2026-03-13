interface SummarisedGoal {
  description: string
  targetAreas: string[]
  priority: number
}

interface GoalsSummaryEntry {
  goals: string
  summarisedGoals?: SummarisedGoal[]
  summary?: string
  status: 'pending' | 'confirmed'
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const accountId = (session.user as { accountId?: string } | undefined)?.accountId
  if (!accountId) {
    setResponseStatus(event, 401)
    return { error: 'unauthenticated' }
  }

  const storage = useStorage('local:')
  const projection = await storage.getItem('projections/goals-summary') as Record<string, GoalsSummaryEntry> | null
  const entry = projection?.[accountId]
  if (!entry) {
    setResponseStatus(event, 404)
    return { error: 'not_found' }
  }

  return entry
})
