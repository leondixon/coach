import { describe, it, expect } from 'vitest'
import { handleConfirmInjuries, type InjuriesSummaryEntry, type SummarisedInjury, type ConfirmInjuriesResult } from './confirm.post'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const summarisedInjuries: SummarisedInjury = {
  affectedAreas: ['left shoulder'],
  restrictions: ['overhead press'],
  severity: 'mild',
  summary: 'Mild shoulder impingement — avoid overhead movements.',
}

function mockStubs() {
  return {
    getAuthenticatedAccountId: async (): Promise<string | undefined> => ACCOUNT_ID,
    getInjuriesSummary: async (accountId: string): Promise<InjuriesSummaryEntry | undefined> => ({
      injuries: 'I have a mild shoulder impingement on the left side',
      summarisedInjuries,
      status: 'pending',
    }),
    confirmInjuries: async (input: unknown): Promise<ConfirmInjuriesResult> =>
      ({ success: true }),
  }
}

// ─── POST /api/onboarding/injuries/confirm ───

describe('POST /api/onboarding/injuries/confirm', () => {
  describe('Given an authenticated athlete whose injuries summary is ready to confirm', () => {
    describe('When confirm injuries is called', () => {
      it('Then returns 200 and calls confirmInjuries with summarised data from the projection', async () => {
        const deps = mockStubs()

        let commandInput: unknown
        deps.confirmInjuries = async (input: unknown) => {
          commandInput = input
          return { success: true }
        }

        const result = await handleConfirmInjuries(deps)

        expect(result.status).toBe(200)
        expect(commandInput).toMatchObject({
          accountId: ACCOUNT_ID,
          summarisedInjuries,
        })
      })
    })
  })

  describe('Given an unauthenticated request', () => {
    describe('When confirm injuries is called', () => {
      it('Then returns 401 without calling the command', async () => {
        const deps = mockStubs()
        deps.getAuthenticatedAccountId = async () => undefined

        let commandCalled = false
        deps.confirmInjuries = async () => {
          commandCalled = true
          return { success: true }
        }

        const result = await handleConfirmInjuries(deps)

        expect(result.status).toBe(401)
        expect(commandCalled).toBe(false)
      })
    })
  })

  describe('Given no injuries summary exists in the projection yet', () => {
    describe('When confirm injuries is called', () => {
      it('Then returns 400 with injuries_not_submitted', async () => {
        const deps = mockStubs()
        deps.getInjuriesSummary = async () => undefined

        const result = await handleConfirmInjuries(deps)

        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'injuries_not_submitted' })
      })
    })
  })

  describe('Given injuries were submitted but AI enrichment has not completed yet', () => {
    describe('When confirm injuries is called', () => {
      it('Then returns 400 with injuries_summary_not_ready', async () => {
        const deps = mockStubs()
        deps.getInjuriesSummary = async () => ({
          injuries: 'I have a mild shoulder impingement on the left side',
          status: 'pending',
          // summarisedInjuries absent — AI has not run yet
        })

        const result = await handleConfirmInjuries(deps)

        expect(result.status).toBe(400)
        expect(result.body).toMatchObject({ error: 'injuries_summary_not_ready' })
      })
    })
  })

  describe('Given injuries have already been confirmed', () => {
    describe('When confirm injuries is called', () => {
      it('Then returns 409 with injuries_already_confirmed', async () => {
        const deps = mockStubs()
        deps.confirmInjuries = async () =>
          ({ success: false, error: 'injuries_already_confirmed' })

        const result = await handleConfirmInjuries(deps)

        expect(result.status).toBe(409)
        expect(result.body).toMatchObject({ error: 'injuries_already_confirmed' })
      })
    })
  })
})
