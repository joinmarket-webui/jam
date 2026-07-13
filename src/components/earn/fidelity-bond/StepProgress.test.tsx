import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StepProgress } from './StepProgress'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('StepProgress', () => {
  it('renders correct number of steps and the step label', () => {
    const { container } = render(<StepProgress currentStep={0} totalSteps={3} />)
    const steps = container.querySelectorAll('.rounded-full')

    expect(steps).toHaveLength(3)
    expect(screen.getByText('global.step_label {"current":1,"total":3}')).toBeInTheDocument()
  })

  it('applies correct classes based on currentStep', () => {
    const { container } = render(<StepProgress currentStep={1} totalSteps={3} />)
    const steps = container.querySelectorAll('.rounded-full')

    // Step 0: completed (i < currentStep)
    expect(steps[0].className).toContain('bg-primary w-8')

    // Step 1: current (i === currentStep)
    expect(steps[1].className).toContain('bg-primary w-12')

    // Step 2: pending (i > currentStep)
    expect(steps[2].className).toContain('bg-muted w-8')
  })
})
