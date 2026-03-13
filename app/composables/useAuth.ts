import { ref, computed } from 'vue'

// ─── Types ───

export type CurrentUser = {
  accountId: string
  email: string
}

type AuthResult = { success: true } | { success: false, error: string }

interface AuthDeps {
  fetch: (url: string, options?: Record<string, unknown>) => Promise<unknown>
}

// ─── Factory (testable core) ───

export function createAuth(deps: AuthDeps) {
  const currentUser = ref<CurrentUser | undefined>(undefined)
  const isAuthenticated = computed(() => currentUser.value !== undefined)

  async function refresh(): Promise<void> {
    try {
      const result = await deps.fetch('/api/auth/me') as CurrentUser
      currentUser.value = result
    }
    catch {
      currentUser.value = undefined
    }
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    try {
      const result = await deps.fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      }) as CurrentUser
      currentUser.value = result
      return { success: true }
    }
    catch (error) {
      const fetchError = error as { statusCode?: number, data?: { error?: string } }
      return { success: false, error: fetchError.data?.error ?? 'unknown_error' }
    }
  }

  async function logout(): Promise<void> {
    try {
      await deps.fetch('/api/auth/logout', { method: 'POST' })
    }
    finally {
      currentUser.value = undefined
    }
  }

  return { currentUser, isAuthenticated, refresh, login, logout }
}

// ─── Nuxt composable ───

export function useAuth() {
  return createAuth({ fetch: $fetch })
}
