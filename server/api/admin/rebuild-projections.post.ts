import { rebuildAllProjections } from '../../events/rebuild'
import { loadAllEventsForType } from '../../events/store'
import { updateProjectionsForEvent } from '../../events/projection-updater'

export default defineEventHandler(async () => {
  const storage = useStorage('local:')

  await rebuildAllProjections({
    loadAllEventsForType,
    updateProjectionsForEvent: async (event) => {
      await updateProjectionsForEvent(event, {
        getItem: (key) => storage.getItem(key),
        setItem: (key, value) => storage.setItem(key, value),
      })
    },
    clearProjection: (key) => storage.removeItem(key),
  })

  return { success: true }
})
