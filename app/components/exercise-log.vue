<script setup lang="ts">
import type { Exercise } from '#shared/schemas/workout'

const props = defineProps<{ exercise: Exercise }>()
const { name, sets } = toRefs(props.exercise)
const repsAchieved = ref()
</script>

<template>
  <div>
    {{ name }}
    <div class="">
      Set
      Reps
      <div
        v-for="({ reps, weight, warmup }, index) in sets" :key="index"
        class="m-auto flex shrink bg-white rounded text-md items-center justify-center gap-x-5"
      >
        {{ warmup ? 'W' : index + 1 }}
        <template v-if="weight && weight !== 'bodyweight'">
          {{ weight }}
        </template>
        <template v-else>
          BW
        </template>
        <UInputNumber v-model="repsAchieved" class="max-w-24" :placeholder="String(reps)" :min="0" />
        <UCheckbox />
      </div>
    </div>
  </div>
</template>
