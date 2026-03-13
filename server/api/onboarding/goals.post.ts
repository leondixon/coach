import { z } from 'zod'
import { submitGoals } from '../../commands/submit-goals'
import { appendEventAndUpdateProjections } from '../../utils/append-event-and-update-projections'
import { loadEvents } from '../../events/store'

const SubmitGoalsBodySchema = z.object({
  goals: z.string().min(1),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const accountId = (session.user as { accountId?: string } | undefined)?.accountId
  if (!accountId) {
    setResponseStatus(event, 401)
    return { error: 'unauthenticated' }
  }

  const body = await readBody(event)
  const validation = SubmitGoalsBodySchema.safeParse(body)
  if (!validation.success) {
    setResponseStatus(event, 422)
    return { error: 'goals_required' }
  }

  const result = await submitGoals(
    { ...validation.data, accountId },
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
