# Coach — Architecture Documentation

A fitness coaching app that visualizes muscle imbalances via body heatmaps and generates AI workout plans to correct them.

## USP

Most fitness apps track sets and reps. Coach goes further: it projects every logged set onto a muscle activation model, rendering a real-time SVG heatmap of trained volume across your body. When antagonist pairs drift out of balance or one side feels consistently weaker, the app flags it — and can generate a Gemini-powered training plan specifically designed to fix those imbalances.

## Stack

- **Runtime**: Nuxt 4, Nitro server, Vue 3
- **UI**: Nuxt UI v4
- **Validation**: Zod v4
- **AI**: Google Gemini via `@google/genai`
- **Storage**: File-based (fs-lite driver) via Nitro `useStorage()`
- **Architecture**: Event sourcing with file-backed event streams and projections

## Documentation Index

| Document | Description |
|---|---|
| [Aggregates](./aggregates.md) | Aggregate roots, their invariants, and lifecycle |
| [Events](./events.md) | All event types with full payload definitions |
| [Commands](./commands.md) | Command handlers, preconditions, and events produced |
| [Projections](./projections.md) | Read models that power the UI |
| [Flows](./flows.md) | Event flow diagrams for key user journeys |
| [Storage](./storage.md) | File layout, rehydration, rebuild, and concurrency model |
