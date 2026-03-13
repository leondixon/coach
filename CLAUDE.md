# Coach — Project Conventions

## Architecture

This app is an **offline-first PWA** designed to run on mobile devices. SSR is disabled (`ssr: false`) because the app must render entirely client-side so the service worker can serve it without a network connection. There is no server-side rendering — treat this like a native app that happens to run in a browser.

---

## Testing Patterns

### Two test layers, clear separation

| Layer | Tool | Location | What it covers |
|---|---|---|---|
| Server integration | Vitest | `server/**/*.test.ts` | Commands, events, projections — Given/When/Then against real storage |
| Page behaviour | Playwright | `tests/**/*.spec.ts` | User flows: form fills, submits, redirects, error states |

These are separate commands with separate purposes. Server tests run constantly during development for fast feedback. Page flow tests run before commit or in CI. Do not try to consolidate them into a single runner.

---

### Server integration tests (Vitest + Given/When/Then)

Server-side tests verify event-sourcing behaviour: given a history of events, when a command runs, then specific new events are appended (or an error is thrown). These are integration tests — they use real storage, no mocks.

Structure every test as Given / When / Then:

```ts
describe('StartSession command', () => {
  describe('Given no active session exists', () => {
    describe('When the command is executed', () => {
      it('Then a SessionStarted event is appended', async () => {
        // Given — seed events into the store
        // (nothing to seed here — clean state)

        // When
        await startSession({ athleteId: 'athlete_01', planId: 'plan_01' })

        // Then
        const events = await loadEvents('workout-session', sessionId)
        expect(events[0].type).toBe('SessionStarted')
      })
    })
  })

  describe('Given an active session already exists', () => {
    describe('When the command is executed', () => {
      it('Then it throws a session_already_active error', async () => {
        // Given
        await appendEvent('workout-session', existingSessionId, { type: 'SessionStarted', ... })

        // When / Then
        await expect(startSession({ athleteId: 'athlete_01', planId: 'plan_01' })).rejects.toThrow('session_already_active')
      })
    })
  })
})
```

**Rules:**
- Test the behaviour of the system (events appended, projections updated), not internal implementation details
- Each describe block represents one scenario — Given sets up prior state, When executes the command, Then asserts the outcome
- Use real storage (`useStorage()`) — do not mock the event store
- One test file per aggregate or command group

Run with: `pnpm test`

---

### Playwright tests (user flow behaviour)

Playwright tests live in `tests/` and cover complete user flows. **One spec file per flow, not per page.** A multi-step flow (e.g. onboarding) is one spec that walks through the whole journey.

```
tests/
  register.spec.ts     ← standalone registration flow
  onboarding.spec.ts   ← goals → goals-review → injuries → injuries-review → home
```

**Why Playwright and not `@vitest/browser`:** `@vitest/browser` is a component testing tool. Playwright is an E2E tool. They are not interchangeable. For testing multi-step page flows with navigation, middleware, redirects, and API interception, Playwright is the right tool. As a PWA, we will also need to test service worker behaviour and offline scenarios — Playwright handles these, `@vitest/browser` does not.

#### Mocking strategy

Because `ssr: false`, all middleware and API calls happen client-side. `page.route()` can intercept everything.

Every test must mock:
- `**/api/_auth/session` — controls `loggedIn` in the onboarding middleware
- `**/api/onboarding/status` — controls which onboarding step the middleware allows
- The specific action API being tested

Use `**` glob prefix on all route patterns (e.g. `**/api/onboarding/goals`) to match regardless of origin.

For flows where middleware state changes as the user progresses (e.g. confirming goals makes `goalsConfirmed: true`), use a stateful mock object:

```ts
const status = { goalsConfirmed: false, injuriesConfirmed: false, ... }

await page.route('**/api/onboarding/status', route =>
  route.fulfill({ status: 200, body: JSON.stringify({ ...status }) })
)
await page.route('**/api/onboarding/goals/confirm', async route => {
  status.goalsConfirmed = true  // reflects the state change on the server
  await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
})
```

After actions that establish a session (e.g. registration), the app must call `useUserSession().fetch()` before navigating so the middleware sees the updated auth state.

#### Scenarios to cover

- The full happy path from start to finish (walk the whole journey)
- Each meaningful failure: validation errors, duplicate data, skipped steps (409 that fast-forwards)
- Edge cases visible to the user (e.g. AI summary still processing)

#### Rules

- One spec per user flow, not per page
- Find elements by what the user sees: `getByLabel`, `getByRole`, `getByText` — never test IDs
- Assert on visible outcomes: URL changes, error messages, displayed content
- Name tests in plain language: "When X, then Y"

Run with: `pnpm test:e2e` (Playwright starts the dev server automatically).

---

### Vue component logic

Logic belongs inline in `<script setup>`. Only extract when two or more components need the same logic.

| Situation | Where it lives |
|---|---|
| Submit handler used by one page | Inline in `<script setup>` |
| Types used only within one component | Defined locally, not exported |
| Logic shared across 2+ components | `app/composables/` |
| Types shared across 2+ components or server | `shared/` or `server/types/` |

**Do not create:**
- `app/page-logic/` or any equivalent extracted-logic directory
- Vitest unit tests for Vue component behaviour
- Dependency-injection wrappers around `$fetch` just for testability
