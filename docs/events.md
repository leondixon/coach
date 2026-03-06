# Events

All events extend a base schema and are immutable once stored. Events are the single source of truth — all other state is derived.

## Base Event Schema

```typescript
{
  id: string          // ULID — unique event ID
  type: string        // event type slug
  aggregateType: string
  aggregateId: string
  timestamp: string   // ISO 8601
  payload: object     // event-specific data
}
```

---

## ExerciseCatalog Events

### `exercise-registered`
A new exercise is added to the catalog.

```typescript
payload: {
  slug: string                              // e.g., "barbell-bench-press"
  name: string                              // e.g., "Barbell Bench Press"
  muscleActivations: Record<MuscleSlug, number>  // e.g., { pectorals: 55, anterior-deltoid: 25, triceps: 20 }
}
```

### `exercise-updated`
An existing exercise's name or muscle activations are modified.

```typescript
payload: {
  slug: string
  name?: string
  muscleActivations?: Record<MuscleSlug, number>
}
```

### `exercise-removed`
An exercise is removed from the catalog. Historical sets referencing it remain valid.

```typescript
payload: {
  slug: string
}
```

---

## WorkoutSession Events

### `session-started`
A new workout session begins.

```typescript
payload: {
  planId?: string     // ULID of the active TrainingPlan, if following one
  startedAt: string   // ISO 8601
}
```

### `set-logged`
A single set is recorded during an active session.

```typescript
payload: {
  exerciseSlug: string
  weight: number       // in kg
  reps: number
  rpe?: number         // 1-10, rating of perceived exertion
  isWarmup: boolean    // true = excluded from volume calculations
  loggedAt: string     // ISO 8601
}
```

### `set-undone`
The most recently logged set is removed (undo).

```typescript
payload: {
  undoneAt: string     // ISO 8601
}
```

### `side-weakness-flagged`
The user taps a "left/right felt weaker" button for an exercise. Captures lateral imbalance signals without requiring per-set side tracking.

```typescript
payload: {
  exerciseSlug: string
  side: "left" | "right"
  flaggedAt: string    // ISO 8601
}
```

### `session-completed`
The workout is finished normally.

```typescript
payload: {
  completedAt: string  // ISO 8601
}
```

### `session-abandoned`
The workout is abandoned (e.g., user quit early).

```typescript
payload: {
  abandonedAt: string  // ISO 8601
}
```

---

## TrainingPlan Events

### `plan-generation-requested`
The user requests an AI-generated training plan.

```typescript
payload: {
  requestedAt: string  // ISO 8601
  promptContext: {
    goals: string
    experience: string
    injuries: Array<{ bodyRegion: string, description: string, severity: string }>
    currentImbalances: Record<string, number>   // from Imbalances projection
    recentVolume: Record<MuscleSlug, number>    // from MuscleActivation projection
  }
}
```

### `plan-generated`
Gemini successfully returned a plan.

```typescript
payload: {
  generatedAt: string  // ISO 8601
  plan: {
    name: string
    rationale: string
    weeks: number
    sessions: Array<{
      dayOfWeek: number
      focus: string
      exercises: Array<{
        slug: string
        sets: number
        repRange: string       // e.g., "8-12"
        restSeconds: number
      }>
    }>
  }
}
```

### `plan-generation-failed`
Gemini call failed or returned invalid output.

```typescript
payload: {
  failedAt: string     // ISO 8601
  reason: string
}
```

### `plan-activated`
A generated plan becomes the current active plan.

```typescript
payload: {
  activatedAt: string  // ISO 8601
}
```

### `plan-deactivated`
The active plan is deactivated (e.g., replaced by a new one or manually stopped).

```typescript
payload: {
  deactivatedAt: string  // ISO 8601
}
```

---

## UserProfile Events

### `profile-updated`
User preferences or goals are changed.

```typescript
payload: {
  goals?: string
  experience?: string
  injuries?: Array<{ bodyRegion: string, description: string, severity: string }>
}
```

### `imbalance-thresholds-updated`
The sensitivity thresholds for flagging imbalances are adjusted.

```typescript
payload: {
  antagonistRatioPct?: number   // e.g., 15 means flag if >15% difference
  lateralRatioPct?: number      // e.g., 20 means flag if >20% side difference
}
```

---

## CoachCheckIn Events

### `check-in-completed`
A periodic self-assessment is submitted. This is a single-event aggregate — the check-in is created and finalized in one step.

```typescript
payload: {
  completedAt: string  // ISO 8601
  reports: Array<{
    bodyRegion: MuscleSlug
    type: "weakness" | "pain" | "tightness"
    side?: "left" | "right"
    severity: number   // 1-5
    notes?: string
  }>
}
```

---

## Canonical MuscleSlug Values

Front: `pectorals`, `anterior-deltoid`, `medial-deltoid`, `biceps`, `forearms`, `core`, `obliques`, `hip-flexors`, `quadriceps`, `adductors`, `tibialis`

Back: `traps`, `upper-back`, `lats`, `posterior-deltoid`, `triceps`, `lower-back`, `glutes`, `hamstrings`, `calves`

These slugs match the SVG path IDs in the muscle heatmap component.
