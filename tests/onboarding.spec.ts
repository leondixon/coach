import { expect, test } from '@playwright/test'

// ─── Auth/middleware helpers ───

async function mockAuthenticatedWithStatus(
  page: import('@playwright/test').Page,
  onboardingStatus: {
    goalsConfirmed: boolean
    injuriesConfirmed: boolean
    experienceLevelAdded: boolean
    onboardingComplete: boolean
  },
) {
  await page.route('**/api/_auth/session', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'test-user' } }) }),
  )
  await page.route('**/api/onboarding/status', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(onboardingStatus) }),
  )
}

// ─── Shared API fixtures ───

const goalsSummaryReady = {
  status: 'confirmed',
  goals: 'I want to build muscle',
  summary: 'Focus on hypertrophy training with progressive overload.',
  summarisedGoals: [
    {
      description: 'Build muscle mass through hypertrophy training',
      targetAreas: ['chest', 'back', 'legs'],
      priority: 1,
    },
  ],
}

const injuriesSummaryReady = {
  status: 'confirmed',
  injuries: 'I have mild lower back pain',
  summarisedInjuries: {
    summary: 'Mild lower back pain requiring careful exercise selection.',
    severity: 'mild',
    affectedAreas: ['lower back'],
    restrictions: ['avoid heavy deadlifts'],
  },
}

// ─── Full onboarding flow ───

