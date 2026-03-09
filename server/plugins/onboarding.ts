import type { Event } from '../events/types'

interface OnboardingPluginDeps {
  summariseGoals: (accountId: string) => Promise<unknown>
  summariseInjuries: (accountId: string) => Promise<unknown>
}

export async function handleEventAppended(event: Event, deps: OnboardingPluginDeps): Promise<void> {
  const accountId = event.aggregateId

  if (event.eventType === 'GoalsSubmitted') {
    try {
      await deps.summariseGoals(accountId)
    }
    catch {
      // Automation failures are non-fatal — the event is already stored
    }
    return
  }

  if (event.eventType === 'InjuriesSubmitted') {
    try {
      await deps.summariseInjuries(accountId)
    }
    catch {
      // Automation failures are non-fatal — the event is already stored
    }
  }
}

export default defineNitroPlugin(() => {
  // Automation wiring is done synchronously in route handlers.
  // When AI latency becomes a concern, wire handleEventAppended to Nitro hooks here.
})
