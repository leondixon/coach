<script setup lang="ts">
import type { Exercise } from '#shared/schemas/workout'
import type { SetResult } from '~/composables/useWorkout'

const props = defineProps<{ exercise: Exercise }>()
const emit = defineEmits<{ change: [id: string, sets: SetResult[]] }>()

const { id, name, warmupSets, sets } = props.exercise

const setResults = ref<(SetResult | undefined)[]>(sets.map(() => undefined))

function onSetChange(setIndex: number, result: SetResult) {
  setResults.value[setIndex] = result

  if (setResults.value.every(setResult => setResult !== undefined)) {
    emit('change', id, setResults.value as SetResult[])
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-base font-semibold">
        {{ name }}
      </h2>
    </template>

    <template v-if="warmupSets && warmupSets.length > 0">
      <div class="grid grid-cols-[2rem_1fr_7rem] py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
        <span>W</span>
        <span>Weight</span>
        <span>Reps</span>
      </div>
      <SetLog
        v-for="(warmupSet, warmupSetIndex) in warmupSets"
        :key="`warmup-${warmupSetIndex}`"
        :set="warmupSet"
        :set-index="warmupSetIndex"
        :is-warmup="true"
      />
    </template>

    <div
      class="grid grid-cols-[2rem_1fr_7rem] py-2 text-xs font-medium text-gray-400 uppercase tracking-wide"
      :class="warmupSets && warmupSets.length > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''"
    >
      <span>Set</span>
      <span>Weight</span>
      <span>Reps</span>
    </div>
    <SetLog
      v-for="(set, setIndex) in sets"
      :key="`working-${setIndex}`"
      :set="set"
      :set-index="setIndex"
      @change="onSetChange"
    />
  </UCard>
</template>
