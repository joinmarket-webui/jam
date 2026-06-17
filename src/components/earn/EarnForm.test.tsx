import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EarnForm } from './EarnForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/ui/jam/CurrencySymbol', () => ({
  SatSymbol: (props: Record<string, unknown>) => <span {...props}>sat-symbol</span>,
}))

vi.mock('../dev/DevBadge', () => ({
  DevBadge: ({ className }: { className?: string }) => <span className={className}>dev-badge</span>,
}))

describe('EarnForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  })

  it('submits the default absolute-fee offer values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EarnForm isWaitingMakerStart={false} offerMinsizeMax={100_000_000} onSubmit={onSubmit} />)

    expect(screen.getByLabelText('earn.label_abs_fee')).toBeInTheDocument()
    expect(screen.getByLabelText('earn.label_min_amount_input')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          offerAbsoluteFee: expect.any(Number) as number,
          offerMinAmount: expect.any(Number) as number,
          offerType: 'sw0absoffer',
        }),
        expect.anything(),
      )
    })
  })

  it('switches to relative fees and submits the edited values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EarnForm isWaitingMakerStart={false} offerMinsizeMax={100_000_000} onSubmit={onSubmit} />)

    await user.click(screen.getByLabelText('earn.radio_rel_offer_label'))
    await user.clear(screen.getByLabelText('earn.label_rel_fee'))
    await user.type(screen.getByLabelText('earn.label_rel_fee'), '0.5')
    await user.clear(screen.getByLabelText('earn.label_min_amount_input'))
    await user.type(screen.getByLabelText('earn.label_min_amount_input'), '50000')
    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          offerMinAmount: 50_000,
          offerRelativeFeeInPercent: 0.5,
          offerType: 'sw0reloffer',
        }),
        expect.anything(),
      )
    })
  })

  it('shows validation feedback when the minimum amount exceeds available funds', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EarnForm isWaitingMakerStart={false} offerMinsizeMax={1} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    expect(await screen.findByText('earn.feedback_invalid_min_amount_insufficient_funds')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders waiting and debug state', async () => {
    // wrap in async act so react-hook-form's deferred mount validation settles
    // inside act (otherwise it updates formState after the test → act warning)
    await act(async () => {
      render(<EarnForm debug disabled isWaitingMakerStart={true} offerMinsizeMax={100_000_000} onSubmit={vi.fn()} />)
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: /earn.text_starting/ })).toBeDisabled()
    expect(screen.getByText('dev-badge')).toBeInTheDocument()
    expect(screen.getByText('isValid:')).toBeInTheDocument()
    expect(screen.getByText('values:')).toBeInTheDocument()
  })
})
