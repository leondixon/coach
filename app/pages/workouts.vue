<script setup lang="ts">
import { Behavior } from '@google/genai'
import * as workout from '../../data/local/my-workouts.json'

const parsedWorkout = JSON.stringify(workout)
</script>

<template>
  <div class="text-center p-4 text-3xl">
    <h1>Workouts</h1>
    <pre wrap>
      {{ parsedWorkout }}
    </pre>
  </div>
</template>

<style scoped></style>
