import type { Event } from './types'

const PROJECTION_KEYS = [
  'projections/goals-summary',
  'projections/injuries-summary',
  'projections/onboarding-status',
  'projections/account-registry',
  'projections/athlete-coaching-profile',
]

const AGGREGATE_TYPES = ['AthleteAccount', 'AthleteProfile']

interface RebuildDeps {
  loadAllEventsForType: (aggregateType: string) => Promise<Event[]>
  updateProjectionsForEvent: (event: Event) => Promise<void>
  clearProjection: (key: string) => Promise<void>
}

export async function rebuildAllProjections(deps: RebuildDeps): Promise<void> {
  for (const key of PROJECTION_KEYS) {
    await deps.clearProjection(key)
  }

  for (const aggregateType of AGGREGATE_TYPES) {
    const events = await deps.loadAllEventsForType(aggregateType)
    for (const event of events) {
      await deps.updateProjectionsForEvent(event)
    }
  }
}
