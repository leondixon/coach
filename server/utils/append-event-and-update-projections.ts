import type { Event } from '../events/types'
import { appendEvent } from '../events/store'
import { updateProjectionsForEvent } from '../events/projection-updater'

export async function appendEventAndUpdateProjections(event: Event): Promise<void> {
  const storage = useStorage('local:')
  await appendEvent(event)
  await updateProjectionsForEvent(event, storage)
}
