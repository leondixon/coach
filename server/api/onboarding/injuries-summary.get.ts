interface SummarisedInjuries {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

interface InjuriesSummaryEntry {
  injuries: string
  summarisedInjuries?: SummarisedInjuries
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
  const entry = projection?.[accountId]
  if (!entry) {
    setResponseStatus(event, 404)
    return { error: 'not_found' }
  }

  return entry
})
