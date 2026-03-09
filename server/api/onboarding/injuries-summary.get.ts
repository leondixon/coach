interface SummarisedInjuries {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

export interface InjuriesSummaryEntry {
  injuries: string
  summarisedInjuries?: SummarisedInjuries
  status: 'pending' | 'confirmed'
}

interface InjuriesSummaryDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  getInjuriesSummary: (accountId: string) => Promise<InjuriesSummaryEntry | undefined>
}

export async function handleInjuriesSummary(
  deps: InjuriesSummaryDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const entry = await deps.getInjuriesSummary(accountId)
  if (!entry) {
    return { status: 404, body: { error: 'not_found' } }
  }

  return { status: 200, body: entry }
}
