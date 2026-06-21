import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n/config'
import { OnboardingDialog } from './OnboardingDialog'

describe('<OnboardingDialog />', () => {
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
