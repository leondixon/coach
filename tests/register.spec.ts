import { expect, test } from '@playwright/test'

// ─── Helpers ───

async function mockUnauthenticated(page: import('@playwright/test').Page) {
  await page.route('**/api/_auth/session', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  )
}

async function mockAuthenticated(page: import('@playwright/test').Page, onboardingStatus = {
  goalsConfirmed: false,
  injuriesConfirmed: false,
  experienceLevelAdded: false,
  onboardingComplete: false,
}) {
  await page.route('**/api/_auth/session', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'test-user' } }) }),
  )
  await page.route('**/api/onboarding/status', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(onboardingStatus) }),
  )
}

async function fillRegistrationForm(page: import('@playwright/test').Page, overrides: {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
} = {}) {
  await page.getByLabel('First name').fill(overrides.firstName ?? 'Ada')
  await page.getByLabel('Last name').fill(overrides.lastName ?? 'Lovelace')
  await page.getByLabel('Email').fill(overrides.email ?? 'ada@example.com')
  await page.getByLabel('Password').fill(overrides.password ?? 'SecureP@ss1')
}

// ─── Registration flow ───

test.describe('Registration', () => {
  test.describe('Given a new user with valid details', () => {
    test('When they submit the form, then they are redirected to the goals step', async ({ page }) => {
      // Session starts unauthenticated so middleware allows /register.
      // After registration the server would set a session cookie — we simulate
      // that by switching the session mock to return authenticated so the
      // onboarding middleware allows /onboarding/goals.
      let registered = false

      await page.route('**/api/_auth/session', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(registered ? { user: { id: 'test-user' } } : {}),
        }),
      )
      await page.route('**/api/auth/register', async route => {
        registered = true
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ accountId: '01JNQP2V3K4M5N6R7S8T9WXYZ0' }) })
      })
      await page.route('**/api/onboarding/status', route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ goalsConfirmed: false, injuriesConfirmed: false, experienceLevelAdded: false, onboardingComplete: false }),
        }),
      )

      await page.goto('/register')
      await fillRegistrationForm(page)
      await page.getByRole('button', { name: 'Create account' }).click()

      await expect(page).toHaveURL('/onboarding/goals')
    })
  })

  test.describe('Given an email address already registered', () => {
    test('When they submit the form, then they see an email-already-exists error', async ({ page }) => {
      await mockUnauthenticated(page)
      await page.route('**/api/auth/register', route =>
        route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'email_already_taken' }) }),
      )

      await page.goto('/register')
      await fillRegistrationForm(page)
      await page.getByRole('button', { name: 'Create account' }).click()

      await expect(page.getByText('An account with this email already exists.')).toBeVisible()
      await expect(page).toHaveURL('/register')
    })
  })

  test.describe('Given invalid form data', () => {
    test('When they submit the form, then they see a validation error', async ({ page }) => {
      await mockUnauthenticated(page)
      await page.route('**/api/auth/register', route =>
        route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'validation_failed' }) }),
      )

      await page.goto('/register')
      await fillRegistrationForm(page)
      await page.getByRole('button', { name: 'Create account' }).click()

      await expect(page.getByText('Please check all fields and try again.')).toBeVisible()
      await expect(page).toHaveURL('/register')
    })
  })

  test.describe('Given the page loads', () => {
    test('Then all registration fields are visible', async ({ page }) => {
      await mockUnauthenticated(page)

      await page.goto('/register')

      await expect(page.getByLabel('First name')).toBeVisible()
      await expect(page.getByLabel('Last name')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    })
  })
})
