import { describe, it, expect, beforeEach } from 'vitest'
import type { Event } from './events/types'
import { registerAthlete } from './commands/register-athlete'
import { submitGoals } from './commands/submit-goals'
import { submitInjuries } from './commands/submit-injuries'
import { summariseGoals } from './automations/summarise-goals'
import { summariseInjuries } from './automations/summarise-injuries'
import { updateProjectionsForEvent } from './events/projection-updater'
import { generateUlid } from './utils/ulid'

// ─── In-memory infrastructure ───

function createTestEnvironment() {
  const eventStreams: Record<string, Event[]> = {}
  const projectionStore: Record<string, unknown> = {}

  const projectionStorage = {
    getItem: async (key: string) => projectionStore[key],
    setItem: async (key: string, value: unknown) => { projectionStore[key] = value },
  }

  async function appendEvent(event: Event): Promise<void> {
    const key = `${event.aggregateType}/${event.aggregateId}`
    eventStreams[key] = [...(eventStreams[key] ?? []), event]
    await updateProjectionsForEvent(event, projectionStorage)
  }

  async function loadEvents(aggregateType: string, aggregateId: string): Promise<Event[]> {
    return eventStreams[`${aggregateType}/${aggregateId}`] ?? []
  }

  const clock = () => new Date().toISOString()

  return { appendEvent, loadEvents, projectionStore, clock }
}

// ─── Mock AI providers ───

const mockCoachSummarisesGoals = async (_goals: string) => ({
  summarisedGoals: [
    { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 as const },
    { description: 'Improve posture', targetAreas: ['upper-back', 'traps'], priority: 3 as const },
  ],
  summary: 'Athlete wants to focus on hypertrophy as the primary goal with postural correction as secondary.',
})

const mockCoachSummarisesInjuries = async (_injuries: string) => ({
  affectedAreas: ['left shoulder'],
  restrictions: ['overhead press', 'behind-the-neck movements'],
  severity: 'mild' as const,
  summary: 'Mild left shoulder impingement — avoid overhead pressing movements.',
})

// ─── Integration test ───

