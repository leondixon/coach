# Aggregates

An aggregate is a consistency boundary. Each aggregate enforces its own invariants and emits events when state changes. Aggregates are rehydrated from their event stream before processing any command.

## ExerciseCatalog (singleton)

**Aggregate ID**: `exercise-catalog`

The canonical library of exercises and their muscle activation percentages. Seeded on server startup with 50+ exercises via a Nitro plugin.

**State**:
- `exercises`: Map of exercise slug to `{ name, slug, muscleActivations: Record<MuscleSlug, number> }`

**Invariants**:
- Exercise slugs must be unique
- Muscle activation percentages must sum to approximately 100% per exercise
- Muscle slugs must be from the canonical set (see [Storage](./storage.md))

**Lifecycle**: Created once at startup seed. Exercises can be added, updated, or removed at any time.

---

## WorkoutSession (per session)

**Aggregate ID**: ULID (e.g., `01HX3K...`)

Tracks a single workout from start to completion or abandonment.

**State**:
- `status`: `active` | `completed` | `abandoned`
- `startedAt`: ISO timestamp
- `completedAt`: ISO timestamp (if finished)
- `planId`: optional ULID linking to a TrainingPlan
- `sets`: array of `{ exerciseSlug, weight, reps, rpe, isWarmup, loggedAt }`
- `weaknessFlags`: array of `{ exerciseSlug, side: 'left' | 'right', flaggedAt }`

**Invariants**:
- Sets can only be logged while status is `active`
- Cannot complete or abandon an already-finished session
- Undo can only remove the most recently logged set
- Weakness flags can only be added while status is `active`

**Lifecycle**: `session-started` → (log sets, flag weaknesses) → `session-completed` | `session-abandoned`

---

## TrainingPlan (per plan)

**Aggregate ID**: ULID

Represents an AI-generated training plan. Only one plan can be active at a time (enforced at the command level, not within this aggregate).

**State**:
- `status`: `pending` | `generated` | `failed` | `active` | `inactive`
- `requestedAt`: ISO timestamp
- `generatedAt`: ISO timestamp (if generated)
- `plan`: the generated plan payload (exercises, schedule, rationale)
- `prompt`: the prompt context sent to Gemini

**Invariants**:
- Can only activate a plan that is in `generated` or `inactive` status
- Can only deactivate an `active` plan
- Generation result (success or failure) can only be recorded for a `pending` plan

**Lifecycle**: `plan-generation-requested` → `plan-generated` | `plan-generation-failed` → `plan-activated` ↔ `plan-deactivated`

---

## UserProfile (singleton)

**Aggregate ID**: `user-profile`

User preferences, goals, and configuration. Feeds into AI plan generation prompts.

**State**:
- `goals`: string (e.g., "hypertrophy", "strength", "general fitness")
- `experience`: string (e.g., "beginner", "intermediate", "advanced")
- `injuries`: array of `{ bodyRegion, description, severity }`
- `imbalanceThresholds`: `{ antagonistRatioPct, lateralRatioPct }` — how far out of balance before flagging

**Invariants**:
- Threshold percentages must be positive numbers

**Lifecycle**: Created on first `profile-updated` event. Updated at any time.

---

## CoachCheckIn (per check-in)

**Aggregate ID**: ULID

A periodic self-assessment where the user reports subjective feelings about their body — pain, tightness, weakness by region. This data enriches the Imbalances projection with information that can't be captured from set logging alone.

**State**:
- `completedAt`: ISO timestamp
- `reports`: array of `{ bodyRegion: MuscleSlug, type: 'weakness' | 'pain' | 'tightness', side?: 'left' | 'right', severity: 1-5, notes?: string }`

**Invariants**:
- A check-in is immutable once completed (single-event aggregate)
- Body regions must be valid muscle slugs
- Severity must be 1-5

**Lifecycle**: `check-in-completed` (single event, created and finalized in one step)
