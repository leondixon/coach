<script setup lang="ts">
import { workoutSchema } from '#shared/schemas/workout'
import ExerciseLog from '~/components/exercise-log.vue'
import * as workout from '../../data/fullbody.json'

const parsedWorkout = JSON.stringify(workout)
const t = JSON.parse(parsedWorkout).default
const workoutPlan = workoutSchema.parse(t)
</script>

<template>
  <div class="text-center p-4 text-3xl">
    <h1>Workouts</h1>
    <h2>Exercise</h2>
    <div class="m-auto flex shrink bg-white rounded text-md items-center justify-center gap-x-5">
      <ExerciseLog v-for="(exercise, index) in workoutPlan" :key="index" :exercise="exercise" />
    </div>
  </div>
</template>
