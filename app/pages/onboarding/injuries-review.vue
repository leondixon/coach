<template>
  <div class="max-w-2xl mx-auto mt-12">
    <div class="mb-8">
      <h1 class="text-3xl font-semibold mb-2">Your injuries summary</h1>
      <p class="text-gray-500">Our AI coach has analysed your injury information. Review the summary below and confirm to complete onboarding.</p>
    </div>

    <!-- Loading / polling state -->
    <UCard v-if="isPending">
      <div class="flex flex-col items-center py-8 gap-4">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl text-primary" />
        <p class="text-gray-500">Your injury information is being processed by our AI coach…</p>
      </div>
    </UCard>

    <!-- Summary ready -->
    <template v-else-if="summary">
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-lg">Injury assessment</h2>
            <UBadge
              :label="summary.summarisedInjuries.severity"
              :color="summary.summarisedInjuries.severity === 'severe' ? 'error' : 'success'"
            />
          </div>
        </template>
        <p class="mb-4">{{ summary.summarisedInjuries.summary }}</p>

        <div v-if="summary.summarisedInjuries.affectedAreas.length > 0" class="mb-3">
          <p class="text-sm font-medium text-gray-600 mb-1">Affected areas</p>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="area in summary.summarisedInjuries.affectedAreas"
              :key="area"
              :label="area"
              variant="outline"
            />
          </div>
        </div>

        <div v-if="summary.summarisedInjuries.restrictions.length > 0">
          <p class="text-sm font-medium text-gray-600 mb-1">Movements to avoid</p>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li v-for="restriction in summary.summarisedInjuries.restrictions" :key="restriction">
              {{ restriction }}
            </li>
          </ul>
        </div>
      </UCard>

      <UAlert
        v-if="errorMessage"
        color="error"
        :description="errorMessage"
        icon="i-lucide-alert-circle"
        class="mb-4"
      />

      <UButton block :loading="isConfirming" @click="confirm">
        Confirm and complete onboarding
      </UButton>
    </template>

    <!-- Error fetching summary -->
    <UAlert
      v-else-if="fetchError"
      color="error"
      description="Could not load your injuries summary. Please try refreshing the page."
      icon="i-lucide-alert-circle"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'minimal', middleware: 'onboarding' })

interface SummarisedInjuries {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

interface InjuriesSummaryData {
  injuries: string
  summarisedInjuries?: SummarisedInjuries
  status: 'pending' | 'confirmed'
}

interface ConfirmedInjuriesSummaryData extends InjuriesSummaryData {
  summarisedInjuries: SummarisedInjuries
}

const summary = ref<ConfirmedInjuriesSummaryData | undefined>(undefined)
const isPending = ref(true)
const fetchError = ref(false)
const isConfirming = ref(false)
const errorMessage = ref<string | undefined>(undefined)

let pollingInterval: ReturnType<typeof setInterval> | undefined

async function fetchSummary() {
  try {
    const data = await $fetch<InjuriesSummaryData>('/api/onboarding/injuries-summary')

    if (data.status === 'confirmed' && data.summarisedInjuries) {
      summary.value = data as ConfirmedInjuriesSummaryData
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
      await $fetch('/api/onboarding/injuries/confirm', { method: 'POST' })
      status = 200
    }
    catch (error: unknown) {
      const fetchError = error as { status?: number, data?: { error?: string } }
      status = fetchError.status ?? 400
      responseError = fetchError.data?.error
    }

    // 200: confirmed now; 409: already confirmed — both mean proceed
    if (status === 200 || status === 409) {
      await navigateTo('/home')
      return
    }

    errorMessage.value = responseError === 'injuries_summary_not_ready'
      ? 'The AI is still processing your injury information. Please wait a moment.'
      : 'Something went wrong. Please try again.'
  }
  finally {
    isConfirming.value = false
  }
}
</script>
