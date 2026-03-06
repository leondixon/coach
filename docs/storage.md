# Storage Strategy

All persistence uses Nitro's `useStorage()` with the `local:` prefix, which maps to the `data/local/` directory via the fs-lite driver. No database required.

## File Layout

```
data/local/
├── events/
│   ├── exercise-catalog/
│   │   └── exercise-catalog.json      # singleton aggregate
│   ├── workout-session/
│   │   ├── 01HX3K...json              # one file per session (ULID)
│   │   ├── 01HX4M...json
│   │   └── ...
│   ├── training-plan/
│   │   ├── 01HX5N...json
│   │   └── ...
│   ├── user-profile/
│   │   └── user-profile.json          # singleton aggregate
│   └── coach-check-in/
│       ├── 01HX6P...json
│       └── ...
├── projections/
│   ├── active-session.json
│   ├── session-history.json
│   ├── muscle-activation.json
│   ├── imbalances.json
│   ├── progression.json
│   ├── exercise-catalog-view.json
│   └── active-plan.json
└── workout-results.json               # legacy file (pre-event-sourcing)
```

## Event Storage Format

Each aggregate instance stores its events as a JSON array, ordered by timestamp:

```json
[
  {
    "id": "01HX3K...",
    "type": "session-started",
    "aggregateType": "workout-session",
    "aggregateId": "01HX3K...",
    "timestamp": "2026-03-06T10:00:00.000Z",
    "payload": { "startedAt": "2026-03-06T10:00:00.000Z" }
  },
  {
    "id": "01HX3K...",
    "type": "set-logged",
    "aggregateType": "workout-session",
    "aggregateId": "01HX3K...",
    "timestamp": "2026-03-06T10:05:00.000Z",
    "payload": { "exerciseSlug": "barbell-bench-press", "weight": 80, "reps": 8, "isWarmup": false, "loggedAt": "2026-03-06T10:05:00.000Z" }
  }
]
```

## Key Operations

### Append Event

```
appendEvent(aggregateType, aggregateId, event)
  1. Read existing events array from data/local/events/{aggregateType}/{aggregateId}.json
  2. Push new event onto array
  3. Write array back to file
  4. Pass event to ProjectionUpdater
```

### Load Events (for rehydration)

```
loadEvents(aggregateType, aggregateId) → Event[]
  1. Read data/local/events/{aggregateType}/{aggregateId}.json
  2. Return parsed array (or empty array if file doesn't exist)
```

### Load All Events for Type (for projection rebuild)

```
loadAllEventsForType(aggregateType) → Event[]
  1. List all files in data/local/events/{aggregateType}/
  2. Read and parse each file
  3. Merge all events into a single array
  4. Sort by timestamp
  5. Return
```

## Aggregate Rehydration

Before processing any command, the aggregate is rebuilt from its events:

```
rehydrate(aggregateType, aggregateId) → AggregateState
  1. events = loadEvents(aggregateType, aggregateId)
  2. state = initialState()
  3. for each event in events:
       state = applyEvent(state, event)
  4. return state
```

Each aggregate type defines its own `applyEvent` function that folds events into state.

## Projection Rebuild

All projections can be rebuilt from scratch via `POST /api/admin/rebuild-projections`:

```
rebuildAllProjections()
  1. Clear all projection files (reset to initial state)
  2. For each aggregate type:
       events = loadAllEventsForType(aggregateType)
  3. Merge all events across all types, sort by timestamp
  4. For each event in global order:
       ProjectionUpdater.handle(event)
  5. All projections are now consistent with the full event history
```

This is safe to run at any time and is idempotent.

## ULID Generation

Aggregate IDs and event IDs use ULIDs (Universally Unique Lexicographically Sortable Identifiers). Generated via `server/utils/ulid.ts`, which is auto-imported in Nitro server context.

Properties:
- Time-sortable (encodes millisecond timestamp)
- Unique without coordination
- 26-character Crockford Base32 string

## Concurrency Model

The app runs as a single Node.js process serving one user. This means:
- No concurrent writes to the same aggregate — requests are serialized by the event loop
- No need for optimistic concurrency control or event version numbers
- Projection updates are synchronous after event append — no eventual consistency lag
- File reads/writes via `useStorage()` are atomic at the single-process level

If the app ever needs to support multiple concurrent users, the storage layer would need:
1. Optimistic concurrency (version numbers on event streams)
2. A proper database backend instead of flat files
3. Async projection updates with eventual consistency guarantees
