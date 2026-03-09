export type SummarisedInjury = {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

export type InjuriesSummaryEntry = {
  injuries: string
  summarisedInjuries?: SummarisedInjury
  status: 'pending' | 'confirmed'
}

export type ConfirmInjuriesResult = { success: true } | { success: false, error: string }

interface ConfirmInjuriesDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  getInjuriesSummary: (accountId: string) => Promise<InjuriesSummaryEntry | undefined>
  confirmInjuries: (input: unknown) => Promise<ConfirmInjuriesResult>
}

export async function handleConfirmInjuries(
  deps: ConfirmInjuriesDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const injuriesSummary = await deps.getInjuriesSummary(accountId)
  if (!injuriesSummary) {
    return { status: 400, body: { error: 'injuries_not_submitted' } }
  }

  if (!injuriesSummary.summarisedInjuries) {
    return { status: 400, body: { error: 'injuries_summary_not_ready' } }
  }

  const result = await deps.confirmInjuries({
    accountId,
    summarisedInjuries: injuriesSummary.summarisedInjuries,
  })

  if (!result.success) {
    if (result.error === 'injuries_already_confirmed') {
      return { status: 409, body: { error: result.error } }
    }
    return { status: 400, body: { error: result.error } }
  }

  return { status: 200, body: { success: true } }
}
