import { describe, it, expect } from 'vitest'
import type { Event } from '../events/types'
import {
  applyInjuriesSubmittedToInjuriesSummary,
  applyInjuriesConfirmedToInjuriesSummary,
} from './injuries-summary'

// ─── Test helpers ───

const ACCOUNT_ID = '01JNQP2V3K4M5N6R7S8T9WXYZ0'

const summarisedInjuries = {
  affectedAreas: ['left shoulder'],
  restrictions: ['overhead press', 'behind-the-neck movements'],
  severity: 'mild' as const,
  summary: 'Athlete has a mild left shoulder impingement. Avoid overhead pressing.',
}

type InjuriesSummaryEntry = {
  injuries: string
  summarisedInjuries?: typeof summarisedInjuries
  status: 'pending' | 'confirmed'
}

type InjuriesSummaryProjection = Record<string, InjuriesSummaryEntry>

function injuriesSubmittedEvent(injuries = 'Mild shoulder impingement on the left side'): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ1',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesSubmitted',
    payload: {
      accountId: ACCOUNT_ID,
      injuries,
      submittedAt: '2026-03-08T12:00:00.000Z',
    },
    occurredAt: '2026-03-08T12:00:00.000Z',
    version: 1,
  }
}

function injuriesConfirmedEvent(): Event {
  return {
    eventId: '01JNQP2V3K4M5N6R7S8T9WXYZ2',
    aggregateType: 'AthleteProfile',
    aggregateId: ACCOUNT_ID,
    eventType: 'InjuriesConfirmed',
    payload: {
      accountId: ACCOUNT_ID,
      injuries: 'Mild shoulder impingement on the left side',
      summarisedInjuries,
      confirmedAt: '2026-03-08T13:00:00.000Z',
    },
    occurredAt: '2026-03-08T13:00:00.000Z',
    version: 2,
  }
}

// ─── InjuriesSummary projection ───

describe('InjuriesSummary projection', () => {
  describe('Given an empty InjuriesSummary', () => {
    describe('When InjuriesSubmitted is applied', () => {
      it('Then a pending entry is created with the injuries text', () => {
        const projection: InjuriesSummaryProjection = {}

        const updated = applyInjuriesSubmittedToInjuriesSummary(projection, injuriesSubmittedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          injuries: 'Mild shoulder impingement on the left side',
          status: 'pending',
        })
      })
    })
  })

  describe('Given a pending InjuriesSummary entry', () => {
    describe('When InjuriesSubmitted is applied again (re-submission)', () => {
      it('Then the injuries text is replaced and status stays pending', () => {
        const projection: InjuriesSummaryProjection = {
          [ACCOUNT_ID]: { injuries: 'Old injuries text', status: 'pending' },
        }

        const updated = applyInjuriesSubmittedToInjuriesSummary(
          projection,
          injuriesSubmittedEvent('Updated: shoulder and knee issues'),
        )

        expect(updated[ACCOUNT_ID]).toEqual({
          injuries: 'Updated: shoulder and knee issues',
          status: 'pending',
        })
      })
    })
  })

  describe('Given a pending InjuriesSummary entry', () => {
    describe('When InjuriesConfirmed is applied', () => {
      it('Then status changes to confirmed and summarisedInjuries is populated', () => {
        const projection: InjuriesSummaryProjection = {
          [ACCOUNT_ID]: { injuries: 'Mild shoulder impingement on the left side', status: 'pending' },
        }

        const updated = applyInjuriesConfirmedToInjuriesSummary(projection, injuriesConfirmedEvent())

        expect(updated[ACCOUNT_ID]).toEqual({
          injuries: 'Mild shoulder impingement on the left side',
          summarisedInjuries,
          status: 'confirmed',
        })
      })
    })
  })

  describe('Given entries for other accounts exist', () => {
    describe('When InjuriesSubmitted is applied for a new account', () => {
      it('Then existing entries are not affected', () => {
        const projection: InjuriesSummaryProjection = {
          'other-account': { injuries: 'Other injuries', summarisedInjuries, status: 'confirmed' },
        }

        const updated = applyInjuriesSubmittedToInjuriesSummary(projection, injuriesSubmittedEvent())

        expect(updated['other-account'].status).toBe('confirmed')
        expect(updated[ACCOUNT_ID].status).toBe('pending')
      })
    })
  })
})
