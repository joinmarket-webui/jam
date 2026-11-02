import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Network } from 'bitcoin-address-validation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import { SweepForm } from './SweepForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const jars = [{ jarIndex: 0 }, { jarIndex: 1 }] as unknown as Jar[]

describe('SweepForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  it('renders the scheduler options with translated labels', async () => {
    const user = userEvent.setup()

    render(<SweepForm jars={jars} addressSummary={{}} network={Network.regtest} onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'scheduler.button_add_destination' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'scheduler.scheduler_options' }))

    for (const key of [
      'scheduler.label_include_maker_sessions',
      'scheduler.description_include_maker_sessions',
      'scheduler.label_number_of_collaborators',
      'scheduler.description_number_of_collaborators',
      'scheduler.label_transactions_per_jar',
      'scheduler.description_transactions_per_jar',
      'scheduler.label_rounding_chance',
      'scheduler.description_rounding_chance',
    ]) {
      expect(screen.getByText(key)).toBeInTheDocument()
    }
  })
})
