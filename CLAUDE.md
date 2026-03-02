# Coach — AI Workout App

## Project Overview

A mobile-first PWA workout app built with Nuxt 4. Users log their workout results (reps/weight per set), while AI generates personalised training plans and tracks muscle imbalances across compound and isolation exercises to surface weaknesses and guide programming.

## Tech Stack

- **Framework**: Nuxt 4
- **UI**: Nuxt UI v4 — use `UCard`, `UButton`, `UInputNumber`, `UCheckbox`, `UModal`, `UBadge` etc. wherever possible before reaching for raw HTML
- **Styling**: Tailwind CSS v4 (utility-first, mobile-first breakpoints)
- **Validation**: Zod v4 — schemas live in `shared/schemas/` (shared client/server) and `server/schemas/` (server-only)
- **AI**: Google Gemini via `@google/genai` (`gemini-2.5-flash` is the current production model — prefer this over preview models)
- **Storage**: Nitro `fs-lite` driver under `data/local/` for persisting workout results and plans
- **Package manager**: pnpm

## Architecture

```
app/
  pages/         # Nuxt file-based routing
  components/    # Vue components
  assets/css/    # main.css — imports Tailwind + Nuxt UI
server/
  api/           # Nitro API routes
  schemas/       # Server-only Zod schemas
  utils/         # Shared server utilities (e.g. getAIClient)
shared/
  schemas/       # Zod schemas shared between client and server
data/
  fullbody.json  # Static workout template (exercises + sets)
  local/         # Runtime storage (gitignored workout logs, plans)
```

## Data Model

Training is structured as a hierarchy:

```
Macrocycle (overall plan — weeks/months)
  └── Mesocycle (phase — e.g. "Rehab Phase", "Strength Block")
        └── Microcycle (single week)
              └── Exercise { name, repetitions, sets, restTime, tips }
```

Schemas are defined in `server/schemas/workout.ts` (`macrocycleSchema`, `mesocycleSchema`, `microcycleSchema`).

The shared workout schema in `shared/schemas/workout.ts` covers the session-level logging model:

```
Workout (array of Exercise)
  └── Exercise { name, sets[] }
        └── Set { reps, weight (kg | "bodyweight"), warmup? }
```

## AI Integration

- Client: `server/utils/getAIClient.ts` — singleton `GoogleGenAI`, key from `runtimeConfig.geminiApiKey` (env: `GEMINI_API_KEY`)
- Always request structured JSON responses using `responseMimeType: 'application/json'` and `responseJsonSchema` from the relevant Zod schema's `.toJSONSchema()`
- Macrocycle generation: `server/api/generate-macrocycle.ts`
- Workout creation from a macrocycle: `server/api/create-workout.ts`

## Core Product Goals

1. **Workout logging** — users record actual reps/weight achieved per set during a session
2. **AI plan generation** — Gemini generates macrocycles based on the user's goals, injuries, schedule, and history
3. **Muscle imbalance tracking** — compare isolation vs compound exercise performance to identify imbalanced muscle groups (e.g. weak left vs right, push vs pull ratio, hip flexor vs glute strength). Weight each exercise with a muscle group mapping and surface insights to the user
4. **Progressive overload tracking** — store session history to recommend weight/rep progressions

## Conventions

- Explicit naming - use naming like exerciseIndex instead of 'i' and do not shorten naming.
- *Null usage* - never used null, only use undefined for representation of no value if possible
- **Mobile-first always** — design for 375px+ screens; use `UCard` for card layouts, grid columns with fixed widths for tabular data (e.g. `grid-cols-[2rem_1fr_7rem_3rem]`)
- **Nuxt UI components first** — reach for `UCard`, `UButton`, `UInputNumber`, `UModal`, `UBadge`, `UTable` before writing custom markup
- **Zod for all data boundaries** — validate all API request bodies and AI responses with Zod schemas
- **Composables for state** — workout session state (reps achieved, completion) should live in composables, not scattered across components
- **Nitro storage** — use `useStorage().setItem / getItem` with the `local:` prefix for persisting data
