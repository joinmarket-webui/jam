import type { PropsWithChildren } from 'react'
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

vi.mock('@/components/ui/jam/SelectableJar', () => ({
  SelectableJar: ({ name, isSelected, onClick }: { name: string; isSelected: boolean; onClick: () => void }) => (
    <button type="button" aria-pressed={isSelected} onClick={onClick}>
      {name}
    </button>
  ),
}))

vi.mock('../dev/DevBadge', () => ({
  DevBadge: () => <span>dev</span>,
}))

vi.mock('../ui/jam/CurrencySymbol', () => ({
  SatSymbol: () => <span>sats</span>,
}))

vi.mock('../ui/card', () => ({
  Card: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
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

    await user.click(screen.getByRole('button', { name: 'One' }))
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
})
