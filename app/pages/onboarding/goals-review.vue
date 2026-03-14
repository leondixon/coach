<script setup lang="ts">
definePageMeta({ layout: 'minimal', middleware: 'onboarding' })

interface SummarisedGoal {
  description: string
  targetAreas: string[]
  priority: 1 | 2 | 3 | 4 | 5
}

interface GoalsSummaryData {
  goals: string
  summarisedGoals?: SummarisedGoal[]
  summary?: string
  status: 'pending' | 'confirmed'
}

const priorityConfig: Record<number, { label: string, class: string }> = {
  1: { label: 'Minor focus', class: 'bg-gray-100 text-gray-600' },
  2: { label: 'Moderate focus', class: 'bg-green-100 text-green-700' },
  3: { label: 'Regular focus', class: 'bg-green-200 text-green-800' },
  4: { label: 'Strong focus', class: 'bg-green-400 text-green-900' },
  5: { label: 'Primary focus', class: 'bg-green-600 text-white' },
}

const summary = ref<GoalsSummaryData | undefined>(undefined)
const isPending = ref(true)
const fetchError = ref(false)
const isConfirming = ref(false)
const errorMessage = ref<string | undefined>(undefined)

let pollingInterval: ReturnType<typeof setInterval> | undefined

async function fetchSummary() {
  try {
    const data = await $fetch<GoalsSummaryData>('/api/onboarding/goals-summary')
    summary.value = data

    if (data.status === 'confirmed' && data.summarisedGoals) {
      isPending.value = false
      stopPolling()
    }
  }
  catch {
    fetchError.value = true
    isPending.value = false
    stopPolling()
  }
}

function stopPolling() {
  if (pollingInterval !== undefined) {
    clearInterval(pollingInterval)
    pollingInterval = undefined
  }
}

onMounted(async () => {
  await fetchSummary()
  if (isPending.value) {
    pollingInterval = setInterval(fetchSummary, 3000)
  }
})

onUnmounted(() => {
  stopPolling()
})

async function confirm() {
  isConfirming.value = true
  errorMessage.value = undefined

  try {
    let status: number
    let responseError: string | undefined

    try {
      await $fetch('/api/onboarding/goals/confirm', { method: 'POST' })
      status = 200
    }
    catch (error: unknown) {
      const fetchError = error as { status?: number, data?: { error?: string } }
      status = fetchError.status ?? 400
      responseError = fetchError.data?.error
    }

    // 200: confirmed now; 409: already confirmed — both mean proceed
    if (status === 200 || status === 409) {
      await navigateTo('/onboarding/injuries')
      return
    }

    errorMessage.value = responseError === 'goals_summary_not_ready'
      ? 'The AI is still processing your goals. Please wait a moment.'
      : 'Something went wrong. Please try again.'
  }
  finally {
    isConfirming.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto mt-12">
    <div class="mb-8">
      <h1 class="text-3xl font-semibold mb-2">
        Your goals summary
      </h1>
      <p class="text-gray-500">
        Our AI coach has analysed your goals. Review the summary below and confirm to continue.
      </p>
    </div>

    <!-- Loading / polling state -->
    <UCard v-if="isPending">
      <div class="flex flex-col items-center py-8 gap-4">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl text-primary" />
        <p class="text-gray-500">
          Your goals are being processed by our AI coach…
        </p>
      </div>
    </UCard>

    <!-- Summary ready -->
    <template v-else-if="summary">
      <UCard class="mb-6">
        <template #header>
          <h2 class="font-semibold text-lg">
            Overall direction
          </h2>
        </template>
        <p>{{ summary.summary }}</p>
      </UCard>

      <UCard class="mb-6">
        <template #header>
          <h2 class="font-semibold text-lg">
            Structured goals
          </h2>
        </template>
        <ul class="space-y-4">
          <li v-for="(goal, goalIndex) in summary.summarisedGoals" :key="goalIndex" class="border rounded-lg p-4">
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium">
                {{ goal.description }}
              </p>
              <UBadge :label="priorityConfig[goal.priority].label" color="neutral" :class="priorityConfig[goal.priority].class" />
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
              <UBadge v-for="area in goal.targetAreas" :key="area" :label="area" variant="outline" />
            </div>
          </li>
        </ul>
      </UCard>

      <UAlert v-if="errorMessage" color="error" :description="errorMessage" icon="i-lucide-alert-circle" class="mb-4" />

      <div class="flex gap-3">
        <UButton variant="outline" block @click="navigateTo('/onboarding/goals')">
          Back
        </UButton>
        <UButton block :loading="isConfirming" @click="confirm">
          Confirm
        </UButton>
      </div>
    </template>

    <!-- Error fetching summary -->
    <UAlert v-else-if="fetchError" color="error"
      description="Could not load your goals summary. Please try refreshing the page." icon="i-lucide-alert-circle" />
  </div>
</template>
