import { confirmInjuries } from '../../../commands/confirm-injuries'
import { appendEventAndUpdateProjections } from '../../../utils/append-event-and-update-projections'
import { loadEvents } from '../../../events/store'

interface SummarisedInjury {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

interface InjuriesSummaryEntry {
  injuries: string
  summarisedInjuries?: SummarisedInjury
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
  const projection = await storage.getItem('projections/injuries-summary') as Record<string, InjuriesSummaryEntry> | null
  const injuriesSummary = projection?.[accountId]

  if (!injuriesSummary) {
    setResponseStatus(event, 400)
    return { error: 'injuries_not_submitted' }
  }

  if (!injuriesSummary.summarisedInjuries) {
    setResponseStatus(event, 400)
    return { error: 'injuries_summary_not_ready' }
  }

  const result = await confirmInjuries(
    {
      accountId,
      summarisedInjuries: injuriesSummary.summarisedInjuries,
    },
    {
      appendEvent: appendEventAndUpdateProjections,
      loadEvents,
      clock: () => new Date().toISOString(),
    },
  )

  if (!result.success) {
    if (result.error === 'injuries_already_confirmed') {
      setResponseStatus(event, 409)
      return { error: result.error }
    }
    setResponseStatus(event, 400)
    return { error: result.error }
  }

  return { success: true }
})
