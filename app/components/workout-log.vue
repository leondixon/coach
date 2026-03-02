<script setup lang="ts">
import type { SetResult } from '~/composables/useWorkout'
import { workoutSchema } from '#shared/schemas/workout'

import * as workout from '../../data/fullbody.json'

const parsedWorkout = JSON.stringify(workout)
const t = JSON.parse(parsedWorkout).default
const workoutPlan = workoutSchema.parse(t)

const { addResult, results, reset } = useWorkout()

const allComplete = computed(() => {
  console.log(workoutPlan)
  return workoutPlan.every(exercise => results.value[exercise.id] !== undefined)
})

function onExerciseChange(id: string, sets: SetResult[]) {
  addResult(id, sets)
}

async function completeWorkout() {
  const payload = {
    completedAt: new Date().toISOString(),
    exercises: workoutPlan.map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      sets: results.value[exercise.id] ?? [],
    })),
  }

  await $fetch('/api/workout', { method: 'POST', body: payload })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-8">
    <pre wrap>
      {{ results }}
    </pre>
    {{ allComplete }}
    <ExerciseLog
      v-for="(exercise, exerciseIndex) in workoutPlan" :key="exerciseIndex" :exercise="exercise"
      @change="onExerciseChange"
    />
    <UButton :disabled="!allComplete" block size="lg" @click="completeWorkout">
      Complete Workout
    </UButton>
  </div>
</template>2
