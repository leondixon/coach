import { describe, it, expect, vi } from 'vitest'
import { createOnboarding } from './useOnboarding'

// ─── Test helpers ───

function fetchError(statusCode: number, data?: Record<string, unknown>) {
  return { statusCode, data }
}

const defaultStatus = {
  goalsConfirmed: false,
  injuriesConfirmed: false,
  experienceLevelAdded: false,
  onboardingComplete: false,
}

const confirmedStatus = {
  goalsConfirmed: true,
  injuriesConfirmed: true,
  experienceLevelAdded: true,
  onboardingComplete: true,
}

const goalsSubmittedSummary = {
  goals: 'I want to build muscle and improve my posture',
  summarisedGoals: [
    { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'shoulders'], priority: 5 },
    { description: 'Improve posture', targetAreas: ['upper-back', 'core'], priority: 3 },
  ],
  summary: 'Athlete focuses on hypertrophy with a secondary goal of postural correction.',
  status: 'confirmed',
}

const injuriesSubmittedSummary = {
  injuries: 'Mild shoulder impingement on the left side',
  summarisedInjuries: {
    affectedAreas: ['left shoulder'],
    restrictions: ['overhead press', 'upright row'],
    severity: 'mild',
    summary: 'Mild left shoulder impingement. Avoid overhead pressing movements.',
  },
  status: 'pending',
}

// ─── useOnboarding ───

