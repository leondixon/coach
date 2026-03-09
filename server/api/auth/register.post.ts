import { z } from 'zod'
import { registerAthlete } from '../../commands/register-athlete'
import { appendEventAndUpdateProjections } from '../../utils/append-event-and-update-projections'
import { loadEvents } from '../../events/store'
import { generateUlid } from '../../utils/ulid'

const RegisterBodySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
})

export type RegisterResult = { success: true, accountId: string } | { success: false, error: string }

interface RegisterDeps {
  registerAthlete: (input: unknown) => Promise<RegisterResult>
}

export async function handleRegister(
  body: unknown,
  deps: RegisterDeps,
): Promise<{ status: number, body: Record<string, unknown> }> {
  const validation = RegisterBodySchema.safeParse(body)
  if (!validation.success) {
    return { status: 422, body: { error: 'invalid_input' } }
  }

  const result = await deps.registerAthlete(validation.data)

  if (!result.success) {
    if (result.error === 'email_already_exists') {
      return { status: 409, body: { error: result.error } }
    }
    return { status: 400, body: { error: result.error } }
  }

  return { status: 200, body: { accountId: result.accountId } }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = await handleRegister(body, {
    registerAthlete: (input) =>
      registerAthlete(input as Parameters<typeof registerAthlete>[0], {
        createCredential: async (email, password) => {
          const storage = useStorage('local:')
          const existingCredential = await storage.getItem(`credentials:${email}`)
          if (existingCredential) {
            return { success: false, error: 'email_already_exists' }
          }
          // TODO: hash password
          await storage.setItem(`credentials:${email}`, { password })
          return { success: true }
        },
        generateId: generateUlid,
        appendEvent: appendEventAndUpdateProjections,
        loadEvents,
        clock: () => new Date().toISOString(),
      }),
  })

  if (result.status === 200) {
    await setUserSession(event, { user: { accountId: (result.body as { accountId: string }).accountId } })
    setResponseStatus(event, 201)
    return result.body
  }

  setResponseStatus(event, result.status)
  return result.body
})
