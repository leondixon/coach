import { describe, it, expect } from 'vitest'
import { registerAthlete } from './register-athlete'

// ─── Test helpers ───

function createValidRegistrationInput() {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'SecureP@ss1',
  }
}

function createDefaultDeps() {
  return {
    createCredential: async (_email: string, _password: string) =>
      ({ success: true as const }),
    generateId: () => '01JNQP2V3K4M5N6R7S8T9WXYZ0',
    appendEvent: async (_event: unknown) => {},
    loadEvents: async (_aggregateType: string, _id: string) => [] as unknown[],
    clock: () => '2026-03-08T12:00:00.000Z',
  }
}

// ─── RegisterAthlete command ───

describe('RegisterAthlete command', () => {
  describe('Given no existing account', () => {
    describe('When called with valid input and valid password', () => {
      it('Then it creates credential and emits AthleteRegistered', async () => {
        const input = createValidRegistrationInput()
        const deps = createDefaultDeps()

        let appendedEvent: unknown
        deps.appendEvent = async (event: unknown) => { appendedEvent = event }

        let credentialCreated = false
        deps.createCredential = async (email: string, _password: string) => {
          credentialCreated = true
          expect(email).toBe('ada@example.com')
          return { success: true as const }
        }

        const result = await registerAthlete(input, deps)

        expect(result).toEqual({ success: true, accountId: '01JNQP2V3K4M5N6R7S8T9WXYZ0' })
        expect(credentialCreated).toBe(true)
        expect(appendedEvent).toBeDefined()

        const event = appendedEvent as Record<string, unknown>
        expect(event).toMatchObject({
          aggregateType: 'AthleteAccount',
          aggregateId: '01JNQP2V3K4M5N6R7S8T9WXYZ0',
          eventType: 'AthleteRegistered',
          payload: {
            accountId: '01JNQP2V3K4M5N6R7S8T9WXYZ0',
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            registeredAt: '2026-03-08T12:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given credential creation fails (duplicate email)', () => {
    describe('When RegisterAthlete is called', () => {
      it('Then no domain event is emitted and an error is returned', async () => {
        const input = createValidRegistrationInput()
        const deps = createDefaultDeps()

        let eventAppended = false
        deps.appendEvent = async () => { eventAppended = true }
        deps.createCredential = async () =>
          ({ success: false as const, error: 'email_already_exists' })

        const result = await registerAthlete(input, deps)

        expect(result).toEqual({ success: false, error: 'email_already_exists' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given missing required fields', () => {
    describe('When called without firstName', () => {
      it('Then validation fails before any side effects', async () => {
        const input = { ...createValidRegistrationInput(), firstName: '' }
        const deps = createDefaultDeps()

        let credentialCalled = false
        deps.createCredential = async () => { credentialCalled = true; return { success: true as const } }

        let eventAppended = false
        deps.appendEvent = async () => { eventAppended = true }

        const result = await registerAthlete(input, deps)

        expect(result).toEqual({ success: false, error: 'validation_failed' })
        expect(credentialCalled).toBe(false)
        expect(eventAppended).toBe(false)
      })
    })

    describe('When called without email', () => {
      it('Then validation fails before any side effects', async () => {
        const input = { ...createValidRegistrationInput(), email: '' }
        const deps = createDefaultDeps()

        let credentialCalled = false
        deps.createCredential = async () => { credentialCalled = true; return { success: true as const } }

        let eventAppended = false
        deps.appendEvent = async () => { eventAppended = true }

        const result = await registerAthlete(input, deps)

        expect(result).toEqual({ success: false, error: 'validation_failed' })
        expect(credentialCalled).toBe(false)
        expect(eventAppended).toBe(false)
      })
    })

    describe('When called without password', () => {
      it('Then validation fails before any side effects', async () => {
        const input = { ...createValidRegistrationInput(), password: '' }
        const deps = createDefaultDeps()

        let credentialCalled = false
        deps.createCredential = async () => { credentialCalled = true; return { success: true as const } }

        let eventAppended = false
        deps.appendEvent = async () => { eventAppended = true }

        const result = await registerAthlete(input, deps)

        expect(result).toEqual({ success: false, error: 'validation_failed' })
        expect(credentialCalled).toBe(false)
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given an account already exists for this accountId', () => {
    describe('When RegisterAthlete is called', () => {
      it('Then it rejects with account_already_exists', async () => {
        const input = createValidRegistrationInput()
        const deps = createDefaultDeps()

        deps.loadEvents = async () => [{
          eventId: 'existing-event-id',
          aggregateType: 'AthleteAccount',
          aggregateId: '01JNQP2V3K4M5N6R7S8T9WXYZ0',
          eventType: 'AthleteRegistered',
          payload: {
            accountId: '01JNQP2V3K4M5N6R7S8T9WXYZ0',
            firstName: 'Ada',
            lastName: 'Lovelace',
            email: 'ada@example.com',
            registeredAt: '2026-03-07T12:00:00.000Z',
          },
          occurredAt: '2026-03-07T12:00:00.000Z',
          version: 1,
        }]

        let eventAppended = false
        deps.appendEvent = async () => { eventAppended = true }

        const result = await registerAthlete(input, deps)

        expect(result).toEqual({ success: false, error: 'account_already_exists' })
        expect(eventAppended).toBe(false)
      })
    })
  })
})
