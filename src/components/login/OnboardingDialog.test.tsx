import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n/config'
import { OnboardingDialog } from './OnboardingDialog'

describe('<OnboardingDialog />', () => {
  it('walks through the intro and closes on the final step', async () => {
    const onOpenChange = vi.fn()
    render(<OnboardingDialog open onOpenChange={onOpenChange} />)

    expect(screen.getByRole('heading', { name: 'Jam' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(screen.getAllByRole('heading', { name: 'Welcome to Jam for JoinMarket!' })).toHaveLength(2)

    for (let index = 0; index < 4; index++) {
      await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    }

    await userEvent.click(screen.getByRole('button', { name: "Let's go!" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('can go back to the splash screen and skip the intro', async () => {
    const onOpenChange = vi.fn()
    render(<OnboardingDialog open onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Get started' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('heading', { name: 'Jam' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Skip intro' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