describe('useOnboarding', () => {
  describe('Given the composable is initialized', () => {
    it('Then status starts with all flags false', () => {
      // Given / When
      const mockFetch = vi.fn()
      const { status } = createOnboarding({ fetch: mockFetch })

      // Then
      expect(status.value).toEqual(defaultStatus)
    })

    it('Then goalsSummary starts as undefined', () => {
      // Given / When
      const mockFetch = vi.fn()
      const { goalsSummary } = createOnboarding({ fetch: mockFetch })

      // Then
      expect(goalsSummary.value).toBeUndefined()
    })

    it('Then injuriesSummary starts as undefined', () => {
      // Given / When
      const mockFetch = vi.fn()
      const { injuriesSummary } = createOnboarding({ fetch: mockFetch })

      // Then
      expect(injuriesSummary.value).toBeUndefined()
    })

    it('Then all loading flags start as false', () => {
      // Given / When
      const mockFetch = vi.fn()
      const { isSubmittingGoals, isConfirmingGoals, isSubmittingInjuries, isConfirmingInjuries } = createOnboarding({ fetch: mockFetch })

      // Then
      expect(isSubmittingGoals.value).toBe(false)
      expect(isConfirmingGoals.value).toBe(false)
      expect(isSubmittingInjuries.value).toBe(false)
      expect(isConfirmingInjuries.value).toBe(false)
    })
  })

  describe('When fetchStatus is called', () => {
    it('Then calls GET /api/onboarding/status', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue(defaultStatus)
      const { fetchStatus } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchStatus()

      // Then
      expect(mockFetch).toHaveBeenCalledWith('/api/onboarding/status')
    })

    it('Then updates status with the API response', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue(confirmedStatus)
      const { status, fetchStatus } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchStatus()

      // Then
      expect(status.value).toEqual(confirmedStatus)
    })

    it('Then status remains at default when the API returns an error', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(500))
      const { status, fetchStatus } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchStatus()

      // Then
      expect(status.value).toEqual(defaultStatus)
    })
  })

  describe('When submitGoals is called', () => {
    it('Then calls POST /api/onboarding/goals with goals text and experience level', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { submitGoals } = createOnboarding({ fetch: mockFetch })

      // When
      await submitGoals('I want to build muscle', 'intermediate')

      // Then
      expect(mockFetch).toHaveBeenCalledWith('/api/onboarding/goals', {
        method: 'POST',
        body: { goals: 'I want to build muscle', experienceLevel: 'intermediate' },
      })
    })

    it('Then returns success when the API succeeds', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { submitGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await submitGoals('I want to build muscle', 'intermediate')

      // Then
      expect(result.success).toBe(true)
    })

    it('Then returns failure with error code when the API returns an error', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(400, { error: 'goals_required' }))
      const { submitGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await submitGoals('', 'intermediate')

      // Then
      expect(result.success).toBe(false)
      expect(result.error).toBe('goals_required')
    })

    it('Then fetches updated status after a successful submission', async () => {
      // Given
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ success: true }) // submitGoals call
        .mockResolvedValueOnce(defaultStatus)      // fetchStatus call

      const { submitGoals } = createOnboarding({ fetch: mockFetch })

      // When
      await submitGoals('I want to build muscle', 'intermediate')

      // Then
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenLastCalledWith('/api/onboarding/status')
    })

    it('Then isSubmittingGoals is true while the API call is in flight', async () => {
      // Given
      let resolveSubmit!: (value: unknown) => void
      const submitPromise = new Promise(resolve => { resolveSubmit = resolve })
      const mockFetch = vi.fn().mockReturnValue(submitPromise)
      const { submitGoals, isSubmittingGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const goalsAction = submitGoals('I want to build muscle', 'intermediate')
      expect(isSubmittingGoals.value).toBe(true)

      resolveSubmit({ success: true })
      await goalsAction

      // Then
      expect(isSubmittingGoals.value).toBe(false)
    })

    it('Then isSubmittingGoals resets to false when the API call fails', async () => {
      // Given
      let rejectSubmit!: (reason: unknown) => void
      const submitPromise = new Promise((_resolve, reject) => { rejectSubmit = reject })
      const mockFetch = vi.fn().mockReturnValue(submitPromise)
      const { submitGoals, isSubmittingGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const goalsAction = submitGoals('I want to build muscle', 'intermediate')
      expect(isSubmittingGoals.value).toBe(true)

      rejectSubmit(fetchError(500))
      await goalsAction

      // Then
      expect(isSubmittingGoals.value).toBe(false)
    })
  })

  describe('When confirmGoals is called', () => {
    it('Then calls POST /api/onboarding/goals/confirm', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { confirmGoals } = createOnboarding({ fetch: mockFetch })

      // When
      await confirmGoals()

      // Then
      expect(mockFetch).toHaveBeenCalledWith('/api/onboarding/goals/confirm', { method: 'POST' })
    })

    it('Then returns success when the API succeeds', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { confirmGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await confirmGoals()

      // Then
      expect(result.success).toBe(true)
    })

    it('Then returns failure with error code when goals summary is not ready', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(400, { error: 'goals_summary_not_ready' }))
      const { confirmGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await confirmGoals()

      // Then
      expect(result.success).toBe(false)
      expect(result.error).toBe('goals_summary_not_ready')
    })

    it('Then fetches updated status after successful confirmation', async () => {
      // Given
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ ...defaultStatus, goalsConfirmed: true })

      const { confirmGoals } = createOnboarding({ fetch: mockFetch })

      // When
      await confirmGoals()

      // Then
      expect(mockFetch).toHaveBeenLastCalledWith('/api/onboarding/status')
    })

    it('Then isConfirmingGoals is true while the API call is in flight', async () => {
      // Given
      let resolveConfirm!: (value: unknown) => void
      const confirmPromise = new Promise(resolve => { resolveConfirm = resolve })
      const mockFetch = vi.fn().mockReturnValue(confirmPromise)
      const { confirmGoals, isConfirmingGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const confirmAction = confirmGoals()
      expect(isConfirmingGoals.value).toBe(true)

      resolveConfirm({ success: true })
      await confirmAction

      // Then
      expect(isConfirmingGoals.value).toBe(false)
    })

    it('Then isConfirmingGoals resets to false when the API call fails', async () => {
      // Given
      let rejectConfirm!: (reason: unknown) => void
      const confirmPromise = new Promise((_resolve, reject) => { rejectConfirm = reject })
      const mockFetch = vi.fn().mockReturnValue(confirmPromise)
      const { confirmGoals, isConfirmingGoals } = createOnboarding({ fetch: mockFetch })

      // When
      const confirmAction = confirmGoals()
      expect(isConfirmingGoals.value).toBe(true)

      rejectConfirm(fetchError(500))
      await confirmAction

      // Then
      expect(isConfirmingGoals.value).toBe(false)
    })
  })

  describe('When submitInjuries is called', () => {
    it('Then calls POST /api/onboarding/injuries with injuries text', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { submitInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      await submitInjuries('Mild shoulder impingement on the left side')

      // Then
      expect(mockFetch).toHaveBeenCalledWith('/api/onboarding/injuries', {
        method: 'POST',
        body: { injuries: 'Mild shoulder impingement on the left side' },
      })
    })

    it('Then returns success when the API succeeds', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { submitInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await submitInjuries('Mild shoulder impingement')

      // Then
      expect(result.success).toBe(true)
    })

    it('Then returns failure with error code when the API returns an error', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(400, { error: 'injuries_required' }))
      const { submitInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await submitInjuries('')

      // Then
      expect(result.success).toBe(false)
      expect(result.error).toBe('injuries_required')
    })

    it('Then fetches updated status after a successful submission', async () => {
      // Given
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ success: true }) // submitInjuries call
        .mockResolvedValueOnce(defaultStatus)      // fetchStatus call

      const { submitInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      await submitInjuries('Mild shoulder pain')

      // Then
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenLastCalledWith('/api/onboarding/status')
    })

    it('Then isSubmittingInjuries is true while the API call is in flight', async () => {
      // Given
      let resolveSubmit!: (value: unknown) => void
      const submitPromise = new Promise(resolve => { resolveSubmit = resolve })
      const mockFetch = vi.fn().mockReturnValue(submitPromise)
      const { submitInjuries, isSubmittingInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const injuriesAction = submitInjuries('Mild shoulder pain')
      expect(isSubmittingInjuries.value).toBe(true)

      resolveSubmit({ success: true })
      await injuriesAction

      // Then
      expect(isSubmittingInjuries.value).toBe(false)
    })

    it('Then isSubmittingInjuries resets to false when the API call fails', async () => {
      // Given
      let rejectSubmit!: (reason: unknown) => void
      const submitPromise = new Promise((_resolve, reject) => { rejectSubmit = reject })
      const mockFetch = vi.fn().mockReturnValue(submitPromise)
      const { submitInjuries, isSubmittingInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const injuriesAction = submitInjuries('Mild shoulder pain')
      expect(isSubmittingInjuries.value).toBe(true)

      rejectSubmit(fetchError(500))
      await injuriesAction

      // Then
      expect(isSubmittingInjuries.value).toBe(false)
    })
  })

  describe('When confirmInjuries is called', () => {
    it('Then calls POST /api/onboarding/injuries/confirm', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { confirmInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      await confirmInjuries()

      // Then
      expect(mockFetch).toHaveBeenCalledWith('/api/onboarding/injuries/confirm', { method: 'POST' })
    })

    it('Then returns success when the API succeeds', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      const { confirmInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await confirmInjuries()

      // Then
      expect(result.success).toBe(true)
    })

    it('Then returns failure with error code when injuries summary is not ready', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(400, { error: 'injuries_summary_not_ready' }))
      const { confirmInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const result = await confirmInjuries()

      // Then
      expect(result.success).toBe(false)
      expect(result.error).toBe('injuries_summary_not_ready')
    })

    it('Then fetches updated status after successful confirmation', async () => {
      // Given
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ ...defaultStatus, injuriesConfirmed: true })

      const { confirmInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      await confirmInjuries()

      // Then
      expect(mockFetch).toHaveBeenLastCalledWith('/api/onboarding/status')
    })

    it('Then isConfirmingInjuries is true while the API call is in flight', async () => {
      // Given
      let resolveConfirm!: (value: unknown) => void
      const confirmPromise = new Promise(resolve => { resolveConfirm = resolve })
      const mockFetch = vi.fn().mockReturnValue(confirmPromise)
      const { confirmInjuries, isConfirmingInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const confirmAction = confirmInjuries()
      expect(isConfirmingInjuries.value).toBe(true)

      resolveConfirm({ success: true })
      await confirmAction

      // Then
      expect(isConfirmingInjuries.value).toBe(false)
    })

    it('Then isConfirmingInjuries resets to false when the API call fails', async () => {
      // Given
      let rejectConfirm!: (reason: unknown) => void
      const confirmPromise = new Promise((_resolve, reject) => { rejectConfirm = reject })
      const mockFetch = vi.fn().mockReturnValue(confirmPromise)
      const { confirmInjuries, isConfirmingInjuries } = createOnboarding({ fetch: mockFetch })

      // When
      const confirmAction = confirmInjuries()
      expect(isConfirmingInjuries.value).toBe(true)

      rejectConfirm(fetchError(500))
      await confirmAction

      // Then
      expect(isConfirmingInjuries.value).toBe(false)
    })
  })

  describe('When fetchGoalsSummary is called', () => {
    it('Then calls GET /api/onboarding/goals-summary', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue(goalsSubmittedSummary)
      const { fetchGoalsSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchGoalsSummary()

      // Then
      expect(mockFetch).toHaveBeenCalledWith('/api/onboarding/goals-summary')
    })

    it('Then updates goalsSummary with the API response', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue(goalsSubmittedSummary)
      const { goalsSummary, fetchGoalsSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchGoalsSummary()

      // Then
      expect(goalsSummary.value).toEqual(goalsSubmittedSummary)
    })

    it('Then goalsSummary remains undefined when athlete has not submitted goals', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(404))
      const { goalsSummary, fetchGoalsSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchGoalsSummary()

      // Then
      expect(goalsSummary.value).toBeUndefined()
    })

    it('Then goalsSummary remains undefined when the API returns an unexpected error', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(500))
      const { goalsSummary, fetchGoalsSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchGoalsSummary()

      // Then
      expect(goalsSummary.value).toBeUndefined()
    })
  })

  describe('When fetchInjuriesSummary is called', () => {
    it('Then calls GET /api/onboarding/injuries-summary', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue(injuriesSubmittedSummary)
      const { fetchInjuriesSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchInjuriesSummary()

      // Then
      expect(mockFetch).toHaveBeenCalledWith('/api/onboarding/injuries-summary')
    })

    it('Then updates injuriesSummary with the API response', async () => {
      // Given
      const mockFetch = vi.fn().mockResolvedValue(injuriesSubmittedSummary)
      const { injuriesSummary, fetchInjuriesSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchInjuriesSummary()

      // Then
      expect(injuriesSummary.value).toEqual(injuriesSubmittedSummary)
    })

    it('Then injuriesSummary remains undefined when athlete has not submitted injuries', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(404))
      const { injuriesSummary, fetchInjuriesSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchInjuriesSummary()

      // Then
      expect(injuriesSummary.value).toBeUndefined()
    })

    it('Then injuriesSummary remains undefined when the API returns an unexpected error', async () => {
      // Given
      const mockFetch = vi.fn().mockRejectedValue(fetchError(500))
      const { injuriesSummary, fetchInjuriesSummary } = createOnboarding({ fetch: mockFetch })

      // When
      await fetchInjuriesSummary()

      // Then
      expect(injuriesSummary.value).toBeUndefined()
    })
  })
})
