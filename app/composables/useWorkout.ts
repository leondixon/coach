import type { Set } from '#shared/schemas/workout'

export type SetResult = Set

const results = ref<Record<string, SetResult[]>>({})

export function useWorkout() {
  function addResult(id: string, sets: SetResult[]) {
    results.value[id] = sets
  }

  function reset() {
    results.value = {}
  }

  return { results, addResult, reset }
}
