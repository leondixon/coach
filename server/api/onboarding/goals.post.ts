import { z } from 'zod'

const SubmitGoalsBodySchema = z.object({
  goals: z.string().min(1),
})

export type SubmitGoalsResult = { success: true } | { success: false, error: string }

interface SubmitGoalsDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  submitGoals: (input: unknown) => Promise<SubmitGoalsResult>
}

export async function handleSubmitGoals(
  body: unknown,
  deps: SubmitGoalsDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const validation = SubmitGoalsBodySchema.safeParse(body)
  if (!validation.success) {
    return { status: 422, body: { error: 'goals_required' } }
  }

  const result = await deps.submitGoals({ ...validation.data, accountId })

  if (!result.success) {
    if (result.error === 'goals_already_confirmed') {
      return { status: 409, body: { error: result.error } }
    }
    return { status: 400, body: { error: result.error } }
  }

  return { status: 200, body: { success: true } }
}
