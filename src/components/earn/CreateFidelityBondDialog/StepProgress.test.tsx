import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StepProgress } from './StepProgress'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('StepProgress', () => {
  it('renders correct number of steps', () => {
    const { container } = render(<StepProgress currentStep={0} totalSteps={3} />)
    const steps = container.firstChild?.childNodes

    expect(steps).toHaveLength(3)
  })

  it('applies correct classes based on currentStep', () => {
    const { container } = render(<StepProgress currentStep={1} totalSteps={3} />)
    const steps = container.firstChild?.childNodes as NodeListOf<HTMLElement>

    // Step 0: completed (i < currentStep)
    expect(steps[0].className).toContain('bg-primary w-8')

    // Step 1: current (i === currentStep)
    expect(steps[1].className).toContain('bg-primary w-12')

    // Step 2: pending (i > currentStep)
    expect(steps[2].className).toContain('bg-muted w-8')
  })
})
