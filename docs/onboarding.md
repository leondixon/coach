# Onboarding Flow

The onboarding flow covers everything from an athlete registering an account through to completing their coaching profile. Once complete, the athlete is ready for plan generation.

## Overview

```
[Register Page] → RegisterAthlete → AthleteRegistered
[Goals Page]    → SubmitGoals + AddExperienceLevel → GoalsSubmitted + ExperienceLevelAdded
                → [AI Automation] → ConfirmGoals → GoalsConfirmed
[Injury Form]   → SubmitInjuries → InjuriesSubmitted → [AI Automation] → ConfirmInjuries → InjuriesConfirmed
[Automation: GoalsConfirmed + InjuriesConfirmed + ExperienceLevelAdded] → OnboardingCompleted
```

---

## Auth

Auth is a separate domain and is **not** part of the coaching domain event store. Credentials (password hashes, OAuth tokens) are managed by `nuxt-auth-utils` in its own storage.

The `POST /api/auth/register` endpoint orchestrates:
1. Create credential via auth library — if this fails, return error and stop
2. Fire `AthleteRegistered` into the coaching domain event store — only if step 1 succeeded

This ensures the coaching domain only ever sees fully registered athletes who can log in. Credentials never appear in the domain event log.

---

## Identity

All account types (athlete, admin, future types) share a universal `accountId` (ULID). The aggregate type determines what kind of account it is. IDs are globally unique across all account types.

```
events/AthleteAccount/{accountId}.json
events/AdminAccount/{accountId}.json
events/AthleteProfile/{accountId}.json
```

---

## Aggregates

### `AthleteAccount`
Owns identity and account lifecycle. Keyed by `accountId`.

Events:
- `AthleteRegistered`

### `AthleteProfile`
Owns all training-related information about an athlete. Keyed by `accountId`.

Events:
- `GoalsSubmitted`
- `GoalsConfirmed`
- `ExperienceLevelAdded`
- `InjuriesSubmitted`
- `InjuriesConfirmed`
- `OnboardingCompleted`

---

## Event Contracts

### `AthleteRegistered`
Aggregate: `AthleteAccount`

```ts
{
  accountId: string        // ULID
  firstName: string
  lastName: string
  email: string
  registeredAt: string     // ISO timestamp
}
```

---

### `GoalsSubmitted`
Aggregate: `AthleteProfile`

```ts
{
  accountId: string
  goals: string            // free text entered by the athlete
  submittedAt: string
}
```

---

### `GoalsConfirmed`
Aggregate: `AthleteProfile`

```ts
{
  accountId: string
  goals: string            // original free text input
  summarisedGoals: {
    description: string    // e.g. "build muscle", "improve cardiovascular fitness"
    targetAreas: string[]  // muscle groups or body areas
    priority: 1 | 2 | 3 | 4 | 5  // 1 = lowest, 5 = highest
  }[]
  summary: string          // human-readable paragraph covering overall training direction
  confirmedAt: string
}
```

---

### `ExperienceLevelAdded`
Aggregate: `AthleteProfile`

```ts
{
  accountId: string
  experienceLevel: "beginner" | "intermediate" | "advanced"
  addedAt: string
}
```

---

### `InjuriesSubmitted`
Aggregate: `AthleteProfile`

```ts
{
  accountId: string
  injuries: string         // free text entered by the athlete
  submittedAt: string
}
```

---

### `InjuriesConfirmed`
Aggregate: `AthleteProfile`

```ts
{
  accountId: string
  injuries: string         // original free text input
  summarisedInjuries: {
    affectedAreas: string[]
    restrictions: string[] // movements to avoid
    severity: "mild" | "moderate" | "severe"
    summary: string
  }
  confirmedAt: string
}
```

---

### `OnboardingCompleted`
Aggregate: `AthleteProfile`

```ts
{
  accountId: string
  completedAt: string
}
```

---

## AI Automations

AI automations react to submitted events and update read models. Google Gemini (`@google/genai`) is used via `runtimeConfig.geminiApiKey`.

### Goals Summarisation
- **Trigger:** `GoalsSubmitted`
- **Reads:** `goals` free text
- **Produces:** structured goals for `GoalsSummary` read model
- **Output shape:** `{ description, targetAreas, priority }[]` plus top-level `summary`
- Constraints: 1–5 goals, priority 1–5 (non-unique allowed), at least one targetArea per goal

### Injuries Summarisation
- **Trigger:** `InjuriesSubmitted`
- **Reads:** `injuries` free text
- **Produces:** structured injuries for `InjuriesSummary` read model
- **Output shape:** `{ affectedAreas, restrictions, severity, summary }`

Automations run synchronously within the Nitro server process. Nitro hooks can be introduced to decouple them if AI latency becomes a UX concern.

---

## Projections

### `AccountRegistry`
Cross-aggregate identity lookup. Kept narrow — identity and account type only, no coaching data.

```ts
{
  [accountId]: {
    accountType: "athlete" | "admin"
    email: string
    fullName: string
  }
}
```

Built from: `AthleteRegistered`, `AdminCreated`

---

### `OnboardingStatus`
Tracks whether an athlete has completed onboarding. Used by the frontend to gate access to the main app.

```ts
{
  [accountId]: {
    goalsConfirmed: boolean
    injuriesConfirmed: boolean
    experienceLevelAdded: boolean
    onboardingComplete: boolean
  }
}
```

Built from: `GoalsConfirmed`, `InjuriesConfirmed`, `ExperienceLevelAdded`, `OnboardingCompleted`

`OnboardingCompleted` fires when all three prerequisites are met: `GoalsConfirmed`, `InjuriesConfirmed`, and `ExperienceLevelAdded`.

---

### `GoalsSummary`
Read model produced by the AI goals automation. Displayed on the goals review screen for the athlete to confirm.

```ts
{
  [accountId]: {
    goals: string
    summarisedGoals: {
      description: string
      targetAreas: string[]
      priority: 1 | 2 | 3 | 4 | 5
    }[]
    summary: string
    status: "pending" | "confirmed"
  }
}
```

Built from: `GoalsSubmitted` (via AI automation), `GoalsConfirmed`

---

### `InjuriesSummary`
Read model produced by the AI injuries automation. Displayed on the injuries review screen for the athlete to confirm.

```ts
{
  [accountId]: {
    injuries: string
    summarisedInjuries: {
      affectedAreas: string[]
      restrictions: string[]
      severity: "mild" | "moderate" | "severe"
      summary: string
    }
    status: "pending" | "confirmed"
  }
}
```

Built from: `InjuriesSubmitted` (via AI automation), `InjuriesConfirmed`

---

### `AthleteCoachingProfile`
The complete coaching context for an athlete, used by the plan generation flow. Populated as onboarding events are confirmed.

```ts
{
  [accountId]: {
    firstName: string
    lastName: string
    experienceLevel: "beginner" | "intermediate" | "advanced"
    summarisedGoals: {
      description: string
      targetAreas: string[]
      priority: 1 | 2 | 3 | 4 | 5
    }[]
    summary: string
    summarisedInjuries: {
      affectedAreas: string[]
      restrictions: string[]
      severity: "mild" | "moderate" | "severe"
      summary: string
    }
    onboardingComplete: boolean
  }
}
```

Built from: `AthleteRegistered`, `ExperienceLevelAdded`, `GoalsConfirmed`, `InjuriesConfirmed`, `OnboardingCompleted`
