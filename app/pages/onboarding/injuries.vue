<template>
  <div class="max-w-2xl mx-auto mt-12">
    <div class="mb-8">
      <h1 class="text-3xl font-semibold mb-2">Any injuries or physical limitations?</h1>
      <p class="text-gray-500">Tell us about any injuries, pain, or physical restrictions so we can tailor your plan safely. If you have none, write "none".</p>
    </div>

    <UCard>
      <form class="space-y-6" @submit.prevent="submit">
        <UFormField label="Injuries and limitations" required>
          <UTextarea
            v-model="formData.injuries"
            placeholder="e.g. I have mild lower back pain and a previous knee injury from running. No upper body restrictions."
            :rows="5"
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
          Submit injuries
        </UButton>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'minimal', middleware: 'onboarding' })

interface InjuriesFormData {
  injuries: string
}

const formData = reactive<InjuriesFormData>({
  injuries: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | undefined>(undefined)

const errorMessages: Record<string, string> = {
  injuries_required: 'Please describe any injuries or write "none".',
}

async function submit() {
  isSubmitting.value = true
  errorMessage.value = undefined

  try {
    let status: number
    let responseError: string | undefined

    try {
      await $fetch('/api/onboarding/injuries', { method: 'POST', body: formData })
      status = 200
    }
    catch (error: unknown) {
      const fetchError = error as { status?: number, data?: { error?: string } }
      status = fetchError.status ?? 400
      responseError = fetchError.data?.error
    }

    if (status === 200) {
      await navigateTo('/onboarding/injuries-review')
      return
    }

    if (status === 409) {
      await navigateTo('/home')
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
