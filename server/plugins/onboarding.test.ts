import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import { handleEventAppended } from './onboarding'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    summariseGoals: async (_accountId: string) => {},
    summariseInjuries: async (_accountId: string) => {},
  }
}

function makeEvent(eventType: string, accountId: string = ACCOUNT_ID): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteProfile',
    aggregateId: accountId,
    eventType,
    payload: { accountId },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 1,
  }
}

// ─── handleEventAppended ───

describe('handleEventAppended', () => {
  describe('Given a GoalsSubmitted event is appended', () => {
    describe('When handleEventAppended is called', () => {
      it('Then summariseGoals is called with the accountId from the event payload', async () => {
        const deps = mockStubs()

        let capturedAccountId: string | undefined
        deps.summariseGoals = async (accountId: string) => {
          capturedAccountId = accountId
        }

        await handleEventAppended(makeEvent('GoalsSubmitted'), deps)

        expect(capturedAccountId).toBe(ACCOUNT_ID)
      })
    })
  })

  describe('Given a GoalsSubmitted event is appended', () => {
    describe('When handleEventAppended is called', () => {
      it('Then summariseInjuries is not called', async () => {
        const deps = mockStubs()

        let summariseInjuriesCalled = false
        deps.summariseInjuries = async () => {
          summariseInjuriesCalled = true
        }

        await handleEventAppended(makeEvent('GoalsSubmitted'), deps)

        expect(summariseInjuriesCalled).toBe(false)
      })
    })
  })

  describe('Given an InjuriesSubmitted event is appended', () => {
    describe('When handleEventAppended is called', () => {
      it('Then summariseInjuries is called with the accountId from the event payload', async () => {
        const deps = mockStubs()

        let capturedAccountId: string | undefined
        deps.summariseInjuries = async (accountId: string) => {
          capturedAccountId = accountId
        }

        await handleEventAppended(makeEvent('InjuriesSubmitted'), deps)

        expect(capturedAccountId).toBe(ACCOUNT_ID)
      })
    })
  })

  describe('Given an InjuriesSubmitted event is appended', () => {
    describe('When handleEventAppended is called', () => {
      it('Then summariseGoals is not called', async () => {
        const deps = mockStubs()

        let summariseGoalsCalled = false
        deps.summariseGoals = async () => {
          summariseGoalsCalled = true
        }

        await handleEventAppended(makeEvent('InjuriesSubmitted'), deps)

        expect(summariseGoalsCalled).toBe(false)
      })
    })
  })

  describe('Given an unrelated event type such as GoalsConfirmed', () => {
    describe('When handleEventAppended is called', () => {
      it('Then neither automation is triggered', async () => {
        const deps = mockStubs()

        let summariseGoalsCalled = false
        let summariseInjuriesCalled = false
        deps.summariseGoals = async () => { summariseGoalsCalled = true }
        deps.summariseInjuries = async () => { summariseInjuriesCalled = true }

        await handleEventAppended(makeEvent('GoalsConfirmed'), deps)

        expect(summariseGoalsCalled).toBe(false)
        expect(summariseInjuriesCalled).toBe(false)
      })
    })
  })

  describe('Given the summariseGoals automation throws an error', () => {
    describe('When handleEventAppended is called with a GoalsSubmitted event', () => {
      it('Then the failure is handled gracefully and does not propagate', async () => {
        const deps = mockStubs()
        deps.summariseGoals = async () => {
          throw new Error('coach_unavailable')
        }

        await expect(
          handleEventAppended(makeEvent('GoalsSubmitted'), deps),
        ).resolves.not.toThrow()
      })
    })
  })

  describe('Given the summariseInjuries automation throws an error', () => {
    describe('When handleEventAppended is called with an InjuriesSubmitted event', () => {
      it('Then the failure is handled gracefully and does not propagate', async () => {
        const deps = mockStubs()
        deps.summariseInjuries = async () => {
          throw new Error('coach_unavailable')
        }

        await expect(
          handleEventAppended(makeEvent('InjuriesSubmitted'), deps),
        ).resolves.not.toThrow()
      })
    })
  })
})
