interface SummarisedGoal {
  description: string
  targetAreas: string[]
  priority: number
}

export interface GoalsSummaryEntry {
  goals: string
  summarisedGoals?: SummarisedGoal[]
  summary?: string
  status: 'pending' | 'confirmed'
}

interface GoalsSummaryDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  getGoalsSummary: (accountId: string) => Promise<GoalsSummaryEntry | undefined>
}

export async function handleGoalsSummary(
  deps: GoalsSummaryDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const entry = await deps.getGoalsSummary(accountId)
  if (!entry) {
    return { status: 404, body: { error: 'not_found' } }
  }

  return { status: 200, body: entry }
}
