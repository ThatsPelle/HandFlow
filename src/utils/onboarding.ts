export const ONBOARDING_STORAGE_KEY = 'handflow.onboarding.v1'

export type OnboardingStepId = 'camera' | 'pointer' | 'run'

export interface OnboardingStep {
  body: string
  id: OnboardingStepId
  title: string
}

export function shouldShowOnboarding(storedValue: string | null) {
  return storedValue !== 'done'
}

export function readOnboardingFlag(storage: Pick<Storage, 'getItem'> | null) {
  return storage?.getItem(ONBOARDING_STORAGE_KEY) ?? null
}

export function writeOnboardingFlag(storage: Pick<Storage, 'setItem'> | null) {
  storage?.setItem(ONBOARDING_STORAGE_KEY, 'done')
}
