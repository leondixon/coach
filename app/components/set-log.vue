<script setup lang="ts">
import type { Set } from '#shared/schemas/workout'
import type { SetResult } from '~/composables/useWorkout'

const props = defineProps<{ set: Set, setIndex: number, isWarmup?: boolean }>()
const emit = defineEmits<{ change: [setIndex: number, result: SetResult] }>()

const { reps, weight } = props.set
const repsAchieved = ref<number | undefined>(undefined)

watch(repsAchieved, (newValue) => {
  if (newValue !== undefined) {
    emit('change', props.setIndex, { reps: newValue, weight })
  }
})
</script>

<template>
  <div class="grid grid-cols-[2rem_1fr_7rem] items-center py-3 border-t border-gray-100 dark:border-gray-800">
    <span class="text-sm font-medium" :class="isWarmup ? 'text-gray-400' : 'text-gray-500'">
      {{ isWarmup ? 'W' : setIndex + 1 }}
    </span>
    <span class="text-sm" :class="isWarmup ? 'text-gray-400' : ''">
      {{ weight !== 'bodyweight' ? `${weight}kg` : 'BW' }}
    </span>
    <span v-if="isWarmup" class="text-sm text-gray-400 text-center">{{ reps }}</span>
    <UInputNumber
      v-else
      v-model="repsAchieved"
      :min="0"
      size="md"
      class="w-full"
      :placeholder="String(reps)"
      :decrement="false"
      :increment="false"
      :ui="{ base: 'text-center' }"
    />
  </div>
</template>
