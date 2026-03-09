# Onboarding — Remaining Work

The core onboarding backend (events, commands, projections, automations, API routes) is implemented and tested. The items below were started during the build session but not completed, or were added beyond the original scope.

---

## Incomplete / In Progress

### 1. Auth Server Routes (out of scope — not required yet)
Test files exist but implementations do not. Do not implement until login/logout UI is needed.

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`

---

## Extra Projection Routes Added (Beyond Original Scope)

These GET routes were added to support the frontend but were not in `docs/onboarding.md`:

- `GET /api/onboarding/goals-summary` — returns `GoalsSummary` projection for authenticated athlete
- `GET /api/onboarding/injuries-summary` — returns `InjuriesSummary` projection for authenticated athlete
- `GET /api/onboarding/coaching-profile` — returns `AthleteCoachingProfile` projection for authenticated athlete

These are implemented and tested. They can be kept or removed depending on whether the frontend needs them.

---

## Known Issues

### `register.post.ts` test failure
`server/api/auth/register.post.ts` mixes the pure handler logic with the Nitro `defineEventHandler` wrapper, causing the test to fail in Vitest (Nitro globals unavailable). Needs to be split into a pure handler function (testable) and a separate Nitro wrapper, matching the pattern used by the other route files.

### Nitro wiring for all routes
The 6 route handlers exist as pure functions (tested). The Nitro `defineEventHandler` wrappers were being implemented by engineer-3 but may not be complete. Verify each route file exports a proper Nitro handler before deploying.

---

## What Is Complete

- All events: `AthleteRegistered`, `GoalsSubmitted`, `GoalsConfirmed`, `InjuriesSubmitted`, `InjuriesConfirmed`, `OnboardingCompleted`
- All commands: `registerAthlete`, `submitGoals`, `confirmGoals`, `submitInjuries`, `confirmInjuries`
- All projections: `AccountRegistry`, `OnboardingStatus`, `GoalsSummary`, `InjuriesSummary`, `AthleteCoachingProfile`
- AI automations: goals summarisation, injuries summarisation (Google Gemini via `@google/genai`)
- Projection infrastructure: `projection-updater.ts` routes all onboarding events; `rebuild.ts` includes new aggregate types
- Aggregate rehydration: `rehydrateAthleteAccount`, `rehydrateAthleteProfile` in `server/events/aggregate.ts`
- Nitro server plugin: `server/plugins/onboarding.ts` wires automations to events
- 153 server-side tests passing
