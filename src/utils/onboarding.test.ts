import { describe, expect, it } from 'vitest'
import { readOnboardingFlag, shouldShowOnboarding, writeOnboardingFlag } from './onboarding'

describe('onboarding persistence', () => {
  it('shows onboarding when no completion flag exists', () => {
    expect(shouldShowOnboarding(null)).toBe(true)
  })

  it('hides onboarding after completion flag is stored', () => {
    expect(shouldShowOnboarding('done')).toBe(false)
  })

  it('reads and writes onboarding completion with storage', () => {
    const storage = new Map<string, string>()
    const adapter = {
      getItem(key: string) {
        return storage.get(key) ?? null
      },
      setItem(key: string, value: string) {
        storage.set(key, value)
      },
    }

    expect(readOnboardingFlag(adapter)).toBeNull()
    writeOnboardingFlag(adapter)
    expect(readOnboardingFlag(adapter)).toBe('done')
  })
})