test.describe('Onboarding', () => {
  test.describe('Given a new user completing the full onboarding flow', () => {
    test('When they submit goals, review the summary, submit injuries and confirm, then they land on home', async ({ page }) => {
      // Track onboarding state so the middleware sees the right status at each step
      const status = { goalsConfirmed: false, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false }

      await page.route('**/api/_auth/session', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'test-user' } }) }),
      )
      await page.route('**/api/onboarding/status', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...status }) }),
      )
      await page.route('**/api/onboarding/goals', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }),
      )
      await page.route('**/api/onboarding/goals-summary', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(goalsSummaryReady) }),
      )
      await page.route('**/api/onboarding/goals/confirm', async route => {
        status.goalsConfirmed = true
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
      })
      await page.route('**/api/onboarding/injuries', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }),
      )
      await page.route('**/api/onboarding/injuries-summary', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(injuriesSummaryReady) }),
      )
      await page.route('**/api/onboarding/injuries/confirm', async route => {
        status.injuriesConfirmed = true
        status.onboardingComplete = true
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
      })

      // Step 1: Submit goals
      await page.goto('/onboarding/goals')
      await page.getByLabel('Your goals').fill('I want to build muscle and improve my cardiovascular health')
      await page.getByRole('button', { name: 'Submit goals' }).click()
      await expect(page).toHaveURL('/onboarding/goals-review')

      // Step 2: AI summary is displayed, user confirms
      await expect(page.getByText('Focus on hypertrophy training with progressive overload.')).toBeVisible()
      await page.getByRole('button', { name: 'Confirm' }).click()
      await expect(page).toHaveURL('/onboarding/injuries')

      // Step 3: Submit injuries
      await page.getByLabel('Injuries and limitations').fill('I have mild lower back pain')
      await page.getByRole('button', { name: 'Submit injuries' }).click()
      await expect(page).toHaveURL('/onboarding/injuries-review')

      // Step 4: AI injury summary is displayed, user confirms
      await expect(page.getByText('Mild lower back pain requiring careful exercise selection.')).toBeVisible()
      await page.getByRole('button', { name: 'Confirm and complete onboarding' }).click()
      await expect(page).toHaveURL('/home')
    })
  })

  // ─── Goals step ───

  test.describe('Given a user who submits goals with no text', () => {
    test('When they submit the empty form, then they see a validation error', async ({ page }) => {
      await mockAuthenticatedWithStatus(page, { goalsConfirmed: false, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false })
      await page.route('**/api/onboarding/goals', route =>
        route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'goals_required' }) }),
      )

      await page.goto('/onboarding/goals')
      await page.getByRole('button', { name: 'Submit goals' }).click()

      await expect(page.getByText('Please describe your fitness goals.')).toBeVisible()
      await expect(page).toHaveURL('/onboarding/goals')
    })
  })

  test.describe('Given a user whose goals were already confirmed in a previous session', () => {
    test('When they submit goals and the server returns 409, then they skip goals-review and go to injuries', async ({ page }) => {
      // The 409 means goals are already confirmed server-side. The status mock
      // starts as goalsConfirmed: false (so middleware allows /onboarding/goals),
      // then flips to true after the 409 so the middleware allows /onboarding/injuries.
      const status = { goalsConfirmed: false, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false }

      await page.route('**/api/_auth/session', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'test-user' } }) }),
      )
      await page.route('**/api/onboarding/status', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...status }) }),
      )
      await page.route('**/api/onboarding/goals', async route => {
        status.goalsConfirmed = true
        await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'goals_already_confirmed' }) })
      })

      await page.goto('/onboarding/goals')
      await page.getByLabel('Your goals').fill('I want to build muscle')
      await page.getByRole('button', { name: 'Submit goals' }).click()

      await expect(page).toHaveURL('/onboarding/injuries')
    })
  })

  // ─── Goals review step ───

  test.describe('Given a user whose AI goals summary is still processing', () => {
    test('When they land on goals-review, then they see a processing message', async ({ page }) => {
      await mockAuthenticatedWithStatus(page, { goalsConfirmed: false, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false })
      await page.route('**/api/onboarding/goals-summary', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'pending', goals: 'I want to build muscle' }),
        }),
      )

      await page.goto('/onboarding/goals-review')

      await expect(page.getByText('Your goals are being processed by our AI coach\u2026')).toBeVisible()
    })
  })

  test.describe('Given a user reviewing their goals summary', () => {
    test('When they click Back, then they return to the goals form', async ({ page }) => {
      await mockAuthenticatedWithStatus(page, { goalsConfirmed: false, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false })
      await page.route('**/api/onboarding/goals-summary', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(goalsSummaryReady) }),
      )

      await page.goto('/onboarding/goals-review')
      await expect(page.getByText('Focus on hypertrophy training with progressive overload.')).toBeVisible()
      await page.getByRole('button', { name: 'Back' }).click()

      await expect(page).toHaveURL('/onboarding/goals')
    })
  })

  // ─── Injuries step ───

  test.describe('Given a user who submits injuries with no text', () => {
    test('When they submit the empty form, then they see a validation error', async ({ page }) => {
      await mockAuthenticatedWithStatus(page, { goalsConfirmed: true, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false })
      await page.route('**/api/onboarding/injuries', route =>
        route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'injuries_required' }) }),
      )

      await page.goto('/onboarding/injuries')
      await page.getByRole('button', { name: 'Submit injuries' }).click()

      await expect(page.getByText('Please describe any injuries or write "none".')).toBeVisible()
      await expect(page).toHaveURL('/onboarding/injuries')
    })
  })

  test.describe('Given a user whose injuries were already confirmed in a previous session', () => {
    test('When they submit injuries and the server returns 409, then they skip injuries-review and land on home', async ({ page }) => {
      await mockAuthenticatedWithStatus(page, { goalsConfirmed: true, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false })
      await page.route('**/api/onboarding/injuries', route =>
        route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'injuries_already_confirmed' }) }),
      )

      await page.goto('/onboarding/injuries')
      await page.getByLabel('Injuries and limitations').fill('I have mild lower back pain')
      await page.getByRole('button', { name: 'Submit injuries' }).click()

      await expect(page).toHaveURL('/home')
    })
  })

  // ─── Injuries review step ───

  test.describe('Given a user whose AI injury summary is still processing', () => {
    test('When they land on injuries-review, then they see a processing message', async ({ page }) => {
      await mockAuthenticatedWithStatus(page, { goalsConfirmed: true, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false })
      await page.route('**/api/onboarding/injuries-summary', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'pending', injuries: 'I have mild lower back pain' }),
        }),
      )

      await page.goto('/onboarding/injuries-review')

      await expect(page.getByText('Your injury information is being processed by our AI coach\u2026')).toBeVisible()
    })
  })
})
