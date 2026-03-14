export interface Coach {
  summariseGoals: (goals: string) => Promise<unknown>
  summariseInjuries: (injuries: string) => Promise<unknown>
}
