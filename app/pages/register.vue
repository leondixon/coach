<script setup lang="ts">
definePageMeta({ middleware: 'onboarding' })

interface RegistrationFormData {
  firstName: string
  lastName: string
  email: string
  password: string
}

const formData = reactive<RegistrationFormData>({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | undefined>(undefined)

const errorMessages: Record<string, string> = {
  email_already_taken: 'An account with this email already exists.',
  validation_failed: 'Please check all fields and try again.',
}

async function submit() {
  isSubmitting.value = true
  errorMessage.value = undefined

  try {
    let status: number

    try {
      await $fetch('/api/auth/register', { method: 'POST', body: formData })
      status = 201
    }
    catch (error: unknown) {
      status = (error as { status?: number }).status ?? 400
    }

    if (status === 201) {
      const { fetch: refreshSession } = useUserSession()
      await refreshSession()
      await navigateTo('/onboarding/goals')
      return
    }

    if (status === 409) {
      errorMessage.value = errorMessages.email_already_taken
      return
    }

    errorMessage.value = errorMessages.validation_failed
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-16">
    <UCard>
      <template #header>
        <h1 class="text-2xl font-semibold">
          Create your account
        </h1>
      </template>

      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="First name" required>
          <UInput v-model="formData.firstName" placeholder="Ada" autocomplete="given-name" :disabled="isSubmitting" />
        </UFormField>

        <UFormField label="Last name" required>
          <UInput v-model="formData.lastName" placeholder="Lovelace" autocomplete="family-name"
            :disabled="isSubmitting" />
        </UFormField>

        <UFormField label="Email" required>
          <UInput v-model="formData.email" type="email" placeholder="ada@example.com" autocomplete="email"
            :disabled="isSubmitting" />
        </UFormField>

        <UFormField label="Password" required>
          <UInput v-model="formData.password" type="password" placeholder="••••••••" autocomplete="new-password"
            :disabled="isSubmitting" />
        </UFormField>

        <UAlert v-if="errorMessage" color="error" :description="errorMessage" icon="i-lucide-alert-circle" />

        <UButton type="submit" block :loading="isSubmitting">
          Create account
        </UButton>
      </form>
    </UCard>
  </div>
</template>
