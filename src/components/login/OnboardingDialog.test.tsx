import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n/config'
import { OnboardingDialog } from './OnboardingDialog'

const mocks = vi.hoisted(() => ({
  backend: 'joinmarket-clientserver',
  jamInfo: undefined as { backend: { name: string; version: string } } | undefined,
}))

vi.mock('@/hooks/useQueryJamInfo', () => ({
  useQueryJamInfo: () => {
    const isJamStandalone = mocks.jamInfo !== undefined
    const backendName = isJamStandalone ? `jam-standalone (${mocks.jamInfo?.backend?.name || ''})` : mocks.backend
    return {
      backendName,
    }
  },
}))

describe('<OnboardingDialog />', () => {
  beforeEach(() => {
    mocks.backend = 'joinmarket-clientserver'
    mocks.jamInfo = undefined
  })

  it('walks through the intro and closes on the final step', () => {
    const onOpenChange = vi.fn()
    render(<OnboardingDialog open onOpenChange={onOpenChange} />)

    expect(screen.getByRole('heading', { name: 'Jam' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(screen.getAllByRole('heading', { name: 'Welcome to Jam for JoinMarket!' })).toHaveLength(2)

    for (let index = 0; index < 4; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    }

    fireEvent.click(screen.getByRole('button', { name: "Let's go!" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows the joinmarket-ng splash warning when using the native ng backend', () => {
    mocks.backend = 'joinmarket-ng'

    render(<OnboardingDialog open onOpenChange={vi.fn()} />)

    expect(screen.getByText(/JoinMarket NG backend is bleeding edge/i)).toBeInTheDocument()
  })

  it('shows the joinmarket-ng splash warning when using standalone-ng', () => {
    mocks.backend = 'joinmarket-ng'
    mocks.jamInfo = { backend: { name: 'joinmarket-ng', version: '0.33.0' } }

    render(<OnboardingDialog open onOpenChange={vi.fn()} />)

    expect(screen.getByText(/JoinMarket NG backend is bleeding edge/i)).toBeInTheDocument()
  })

  it('can go back to the splash screen and skip the intro', () => {
    const onOpenChange = vi.fn()
    render(<OnboardingDialog open onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('heading', { name: 'Jam' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Skip intro' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
