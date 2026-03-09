import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import { submitInjuries } from './submit-injuries'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

function mockStubs() {
  return {
    appendEvent: async (_event: Event) => {},
    loadEvents: async (_aggregateType: string, _id: string) => [] as Event[],
    clock: () => '2026-03-08T12:00:00.000Z',
  }
}

function injuriesSubmittedEvent(version = 1): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesSubmitted',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Shoulder pain',
      submittedAt: '2026-03-08T11:00:00.000Z',
    },
    occurredAt: '2026-03-08T11:00:00.000Z',
    version,
  }
}

function injuriesConfirmedEvent(version = 2): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Shoulder pain',
      summarisedInjuries: {
        affectedAreas: ['shoulder'],
        restrictions: ['overhead press'],
        severity: 'mild',
        summary: 'Summary',
      },
      confirmedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version,
  }
}

// ─── SubmitInjuries command ───

describe('SubmitInjuries command', () => {
  describe('Given an athlete with no prior injuries submitted', () => {
    describe('When SubmitInjuries is called with valid injuries text', () => {
      it('Then it emits InjuriesSubmitted', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          injuries: 'I have a mild shoulder impingement on the left side',
        }
        const mocks = mockStubs()

        let appendedEvent: Event | undefined
        mocks.appendEvent = async (event: Event) => { appendedEvent = event }

        const result = await submitInjuries(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvent).toMatchObject({
          aggregateType: 'AthleteProfile',
          aggregateId: ACCOUNT_ID,
          eventType: 'InjuriesSubmitted',
          payload: {
            accountId: ACCOUNT_ID,
            injuries: 'I have a mild shoulder impingement on the left side',
            submittedAt: '2026-03-08T12:00:00.000Z',
          },
        })
      })
    })
  })

  describe('Given injuries were already submitted but not yet confirmed', () => {
    describe('When SubmitInjuries is called again', () => {
      it('Then re-submission is allowed and emits another InjuriesSubmitted', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          injuries: 'Actually, I also have a bad knee',
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent()]

        let appendedEvent: Event | undefined
        mocks.appendEvent = async (event: Event) => { appendedEvent = event }

        const result = await submitInjuries(input, mocks)

        expect(result).toEqual({ success: true })
        expect(appendedEvent).toMatchObject({
          eventType: 'InjuriesSubmitted',
          payload: { injuries: 'Actually, I also have a bad knee' },
        })
      })
    })
  })

  describe('Given injuries have already been confirmed', () => {
    describe('When SubmitInjuries is called', () => {
      it('Then it rejects with injuries_already_confirmed and emits nothing', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          injuries: 'New injuries after confirmation',
        }
        const mocks = mockStubs()
        mocks.loadEvents = async () => [injuriesSubmittedEvent(), injuriesConfirmedEvent()]

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await submitInjuries(input, mocks)

        expect(result).toEqual({ success: false, error: 'injuries_already_confirmed' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given empty injuries text', () => {
    describe('When SubmitInjuries is called', () => {
      it('Then it rejects with injuries_required and emits nothing', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          injuries: '',
        }
        const mocks = mockStubs()

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await submitInjuries(input, mocks)

        expect(result).toEqual({ success: false, error: 'injuries_required' })
        expect(eventAppended).toBe(false)
      })
    })
  })

  describe('Given whitespace-only injuries text', () => {
    describe('When SubmitInjuries is called', () => {
      it('Then it rejects with injuries_required and emits nothing', async () => {
        const input = {
          accountId: ACCOUNT_ID,
          injuries: '   ',
        }
        const mocks = mockStubs()

        let eventAppended = false
        mocks.appendEvent = async () => { eventAppended = true }

        const result = await submitInjuries(input, mocks)

        expect(result).toEqual({ success: false, error: 'injuries_required' })
        expect(eventAppended).toBe(false)
      })
    })
  })
})
