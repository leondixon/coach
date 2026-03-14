<template>
  <div class="max-w-2xl mx-auto mt-12">
    <div class="mb-8">
      <h1 class="text-3xl font-semibold mb-2">What are your fitness goals?</h1>
      <p class="text-gray-500">Describe what you want to achieve. Our AI coach will help structure your training plan around your goals.</p>
    </div>

    <UCard>
      <form class="space-y-6" @submit.prevent="submit">
        <UFormField label="Your goals" required>
          <UTextarea
            v-model="formData.goals"
            placeholder="e.g. I want to build muscle, improve my posture, and run a 5K by the end of the year..."
            :rows="5"
            :disabled="isSubmitting"
          />
        </UFormField>

        <UFormField label="Experience level" required>
          <USelect
            v-model="formData.experienceLevel"
            :items="experienceLevelItems"
            :disabled="isSubmitting"
          />
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          :description="errorMessage"
          icon="i-lucide-alert-circle"
        />

        <UButton type="submit" block :loading="isSubmitting">
          Submit goals
        </UButton>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'minimal', middleware: 'onboarding' })

interface GoalsFormData {
  goals: string
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
}

const experienceLevelItems = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
]

const formData = reactive<GoalsFormData>({
  goals: '',
  experienceLevel: 'beginner',
})

onMounted(async () => {
  try {
    const data = await $fetch<{ goals?: string }>('/api/onboarding/goals-summary')
    if (data.goals) formData.goals = data.goals
  }
  catch {
    // First visit — no previous goals to load
  }
})

const isSubmitting = ref(false)
const errorMessage = ref<string | undefined>(undefined)

const errorMessages: Record<string, string> = {
  goals_required: 'Please describe your fitness goals.',
  invalid_experience_level: 'Please select a valid experience level.',
}

async function submit() {
  isSubmitting.value = true
  errorMessage.value = undefined

  try {
    let status: number
    let responseError: string | undefined

    try {
      await $fetch('/api/onboarding/goals', { method: 'POST', body: formData })
      status = 200
    }
    catch (error: unknown) {
      const fetchError = error as { status?: number, data?: { error?: string } }
      status = fetchError.status ?? 400
      responseError = fetchError.data?.error
    }

    if (status === 200) {
      await navigateTo('/onboarding/goals-review')
      return
    }

    if (status === 409) {
      await navigateTo('/onboarding/injuries')
      return
    }

    const errorKey = responseError ?? 'validation_failed'
    errorMessage.value = errorMessages[errorKey] ?? 'Something went wrong. Please try again.'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>
