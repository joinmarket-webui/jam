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
  it('submits the selected jar', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<ReceiveForm jars={jars} defaultValues={{ source: { fromJar: 0 } }} onSubmit={onSubmit} debug={true} />)

    await user.click(screen.getByRole('radio', { name: 'One' }))

    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith({ source: { fromJar: 1 } }, expect.anything()))
    expect(screen.getByRole('radio', { name: 'One' })).toBeChecked()
    expect(screen.getByText(/"fromJar": 1/u)).toBeInTheDocument()
  })

  it('has no amount input', () => {
    render(<ReceiveForm jars={jars} defaultValues={{ source: { fromJar: 0 } }} onSubmit={vi.fn()} />)

    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })
})
