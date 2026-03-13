import { describe, it, expect } from 'vitest'
import { applyAthleteRegisteredToAccountRegistry } from './account-registry'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

type AccountRegistryEntry = {
  accountType: string
  email: string
  fullName: string
}

type AccountRegistry = Record<string, AccountRegistryEntry>

function athleteRegisteredEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 'evt-1',
    aggregateType: 'AthleteAccount' as const,
    aggregateId: ACCOUNT_ID,
    eventType: 'AthleteRegistered' as const,
    payload: {
      accountId: ACCOUNT_ID,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      registeredAt: '2026-03-08T12:00:00.000Z',
      ...overrides,
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 1,
  }
}

// ─── AccountRegistry projection ───

describe('AccountRegistry projection', () => {
  describe('Given an empty AccountRegistry', () => {
    describe('When AthleteRegistered event is applied', () => {
      it('Then the registry contains the new athlete entry', () => {
        const registry: AccountRegistry = {}

        const updated = applyAthleteRegisteredToAccountRegistry(registry, athleteRegisteredEvent())

        expect(updated).toEqual({
          [ACCOUNT_ID]: {
            accountType: 'athlete',
            email: 'ada@example.com',
            fullName: 'Ada Lovelace',
          },
        })
      })
    })
  })

  describe('Given an AccountRegistry with existing entries', () => {
    describe('When a new AthleteRegistered event is applied', () => {
      it('Then the new entry is added without affecting existing entries', () => {
        const registry: AccountRegistry = {
          'existing-account-id': {
            accountType: 'athlete',
            email: 'existing@example.com',
            fullName: 'Existing User',
          },
        }

        const updated = applyAthleteRegisteredToAccountRegistry(registry, athleteRegisteredEvent())

        expect(updated['existing-account-id']).toEqual({
          accountType: 'athlete',
          email: 'existing@example.com',
          fullName: 'Existing User',
        })
        expect(updated[ACCOUNT_ID]).toEqual({
          accountType: 'athlete',
          email: 'ada@example.com',
          fullName: 'Ada Lovelace',
        })
      })
    })
  })

  describe('Given an AccountRegistry with an existing entry for the same accountId', () => {
    describe('When AthleteRegistered is replayed', () => {
      it('Then the existing entry is overwritten (idempotent replay)', () => {
        const registry: AccountRegistry = {
          [ACCOUNT_ID]: {
            accountType: 'athlete',
            email: 'old@example.com',
            fullName: 'Old Name',
          },
        }

        const updated = applyAthleteRegisteredToAccountRegistry(registry, athleteRegisteredEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          accountType: 'athlete',
          email: 'ada@example.com',
          fullName: 'Ada Lovelace',
        })
      })
    })
  })
})
