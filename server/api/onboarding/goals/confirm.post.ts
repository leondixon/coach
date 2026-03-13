import { confirmGoals } from '../../../commands/confirm-goals'
import { appendEventAndUpdateProjections } from '../../../utils/append-event-and-update-projections'
import { loadEvents } from '../../../events/store'

interface SummarisedGoal {
  description: string
  targetAreas: string[]
  priority: 1 | 2 | 3 | 4 | 5
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
  const goalsSummary = projection?.[accountId]

  if (!goalsSummary) {
    setResponseStatus(event, 400)
    return { error: 'goals_not_submitted' }
  }

  if (!goalsSummary.summarisedGoals || !goalsSummary.summary) {
    setResponseStatus(event, 400)
    return { error: 'goals_summary_not_ready' }
  }

  const result = await confirmGoals(
    {
      accountId,
      summarisedGoals: goalsSummary.summarisedGoals,
      summary: goalsSummary.summary,
    },
    {
      appendEvent: appendEventAndUpdateProjections,
      loadEvents,
      clock: () => new Date().toISOString(),
    },
  )

  if (!result.success) {
    if (result.error === 'goals_already_confirmed') {
      setResponseStatus(event, 409)
      return { error: result.error }
    }
    setResponseStatus(event, 400)
    return { error: result.error }
  }

  return { success: true }
})
