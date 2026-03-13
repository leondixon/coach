// Stub Nitro/H3 auto-imports that are not available in the Vitest environment.
// These globals are only needed for the default export wrappers, which are not
// called in unit tests (tests invoke the named handler functions directly).

;(global as Record<string, unknown>).defineNitroPlugin = (plugin: unknown) => plugin
;(global as Record<string, unknown>).defineEventHandler = (handler: unknown) => handler
;(global as Record<string, unknown>).readBody = async () => ({})
;(global as Record<string, unknown>).setResponseStatus = () => {}
;(global as Record<string, unknown>).getUserSession = async () => ({ user: undefined })
;(global as Record<string, unknown>).setUserSession = async () => {}
;(global as Record<string, unknown>).useStorage = () => ({
  getItem: async () => undefined,
  setItem: async () => {},
  getKeys: async () => [],
})
;(global as Record<string, unknown>).hashPassword = async (password: string) => `hashed:${password}`
;(global as Record<string, unknown>).useRuntimeConfig = () => ({ geminiApiKey: '' })
;(global as Record<string, unknown>).appendEventAndUpdateProjections = async () => {}

// Stub Nuxt auto-imports used in app/middleware and app/pages logic files.
;(global as Record<string, unknown>).defineNuxtRouteMiddleware = (handler: unknown) => handler
;(global as Record<string, unknown>).navigateTo = (path: string) => path
;(global as Record<string, unknown>).useUserSession = () => ({ loggedIn: { value: false }, user: { value: undefined } })
;(global as Record<string, unknown>).$fetch = async () => ({})
