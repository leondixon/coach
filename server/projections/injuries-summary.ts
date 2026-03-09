import type { Event } from '../events/types'
import { InjuriesSubmittedSchema, InjuriesConfirmedSchema } from '../events/athlete-profile'

interface SummarisedInjuries {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

interface InjuriesSummaryEntry {
  injuries: string
  summarisedInjuries?: SummarisedInjuries
  status: 'pending' | 'confirmed'
}

type InjuriesSummary = Record<string, InjuriesSummaryEntry>

export function applyInjuriesSubmittedToInjuriesSummary(
  projection: InjuriesSummary,
  event: Event,
): InjuriesSummary {
  const payload = InjuriesSubmittedSchema.parse(event.payload)
  return {
    ...projection,
    [payload.accountId]: {
      injuries: payload.injuries,
      status: 'pending',
    },
  }
}

export function applyInjuriesConfirmedToInjuriesSummary(
  projection: InjuriesSummary,
  event: Event,
): InjuriesSummary {
  const payload = InjuriesConfirmedSchema.parse(event.payload)
  return {
    ...projection,
    [payload.accountId]: {
      injuries: payload.injuries,
      summarisedInjuries: payload.summarisedInjuries,
      status: 'confirmed',
    },
  }
}
