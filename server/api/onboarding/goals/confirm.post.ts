export type SummarisedGoal = {
  description: string
  targetAreas: string[]
  priority: 1 | 2 | 3 | 4 | 5
}

export type GoalsSummaryEntry = {
  goals: string
  summarisedGoals?: SummarisedGoal[]
  summary?: string
  status: 'pending' | 'confirmed'
}

export type ConfirmGoalsResult = { success: true } | { success: false, error: string }

interface ConfirmGoalsDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  getGoalsSummary: (accountId: string) => Promise<GoalsSummaryEntry | undefined>
  confirmGoals: (input: unknown) => Promise<ConfirmGoalsResult>
}

export async function handleConfirmGoals(
  deps: ConfirmGoalsDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const goalsSummary = await deps.getGoalsSummary(accountId)
  if (!goalsSummary) {
    return { status: 400, body: { error: 'goals_not_submitted' } }
  }

  if (!goalsSummary.summarisedGoals || !goalsSummary.summary) {
    return { status: 400, body: { error: 'goals_summary_not_ready' } }
  }

  const result = await deps.confirmGoals({
    accountId,
    summarisedGoals: goalsSummary.summarisedGoals,
    summary: goalsSummary.summary,
  })

  if (!result.success) {
    if (result.error === 'goals_already_confirmed') {
      return { status: 409, body: { error: result.error } }
    }
    return { status: 400, body: { error: result.error } }
  }

  return { status: 200, body: { success: true } }
}
