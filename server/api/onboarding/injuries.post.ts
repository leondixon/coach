import { z } from 'zod'

const SubmitInjuriesBodySchema = z.object({
  injuries: z.string().min(1),
})

export type SubmitInjuriesResult = { success: true } | { success: false, error: string }

interface SubmitInjuriesDeps {
  getAuthenticatedAccountId: () => Promise<string | undefined>
  submitInjuries: (input: unknown) => Promise<SubmitInjuriesResult>
}

export async function handleSubmitInjuries(
  body: unknown,
  deps: SubmitInjuriesDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const accountId = await deps.getAuthenticatedAccountId()
  if (!accountId) {
    return { status: 401, body: { error: 'unauthenticated' } }
  }

  const validation = SubmitInjuriesBodySchema.safeParse(body)
  if (!validation.success) {
    return { status: 422, body: { error: 'injuries_required' } }
  }

  const result = await deps.submitInjuries({ ...validation.data, accountId })

  if (!result.success) {
    if (result.error === 'injuries_already_confirmed') {
      return { status: 409, body: { error: result.error } }
    }
    return { status: 400, body: { error: result.error } }
  }

  return { status: 200, body: { success: true } }
}
