export interface OnboardingStatus {
  goalsConfirmed: boolean
  injuriesConfirmed: boolean
  experienceLevelAdded: boolean
  onboardingComplete: boolean
}

export function resolveOnboardingRedirect(
  currentPath: string,
  status: OnboardingStatus | undefined,
  isAuthenticated: boolean,
): string | undefined {
  if (!isAuthenticated) {
    if (currentPath === '/register')
      return undefined
    return '/register'
  }

  if (status?.onboardingComplete) {
    if (currentPath === '/home')
      return undefined
    return '/home'
  }

  if (currentPath === '/register' || currentPath === '/') {
    return status?.goalsConfirmed ? '/onboarding/injuries' : '/onboarding/goals'
  }

  if (!status?.goalsConfirmed) {
    if (currentPath === '/onboarding/injuries' || currentPath === '/onboarding/injuries-review') {
      return '/onboarding/goals'
    }
    return undefined
  }

  // Goals confirmed — redirect away from goals pages
  if (currentPath === '/onboarding/goals' || currentPath === '/onboarding/goals-review') {
    return '/onboarding/injuries'
  }

  return undefined
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn } = useUserSession()

  let status: OnboardingStatus | undefined
  if (loggedIn.value) {
    try {
      status = await $fetch<OnboardingStatus>('/api/onboarding/status')
    }
    catch {
      status = undefined
    }
  }

  const redirect = resolveOnboardingRedirect(to.path, status, loggedIn.value)
  if (redirect !== undefined) {
    return navigateTo(redirect)
  }
})
