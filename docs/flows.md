# Event Flows

Key user journeys traced through commands, events, and projections.

## Workout Session Flow

```
User taps "Start Workout"
  │
  ▼
StartSession command
  ├─ checks: ActiveSession projection is null
  ├─ emits: session-started
  └─ updates: ActiveSession (creates session)
  │
  ▼
User logs sets (repeats)
  │
  ▼
LogSet command
  ├─ checks: session is active, exercise slug valid
  ├─ emits: set-logged
  └─ updates: ActiveSession, MuscleActivation*, Progression*, SessionHistory*
  │
  ├── (optional) User taps "Left felt weaker"
  │     │
  │     ▼
  │   FlagSideWeakness command
  │     ├─ emits: side-weakness-flagged
  │     └─ updates: ActiveSession, Imbalances
  │
  ├── (optional) User taps "Undo"
  │     │
  │     ▼
  │   UndoSet command
  │     ├─ emits: set-undone
  │     └─ updates: ActiveSession, MuscleActivation*, Progression*
  │
  ▼
User taps "Finish Workout"
  │
  ▼
CompleteSession command
  ├─ emits: session-completed
  └─ updates: ActiveSession (→ null), SessionHistory, MuscleActivation, Imbalances, Progression

* MuscleActivation and Progression may defer final calculation until session-completed
```

## AI Plan Generation Flow

```
User opens plan generator
  │
  ▼
Frontend gathers context:
  ├─ UserProfile (goals, experience, injuries)
  ├─ MuscleActivation projection (recent volume)
  └─ Imbalances projection (current imbalances)
  │
  ▼
RequestPlanGeneration command
  ├─ emits: plan-generation-requested (includes prompt context)
  └─ updates: (no projection changes yet)
  │
  ▼
Server calls Gemini API (async)
  │
  ├── Success ──────────────────────────┐
  │                                     ▼
  │                          RecordPlanGenerated command
  │                            ├─ emits: plan-generated
  │                            └─ updates: (plan stored, not yet active)
  │                                     │
  │                                     ▼
  │                          User reviews plan, taps "Activate"
  │                                     │
  │                                     ▼
  │                          ActivatePlan command
  │                            ├─ checks: no other active plan (ActivePlan projection)
  │                            ├─ emits: plan-activated
  │                            └─ updates: ActivePlan
  │
  └── Failure ──────────────────────────┐
                                        ▼
                             RecordPlanFailed command
                               ├─ emits: plan-generation-failed
                               └─ updates: (no projection changes)
```

## Undo Set Flow

```
User taps "Undo" on last set
  │
  ▼
UndoSet command
  ├─ checks: session is active, sets.length > 0
  ├─ emits: set-undone
  └─ projection updates:
       ActiveSession → pops last set from array
       MuscleActivation → recalculated (subtract undone set's contribution)
       Progression → recalculated
```

## Coach Check-In Flow

```
User opens periodic check-in form
  │
  ▼
UI presents body region selector
  ├─ User selects regions and reports:
  │    weakness / pain / tightness
  │    optional side (left / right)
  │    severity (1-5)
  │    optional notes
  │
  ▼
CompleteCoachCheckIn command
  ├─ validates: all body regions are valid muscle slugs, severity 1-5
  ├─ emits: check-in-completed
  └─ updates: Imbalances (merges subjective reports)
```

## Projection Update Pipeline

When an event is appended to the store, the projection updater routes it to all subscribed projections:

```
Event appended
  │
  ▼
ProjectionUpdater.handle(event)
  │
  ├─ looks up event.type in routing table
  ├─ for each subscribed projection:
  │    ├─ load current projection state from disk
  │    ├─ apply update function(state, event) → new state
  │    └─ write new state to disk
  │
  ▼
Done (projections are now consistent with the new event)
```

### Event Routing Table

| Event Type | Projections Updated |
|---|---|
| `exercise-registered` | ExerciseCatalogView, MuscleActivation |
| `exercise-updated` | ExerciseCatalogView, MuscleActivation |
| `exercise-removed` | ExerciseCatalogView |
| `session-started` | ActiveSession, SessionHistory |
| `set-logged` | ActiveSession, MuscleActivation, Progression, SessionHistory, Imbalances |
| `set-undone` | ActiveSession, MuscleActivation, Progression, SessionHistory, Imbalances |
| `side-weakness-flagged` | ActiveSession, Imbalances |
| `session-completed` | ActiveSession, SessionHistory, MuscleActivation, Imbalances, Progression |
| `session-abandoned` | ActiveSession, SessionHistory, MuscleActivation |
| `plan-generation-requested` | ActivePlan |
| `plan-generated` | ActivePlan |
| `plan-generation-failed` | ActivePlan |
| `plan-activated` | ActivePlan |
| `plan-deactivated` | ActivePlan |
| `profile-updated` | (none — read directly from aggregate) |
| `imbalance-thresholds-updated` | Imbalances |
| `check-in-completed` | Imbalances |
