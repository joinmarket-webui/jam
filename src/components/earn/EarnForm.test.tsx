import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OFFER_FEE_ABS_DEFAULT, OFFER_MINSIZE_DEFAULT } from '@/constants/jam'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { EarnForm } from './EarnForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/dev/DevBadge', () => ({
  DevBadge: ({ className }: { className?: string }) => <span className={className}>dev-badge</span>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
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

  it('submits the default free-fee offer values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EarnForm isWaitingMakerStart={false} offerMinsizeMax={100_000_000} onSubmit={onSubmit} fidelityBonds={[]} />,
    )

    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        offerAbsoluteFee: OFFER_FEE_ABS_DEFAULT,
        offerMinAmount: OFFER_MINSIZE_DEFAULT,
        offerType: '__free',
      }),
      expect.anything(),
    )
  })

  it('verifies offer with fees cannot be submitted without Fidelity Bond', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EarnForm isWaitingMakerStart={false} offerMinsizeMax={100_000_000} onSubmit={onSubmit} fidelityBonds={[]} />,
    )

    expect(screen.queryByLabelText('earn.label_abs_fee')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('earn.radio_abs_offer_label'))

    expect(screen.getByLabelText('earn.label_abs_fee')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('earn.label_abs_fee'))
    await user.type(screen.getByLabelText('earn.label_abs_fee'), String(21))

    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    expect(await screen.findByText('earn.feedback_invalid_offer_type_bondless_maker')).toBeInTheDocument()

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('switches to absolute fees and submits the edited values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EarnForm
        isWaitingMakerStart={false}
        offerMinsizeMax={100_000_000}
        onSubmit={onSubmit}
        fidelityBonds={[
          {
            utxo: 'txid:0',
          } as unknown as Utxo,
        ]}
      />,
    )

    expect(screen.queryByLabelText('earn.label_abs_fee')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('earn.radio_abs_offer_label'))

    expect(screen.getByLabelText('earn.label_abs_fee')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('earn.label_abs_fee'))
    await user.type(screen.getByLabelText('earn.label_abs_fee'), String(21))

    await user.click(screen.getByRole('button', { name: 'earn.earn_options' }))

    await user.clear(screen.getByLabelText('earn.label_min_amount_input'))
    await user.type(screen.getByLabelText('earn.label_min_amount_input'), String(50_000))

    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        offerMinAmount: 50_000,
        offerAbsoluteFee: 21,
        offerType: 'sw0absoffer',
      }),
      expect.anything(),
    )
  })

  it('switches to relative fees and submits the edited values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EarnForm
        isWaitingMakerStart={false}
        offerMinsizeMax={100_000_000}
        onSubmit={onSubmit}
        fidelityBonds={[
          {
            utxo: 'txid:0',
          } as unknown as Utxo,
        ]}
      />,
    )

    expect(screen.queryByLabelText('earn.label_rel_fee')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('earn.radio_rel_offer_label'))

    expect(screen.getByLabelText('earn.label_rel_fee')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('earn.label_rel_fee'))
    await user.type(screen.getByLabelText('earn.label_rel_fee'), String(0.5))

    await user.click(screen.getByRole('button', { name: 'earn.earn_options' }))

    await user.clear(screen.getByLabelText('earn.label_min_amount_input'))
    await user.type(screen.getByLabelText('earn.label_min_amount_input'), String(50_000))

    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        offerMinAmount: 50_000,
        offerRelativeFeeInPercent: 0.5,
        offerType: 'sw0reloffer',
      }),
      expect.anything(),
    )
  })

  it('shows validation feedback when the minimum amount exceeds available funds', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<EarnForm isWaitingMakerStart={false} offerMinsizeMax={1} onSubmit={onSubmit} fidelityBonds={[]} />)

    await user.click(screen.getByRole('button', { name: 'earn.earn_options' }))

    await user.click(screen.getByRole('button', { name: 'earn.button_start' }))

    expect(await screen.findByText('earn.feedback_invalid_min_amount_insufficient_funds')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders waiting state', async () => {
    // wrap in async act so react-hook-form's deferred mount validation settles
    // inside act (otherwise it updates formState after the test → act warning)
    await act(async () => {
      render(
        <EarnForm isWaitingMakerStart={true} offerMinsizeMax={100_000_000} onSubmit={vi.fn()} fidelityBonds={[]} />,
      )
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: /earn.text_starting/ })).toBeDisabled()
  })

  it('renders disabled state', async () => {
    // wrap in async act so react-hook-form's deferred mount validation settles
    // inside act (otherwise it updates formState after the test → act warning)
    await act(async () => {
      render(
        <EarnForm
          disabled
          isWaitingMakerStart={false}
          offerMinsizeMax={100_000_000}
          onSubmit={vi.fn()}
          fidelityBonds={[]}
        />,
      )
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: 'earn.button_start' })).toBeDisabled()
  })
})
