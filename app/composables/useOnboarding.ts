import { ref } from 'vue'

// ─── Types ───

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export type OnboardingStatus = {
  goalsConfirmed: boolean
  injuriesConfirmed: boolean
  experienceLevelAdded: boolean
  onboardingComplete: boolean
}

export type SummarisedGoal = {
  description: string
  targetAreas: string[]
  priority: 1 | 2 | 3 | 4 | 5
}

export type GoalsSummary = {
  goals: string
  summarisedGoals?: SummarisedGoal[]
  summary?: string
  status: 'pending' | 'confirmed'
}

export type SummarisedInjuries = {
  affectedAreas: string[]
  restrictions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  summary: string
}

export type InjuriesSummary = {
  injuries: string
  summarisedInjuries?: SummarisedInjuries
  status: 'pending' | 'confirmed'
}

type ActionResult = { success: true } | { success: false, error: string }

interface OnboardingDeps {
  fetch: (url: string, options?: Record<string, unknown>) => Promise<unknown>
}

// ─── Defaults ───

const defaultOnboardingStatus: OnboardingStatus = {
  goalsConfirmed: false,
  injuriesConfirmed: false,
  experienceLevelAdded: false,
  onboardingComplete: false,
}

// ─── Error extraction ───

function extractError(error: unknown): string {
  const fetchError = error as { data?: { error?: string } }
  return fetchError.data?.error ?? 'unknown_error'
}

// ─── Factory (testable core) ───

export function createOnboarding(deps: OnboardingDeps) {
  const status = ref<OnboardingStatus>({ ...defaultOnboardingStatus })
  const goalsSummary = ref<GoalsSummary | undefined>(undefined)
  const injuriesSummary = ref<InjuriesSummary | undefined>(undefined)

  const isSubmittingGoals = ref(false)
  const isConfirmingGoals = ref(false)
  const isSubmittingInjuries = ref(false)
  const isConfirmingInjuries = ref(false)

  async function fetchStatus(): Promise<void> {
    try {
      const result = await deps.fetch('/api/onboarding/status') as OnboardingStatus
      status.value = result
    }
    catch {
      // leave status unchanged on error
    }
  }

  async function fetchGoalsSummary(): Promise<void> {
    try {
      const result = await deps.fetch('/api/onboarding/goals-summary') as GoalsSummary
      goalsSummary.value = result
    }
    catch {
      goalsSummary.value = undefined
    }
  }

  async function fetchInjuriesSummary(): Promise<void> {
    try {
      const result = await deps.fetch('/api/onboarding/injuries-summary') as InjuriesSummary
      injuriesSummary.value = result
    }
    catch {
      injuriesSummary.value = undefined
    }
  }

  async function submitGoals(goals: string, experienceLevel: ExperienceLevel): Promise<ActionResult> {
    isSubmittingGoals.value = true
    try {
      await deps.fetch('/api/onboarding/goals', {
        method: 'POST',
        body: { goals, experienceLevel },
      })
      await fetchStatus()
      return { success: true }
    }
    catch (error) {
      return { success: false, error: extractError(error) }
    }
    finally {
      isSubmittingGoals.value = false
    }
  }

  async function confirmGoals(): Promise<ActionResult> {
    isConfirmingGoals.value = true
    try {
      await deps.fetch('/api/onboarding/goals/confirm', { method: 'POST' })
      await fetchStatus()
      return { success: true }
    }
    catch (error) {
      return { success: false, error: extractError(error) }
    }
    finally {
      isConfirmingGoals.value = false
    }
  }

  async function submitInjuries(injuries: string): Promise<ActionResult> {
    isSubmittingInjuries.value = true
    try {
      await deps.fetch('/api/onboarding/injuries', {
        method: 'POST',
        body: { injuries },
      })
      await fetchStatus()
      return { success: true }
    }
    catch (error) {
      return { success: false, error: extractError(error) }
    }
    finally {
      isSubmittingInjuries.value = false
    }
  }

  async function confirmInjuries(): Promise<ActionResult> {
    isConfirmingInjuries.value = true
    try {
      await deps.fetch('/api/onboarding/injuries/confirm', { method: 'POST' })
      await fetchStatus()
      return { success: true }
    }
    catch (error) {
      return { success: false, error: extractError(error) }
    }
    finally {
      isConfirmingInjuries.value = false
    }
  }

  return {
    status,
    goalsSummary,
    injuriesSummary,
    isSubmittingGoals,
    isConfirmingGoals,
    isSubmittingInjuries,
    isConfirmingInjuries,
    fetchStatus,
    fetchGoalsSummary,
    fetchInjuriesSummary,
    submitGoals,
    confirmGoals,
    submitInjuries,
    confirmInjuries,
  }
}

// ─── Nuxt composable ───

export function useOnboarding() {
  return createOnboarding({ fetch: $fetch })
}
