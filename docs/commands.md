# Commands

Commands validate preconditions, then append events to the target aggregate's event stream. Each command handler rehydrates the aggregate from its events before checking invariants.

## Command Reference

| Command | Aggregate | Events Produced | Preconditions |
|---|---|---|---|
| RegisterExercise | ExerciseCatalog | `exercise-registered` | Slug not already registered |
| UpdateExercise | ExerciseCatalog | `exercise-updated` | Slug exists in catalog |
| RemoveExercise | ExerciseCatalog | `exercise-removed` | Slug exists in catalog |
| StartSession | WorkoutSession | `session-started` | No other active session (checked via ActiveSession projection) |
| LogSet | WorkoutSession | `set-logged` | Session is `active`; exercise slug exists in catalog |
| UndoSet | WorkoutSession | `set-undone` | Session is `active`; at least one set logged |
| FlagSideWeakness | WorkoutSession | `side-weakness-flagged` | Session is `active`; exercise slug exists in catalog |
| CompleteSession | WorkoutSession | `session-completed` | Session is `active` |
| AbandonSession | WorkoutSession | `session-abandoned` | Session is `active` |
| RequestPlanGeneration | TrainingPlan | `plan-generation-requested` | (none — always allowed) |
| RecordPlanGenerated | TrainingPlan | `plan-generated` | Plan status is `pending` |
| RecordPlanFailed | TrainingPlan | `plan-generation-failed` | Plan status is `pending` |
| ActivatePlan | TrainingPlan | `plan-activated` | Plan status is `generated` or `inactive`; no other active plan (checked via ActivePlan projection) |
| DeactivatePlan | TrainingPlan | `plan-deactivated` | Plan status is `active` |
| UpdateProfile | UserProfile | `profile-updated` | (none — always allowed) |
| UpdateImbalanceThresholds | UserProfile | `imbalance-thresholds-updated` | Threshold values are positive numbers |
| CompleteCoachCheckIn | CoachCheckIn | `check-in-completed` | All body regions are valid muscle slugs; severity values are 1-5 |

## Command Flow

```
HTTP Request
  → API Route
    → Command Handler
      → rehydrate aggregate from event stream
      → validate preconditions against current state
      → append event(s) to store
      → trigger projection updates
    → return result
```

## Cross-Aggregate Checks

Some commands check state across aggregates by reading projections:

- **StartSession** reads the `ActiveSession` projection to ensure no concurrent session
- **ActivatePlan** reads the `ActivePlan` projection to ensure only one active plan
- **LogSet** reads the `ExerciseCatalogView` projection to validate the exercise slug

These are eventually-consistent checks — acceptable because the app is single-user, single-threaded.