describe('Onboarding happy path', () => {
  let env: ReturnType<typeof createTestEnvironment>

  beforeEach(() => {
    env = createTestEnvironment()
  })

  it('completes full onboarding flow and populates all projections correctly', async () => {
    const { appendEvent, loadEvents, projectionStore, clock } = env

    // Step 1: Register athlete
    const registerResult = await registerAthlete(
      {
        firstName: 'Leon',
        lastName: 'Test',
        email: 'leon@test.com',
        password: 'SecurePass1!',
      },
      {
        createCredential: async () => ({ success: true }),
        generateId: generateUlid,
        appendEvent,
        loadEvents,
        clock,
      },
    )

    expect(registerResult.success).toBe(true)
    if (!registerResult.success) return
    const { accountId } = registerResult

    // Step 2: Submit goals (also appends ExperienceLevelAdded)
    const submitGoalsResult = await submitGoals(
      { accountId, goals: 'I want to build muscle and improve my posture', experienceLevel: 'intermediate' },
      { appendEvent, loadEvents, clock },
    )
    expect(submitGoalsResult.success).toBe(true)

    // Step 3: AI automation confirms goals → appends GoalsConfirmed
    const summariseGoalsResult = await summariseGoals(accountId, {
      coachSummarisesGoals: mockCoachSummarisesGoals,
      loadEvents,
      appendEvent,
      clock,
    })
    expect(summariseGoalsResult.success).toBe(true)

    // Step 4: Submit injuries
    const submitInjuriesResult = await submitInjuries(
      { accountId, injuries: 'Mild left shoulder impingement' },
      { appendEvent, loadEvents, clock },
    )
    expect(submitInjuriesResult.success).toBe(true)

    // Step 5: AI automation confirms injuries
    // At this point GoalsConfirmed + ExperienceLevelAdded are in the stream
    // so InjuriesConfirmed completion triggers OnboardingCompleted
    const summariseInjuriesResult = await summariseInjuries(accountId, {
      coachSummarisesInjuries: mockCoachSummarisesInjuries,
      loadEvents,
      appendEvent,
      clock,
    })
    expect(summariseInjuriesResult.success).toBe(true)

    // ─── Assert AccountRegistry projection ───
    const accountRegistry = projectionStore['projections/account-registry'] as Record<string, unknown>
    expect(accountRegistry[accountId]).toMatchObject({
      accountType: 'athlete',
      email: 'leon@test.com',
      fullName: 'Leon Test',
    })

    // ─── Assert OnboardingStatus projection ───
    const onboardingStatus = projectionStore['projections/onboarding-status'] as Record<string, unknown>
    expect(onboardingStatus[accountId]).toMatchObject({
      goalsConfirmed: true,
      injuriesConfirmed: true,
      experienceLevelAdded: true,
      onboardingComplete: true,
    })

    // ─── Assert GoalsSummary projection ───
    const goalsSummary = projectionStore['projections/goals-summary'] as Record<string, unknown>
    expect(goalsSummary[accountId]).toMatchObject({
      goals: 'I want to build muscle and improve my posture',
      status: 'confirmed',
      summarisedGoals: [
        { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 },
        { description: 'Improve posture', targetAreas: ['upper-back', 'traps'], priority: 3 },
      ],
    })

    // ─── Assert InjuriesSummary projection ───
    const injuriesSummary = projectionStore['projections/injuries-summary'] as Record<string, unknown>
    expect(injuriesSummary[accountId]).toMatchObject({
      injuries: 'Mild left shoulder impingement',
      status: 'confirmed',
      summarisedInjuries: {
        affectedAreas: ['left shoulder'],
        restrictions: ['overhead press', 'behind-the-neck movements'],
        severity: 'mild',
      },
    })

    // ─── Assert AthleteCoachingProfile projection ───
    const coachingProfile = projectionStore['projections/athlete-coaching-profile'] as Record<string, unknown>
    expect(coachingProfile[accountId]).toMatchObject({
      firstName: 'Leon',
      lastName: 'Test',
      experienceLevel: 'intermediate',
      summarisedGoals: [
        { description: 'Build muscle mass', targetAreas: ['chest', 'back', 'legs'], priority: 5 },
        { description: 'Improve posture', targetAreas: ['upper-back', 'traps'], priority: 3 },
      ],
      summary: 'Athlete wants to focus on hypertrophy as the primary goal with postural correction as secondary.',
      summarisedInjuries: {
        affectedAreas: ['left shoulder'],
        restrictions: ['overhead press', 'behind-the-neck movements'],
        severity: 'mild',
        summary: 'Mild left shoulder impingement — avoid overhead pressing movements.',
      },
      onboardingComplete: true,
    })
  })

  it('OnboardingCompleted does not fire until all three prerequisites are met', async () => {
    const { appendEvent, loadEvents, projectionStore, clock } = env

    const registerResult = await registerAthlete(
      { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@test.com', password: 'SecurePass1!' },
      { createCredential: async () => ({ success: true }), generateId: generateUlid, appendEvent, loadEvents, clock },
    )
    expect(registerResult.success).toBe(true)
    if (!registerResult.success) return
    const { accountId } = registerResult

    // Submit + confirm goals (also adds ExperienceLevelAdded)
    const submitGoalsResult = await submitGoals(
      { accountId, goals: 'I want to lose weight', experienceLevel: 'beginner' },
      { appendEvent, loadEvents, clock },
    )
    expect(submitGoalsResult.success).toBe(true)
    const summariseGoalsResult = await summariseGoals(accountId, { coachSummarisesGoals: mockCoachSummarisesGoals, loadEvents, appendEvent, clock })
    expect(summariseGoalsResult.success).toBe(true)

    // At this point: GoalsConfirmed + ExperienceLevelAdded — but no InjuriesConfirmed yet
    const statusAfterGoals = projectionStore['projections/onboarding-status'] as Record<string, { onboardingComplete: boolean }>
    expect(statusAfterGoals[accountId]?.onboardingComplete).toBe(false)

    // Now submit + confirm injuries — this should trigger OnboardingCompleted
    await submitInjuries({ accountId, injuries: 'No injuries' }, { appendEvent, loadEvents, clock })
    await summariseInjuries(accountId, { coachSummarisesInjuries: mockCoachSummarisesInjuries, loadEvents, appendEvent, clock })

    const statusAfterInjuries = projectionStore['projections/onboarding-status'] as Record<string, { onboardingComplete: boolean }>
    expect(statusAfterInjuries[accountId]?.onboardingComplete).toBe(true)
  })
})
