import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnboardingTour } from './OnboardingTour'

describe('OnboardingTour', () => {
  it('renders first step content when onboarding is open', () => {
    render(
      <OnboardingTour
        isOpen
        onClose={vi.fn()}
        onComplete={vi.fn()}
        steps={[{ body: 'Select webcam before tracking starts.', id: 'camera', title: 'Choose camera' }]}
        targetRects={{}}
      />,
    )

    expect(screen.getByText('Choose camera')).toBeInTheDocument()
    expect(screen.getByText('Select webcam before tracking starts.')).toBeInTheDocument()
  })
})
