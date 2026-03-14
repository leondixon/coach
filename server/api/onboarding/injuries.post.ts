import { z } from 'zod'
import { submitInjuries } from '../../commands/submit-injuries'
import { summariseInjuries } from '../../automations/summarise-injuries'
import { useCoach } from '../../ai'
import { appendEventAndUpdateProjections } from '../../utils/append-event-and-update-projections'
import { loadEvents } from '../../events/store'

const SubmitInjuriesBodySchema = z.object({
  injuries: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const accountId = (session.user as { accountId?: string } | undefined)?.accountId
  if (!accountId) {
    setResponseStatus(event, 401)
    return { error: 'unauthenticated' }
  }

  const body = await readBody(event)
  const validation = SubmitInjuriesBodySchema.safeParse(body)
  if (!validation.success) {
    setResponseStatus(event, 422)
    return { error: 'injuries_required' }
  }

  const result = await submitInjuries(
    { ...validation.data, accountId },
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

  const coach = useCoach()
  summariseInjuries(accountId, {
    coachSummarisesInjuries: coach.summariseInjuries,
    loadEvents,
    appendEvent: appendEventAndUpdateProjections,
    clock: () => new Date().toISOString(),
  }).catch(() => {})

  return { success: true }
})
