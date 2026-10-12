import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import { ReceiveForm } from './ReceiveForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useWalletBalanceSummary: () => ({
    walletBalanceSummary: {
      calculatedTotalBalanceInSats: 20_000,
    },
  }),
}))

// like the real component, selecting a jar changes a radio input (and therefore emits a form `change` event)
vi.mock('@/components/ui/jam/SelectableJar', () => ({
  SelectableJar: ({ name, isSelected, onSelect }: { name: string; isSelected: boolean; onSelect: () => void }) => (
    <input type="radio" aria-label={name} checked={isSelected} onChange={onSelect} />
  ),
}))

const jars = [
  {
    jarIndex: 0,
    name: 'Zero',
    color: '#e2b86a',
    balanceSummary: {
      calculatedTotalBalanceInSats: 10_000,
      calculatedAvailableBalanceInSats: 9_000,
      calculatedFrozenOrLockedBalanceInSats: 1_000,
    },
  },
  {
    jarIndex: 1,
    name: 'One',
    color: '#3b5ba9',
    balanceSummary: {
      calculatedTotalBalanceInSats: 10_000,
      calculatedAvailableBalanceInSats: 8_000,
      calculatedFrozenOrLockedBalanceInSats: 2_000,
    },
  },
] as unknown as Jar[]

describe('ReceiveForm', () => {
  it('submits selected jar and amount changes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ReceiveForm
        jars={jars}
        defaultValues={{ source: { fromJar: 0 }, amount: undefined }}
        onSubmit={onSubmit}
        debug={true}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'One' }))
    await user.type(screen.getByLabelText('receive.label_amount_input'), '2100')

    await waitFor(() =>
      expect(onSubmit).toHaveBeenLastCalledWith(
        expect.objectContaining({
          source: { fromJar: 1 },
          amount: 2100,
        }),
        expect.anything(),
      ),
    )
    expect(screen.getByText(/"fromJar": 1/u)).toBeInTheDocument()
  })

  it('shows validation feedback for invalid amounts', async () => {
    const user = userEvent.setup()

    render(<ReceiveForm jars={jars} defaultValues={{ source: { fromJar: 0 } }} onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('receive.label_amount_input'), '0')

    expect(await screen.findByText('receive.feedback_invalid_amount')).toBeInTheDocument()
  })

  it.each(['2100.5', '0.001'])('shows validation feedback for non-integer amount %s', async (value) => {
    const user = userEvent.setup()

    render(<ReceiveForm jars={jars} defaultValues={{ source: { fromJar: 0 } }} onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('receive.label_amount_input'), value)

    expect(await screen.findByText('receive.feedback_invalid_amount')).toBeInTheDocument()
  })

  it('submits no amount once a previously valid amount becomes invalid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ReceiveForm jars={jars} defaultValues={{ source: { fromJar: 0 }, amount: undefined }} onSubmit={onSubmit} />,
    )

    const amountInput = screen.getByLabelText('receive.label_amount_input')
    await user.type(amountInput, '2100')
    expect(onSubmit).toHaveBeenLastCalledWith({ source: { fromJar: 0 }, amount: 2100 }, expect.anything())

    await user.type(amountInput, '.5')

    expect(await screen.findByText('receive.feedback_invalid_amount')).toBeInTheDocument()
    expect(onSubmit).toHaveBeenLastCalledWith({ source: { fromJar: 0 }, amount: undefined }, expect.anything())
  })

  it('submits the selected jar while the amount is invalid', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ReceiveForm jars={jars} defaultValues={{ source: { fromJar: 0 }, amount: undefined }} onSubmit={onSubmit} />,
    )

    await user.type(screen.getByLabelText('receive.label_amount_input'), '0')
    expect(await screen.findByText('receive.feedback_invalid_amount')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'One' }))

    expect(screen.getByRole('radio', { name: 'One' })).toBeChecked()
    expect(onSubmit).toHaveBeenLastCalledWith({ source: { fromJar: 1 }, amount: undefined }, expect.anything())
  })

  it('submits no amount for an empty input', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ReceiveForm jars={jars} defaultValues={{ source: { fromJar: 0 }, amount: undefined }} onSubmit={onSubmit} />,
    )

    const amountInput = screen.getByLabelText('receive.label_amount_input')
    await user.type(amountInput, '21')
    await user.clear(amountInput)

    expect(onSubmit).toHaveBeenLastCalledWith({ source: { fromJar: 0 }, amount: null }, expect.anything())
    expect(screen.queryByText('receive.feedback_invalid_amount')).not.toBeInTheDocument()
  })
})
