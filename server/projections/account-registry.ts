import type { Event } from '../events/types'

interface AccountRegistryEntry {
  accountType: string
  email: string
  fullName: string
}

type AccountRegistry = Record<string, AccountRegistryEntry>

export function applyAthleteRegisteredToAccountRegistry(
  registry: AccountRegistry,
  event: Event,
): AccountRegistry {
  const payload = event.payload as {
    accountId: string
    firstName: string
    lastName: string
    email: string
  }

  return {
    ...registry,
    [payload.accountId]: {
      accountType: 'athlete',
      email: payload.email,
      fullName: `${payload.firstName} ${payload.lastName}`,
    },
  }
}
