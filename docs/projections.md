# Projections

Projections are read models derived from events. They are stored as JSON files and rebuilt from scratch by replaying all events when needed. Each projection declares which event types it handles.

## ActiveSession

**File**: `data/local/projections/active-session.json`
**Subscribes to**: `session-started`, `set-logged`, `set-undone`, `side-weakness-flagged`, `session-completed`, `session-abandoned`

The current in-progress workout. `null` when no session is active.

```typescript
{
  sessionId: string
  startedAt: string
  planId?: string
  sets: Array<{
    exerciseSlug: string
    weight: number
    reps: number
    rpe?: number
    isWarmup: boolean
    loggedAt: string
  }>
  weaknessFlags: Array<{
    exerciseSlug: string
    side: "left" | "right"
    flaggedAt: string
  }>
} | null
```

**Update rules**:
- `session-started` → create new active session
- `set-logged` → append to `sets`
- `set-undone` → pop last entry from `sets`
- `side-weakness-flagged` → append to `weaknessFlags`
- `session-completed` / `session-abandoned` → set to `null`

---

## SessionHistory

**File**: `data/local/projections/session-history.json`
**Subscribes to**: `session-started`, `set-logged`, `set-undone`, `session-completed`, `session-abandoned`

List of all completed and abandoned sessions, newest first.

```typescript
Array<{
  sessionId: string
  startedAt: string
  completedAt?: string
  abandonedAt?: string
  status: "completed" | "abandoned"
  setCount: number
  exerciseSlugs: string[]   // unique exercises used
}>
```

---

## MuscleActivation

**File**: `data/local/projections/muscle-activation.json`
**Subscribes to**: `set-logged`, `set-undone`, `session-completed`, `session-abandoned`, `exercise-registered`, `exercise-updated`

Volume per muscle group over time. Powers the SVG body heatmap. Only working sets count — warmup sets (`isWarmup: true`) are excluded.

**Volume formula**: For each working set, distribute `weight * reps` across muscles using the exercise's activation percentages from the ExerciseCatalog.

```typescript
{
  weekly: Record<MuscleSlug, number>    // rolling 7 days
  monthly: Record<MuscleSlug, number>   // rolling 30 days
  allTime: Record<MuscleSlug, number>
  lastUpdated: string
}
```

The heatmap composable (`useMuscleHeatmap`) normalizes these values to a 0-1 scale and maps them to color intensities on the SVG body diagram.

---

## Imbalances

**File**: `data/local/projections/imbalances.json`
**Subscribes to**: `set-logged`, `set-undone`, `session-completed`, `side-weakness-flagged`, `check-in-completed`, `imbalance-thresholds-updated`

Merges objective data (antagonist volume ratios) with subjective data (weakness flags and check-in reports).

```typescript
{
  antagonistPairs: Array<{
    agonist: MuscleSlug
    antagonist: MuscleSlug
    agonistVolume: number
    antagonistVolume: number
    ratioPct: number            // how far off 1:1, as a percentage
    flagged: boolean            // true if ratio exceeds threshold
  }>
  lateralReports: Array<{
    muscle: MuscleSlug
    side: "left" | "right"
    source: "weakness-flag" | "check-in"
    count: number               // how many times flagged
    lastReportedAt: string
  }>
  subjectiveReports: Array<{
    bodyRegion: MuscleSlug
    type: "weakness" | "pain" | "tightness"
    side?: "left" | "right"
    severity: number
    reportedAt: string
  }>
  thresholds: {
    antagonistRatioPct: number
    lateralRatioPct: number
  }
}
```

**Antagonist pairs** (defined in `shared/data/muscle-groups.ts`):
- pectorals / upper-back
- anterior-deltoid / posterior-deltoid
- biceps / triceps
- quadriceps / hamstrings
- core / lower-back
- hip-flexors / glutes
- adductors / abductors
- tibialis / calves

**Lateral muscles** (tracked for left/right balance): biceps, triceps, quadriceps, hamstrings, calves, forearms, glutes, adductors

---

## Progression

**File**: `data/local/projections/progression.json`
**Subscribes to**: `set-logged`, `set-undone`, `session-completed`

Estimated 1RM (e1RM) and total volume per exercise over time. Used for the progress tracking page.

```typescript
Record<ExerciseSlug, Array<{
  sessionId: string
  date: string
  e1rm: number         // Epley formula: weight * (1 + reps / 30)
  totalVolume: number  // sum of weight * reps for all working sets
  topSet: { weight: number, reps: number }
}>>
```

---

## ExerciseCatalogView

**File**: `data/local/projections/exercise-catalog-view.json`
**Subscribes to**: `exercise-registered`, `exercise-updated`, `exercise-removed`

Flat lookup of the current exercise library. Used by command handlers to validate exercise slugs and by the UI for exercise selection.

```typescript
Record<ExerciseSlug, {
  name: string
  slug: string
  muscleActivations: Record<MuscleSlug, number>
}>
```

---

## ActivePlan

**File**: `data/local/projections/active-plan.json`
**Subscribes to**: `plan-generation-requested`, `plan-generated`, `plan-generation-failed`, `plan-activated`, `plan-deactivated`

The currently active training plan. `null` when no plan is active.

```typescript
{
  planId: string
  activatedAt: string
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
        repRange: string
        restSeconds: number
      }>
    }>
  }
} | null
```
