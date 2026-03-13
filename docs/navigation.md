# Navigation & App Shell

Defines the app shell, layout strategy, and bottom navigation for authenticated athletes. Unauthenticated and non-onboarded users see no navigation — they follow the linear onboarding journey instead.

---

## Layout Strategy

The app has two distinct shells depending on authentication and onboarding state:

### Shell A — Minimal (no navigation)
Used for: `/register`, `/onboarding/*`

- No bottom navigation bar
- No persistent header
- Full-screen flow — the page owns the entire viewport
- Applies to users who are unauthenticated or mid-onboarding

### Shell B — App shell (with navigation)
Used for: `/`, `/workouts`, `/body`, `/check-in`, `/profile`

- Bottom navigation bar with 5 tabs
- Each tab shows an icon and a label
- Active tab is visually highlighted
- Navigation is fixed to the bottom of the viewport, always visible
- Safe area insets respected (for iOS home indicator)

---

## Routing & Middleware Behaviour

The existing `onboarding` middleware already handles redirects:

| State | Redirect |
|---|---|
| Not authenticated | `/register` |
| Authenticated, onboarding incomplete | `/onboarding/goals` or appropriate step |
| Authenticated, onboarding complete | `/` (home) |

The navigation bar must only be rendered when the athlete is authenticated **and** onboarding is complete. It must not appear on register or onboarding pages.

---

## Navigation Tabs

Five tabs in order, left to right:

| Tab | Route | Icon (Heroicons) |
|---|---|---|
| Home | `/` | `home` |
| Workouts | `/workouts` | `bolt` |
| Body | `/body` | `user` |
| Check in | `/check-in` | `clipboard-document-check` |
| Profile | `/profile` | `user-circle` |

---

## Implementation Plan

### 1. Layouts

Create two Nuxt layouts:

**`app/layouts/minimal.vue`**
- Wraps `<NuxtPage />` with no navigation chrome
- Used by register and all onboarding pages

**`app/layouts/app.vue`**
- Wraps `<NuxtPage />` with the bottom navigation bar
- Used by all main app pages (home, workouts, body, check-in, profile)

Each page declares its layout via `definePageMeta({ layout: 'app' })` or `definePageMeta({ layout: 'minimal' })`.

### 2. Bottom Navigation Component

**`app/components/BottomNav.vue`**

- Renders 5 tab items using Nuxt UI primitives + Tailwind
- Uses `useRoute()` to determine the active tab
- Each item is a `<NuxtLink>` with icon + label
- Fixed positioning at bottom, full viewport width
- `pb-safe` or equivalent padding for iOS safe area

### 3. Pages (stubs)

Create stub pages for all main app routes. Each page just displays its name until the feature is built.

| File | Route | Displays |
|---|---|---|
| `app/pages/index.vue` | `/` | "Home" |
| `app/pages/workouts.vue` | `/workouts` | "Workouts" |
| `app/pages/body.vue` | `/body` | "Body" |
| `app/pages/check-in.vue` | `/check-in` | "Check in" |
| `app/pages/profile.vue` | `/profile` | "Profile" |

`index.vue` already exists — update it to show "Home" and use the `app` layout.

### 4. Update `app/app.vue`

Remove the `UHeader` — navigation is now handled per-layout. `app.vue` should be a minimal wrapper:

```vue
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

### 5. Assign layouts to existing pages

Update `definePageMeta` in:
- `app/pages/register.vue` → `layout: 'minimal'`
- `app/pages/onboarding/goals.vue` → `layout: 'minimal'`
- `app/pages/onboarding/goals-review.vue` → `layout: 'minimal'`
- `app/pages/onboarding/injuries.vue` → `layout: 'minimal'`
- `app/pages/onboarding/injuries-review.vue` → `layout: 'minimal'`

---

## Acceptance Criteria

- [ ] Unauthenticated users see no navigation on `/register`
- [ ] Mid-onboarding users see no navigation on any `/onboarding/*` page
- [ ] Authenticated + onboarded users see the bottom navigation bar on all 5 main pages
- [ ] Active tab is visually distinct from inactive tabs
- [ ] Tapping each tab navigates to the correct route
- [ ] Navigation bar does not overlap page content (correct bottom padding)
- [ ] On iOS, the navigation bar respects the home indicator safe area
- [ ] All 5 stub pages render their page name
