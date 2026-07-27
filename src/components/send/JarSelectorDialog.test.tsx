import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { BalanceSummary } from '@/lib/balanceSummary'
import JarSelectorDialog from './JarSelectorDialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../ui/jam/SelectableJar', () => ({
  SelectableJar: ({
    name,
    onClick,
    disabled,
    isSelected,
  }: {
    name?: string
    onClick?: () => void
    disabled?: boolean
    isSelected?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-selected={isSelected}>
      {name}
    </button>
  ),
}))

vi.mock('../ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }))

const jars = [
  {
    jarIndex: 0,
    name: 'Jar 0',
    color: '#000',
    balanceSummary: {
      calculatedTotalBalanceInSats: 5000,
      calculatedAvailableBalanceInSats: 5000,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
  },
  {
    jarIndex: 1,
    name: 'Jar 1',
    color: '#111',
    balanceSummary: {
      calculatedTotalBalanceInSats: 0,
      calculatedAvailableBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
    },
  },
] as unknown as Jar[]

const walletBalanceSummary = { calculatedTotalBalanceInSats: 5000 } as unknown as BalanceSummary

const renderDialog = (overrides?: {
  onConfirm?: (jar: number) => Promise<void>
  onOpenChange?: (o: boolean) => void
  subtitle?: string
}) =>
  render(
    <JarSelectorDialog
      open
      onOpenChange={overrides?.onOpenChange ?? vi.fn()}
      title="Pick a jar"
      subtitle={overrides?.subtitle}
      jars={jars}
      disabledJars={[jars[1]]}
      walletBalanceSummary={walletBalanceSummary}
      onConfirm={overrides?.onConfirm ?? vi.fn().mockResolvedValue(undefined)}
    />,
  )

describe('JarSelectorDialog', () => {
  it('renders the jars and an optional subtitle', () => {
    renderDialog({ subtitle: 'choose wisely' })
    expect(screen.getByText('Pick a jar')).toBeInTheDocument()
    expect(screen.getByText('choose wisely')).toBeInTheDocument()
    expect(screen.getByText('Jar 0')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <JarSelectorDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Pick a jar"
        jars={jars}
        disabledJars={[]}
        walletBalanceSummary={walletBalanceSummary}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.queryByText('Pick a jar')).not.toBeInTheDocument()
  })

  it('disables the confirm button until a jar is selected', async () => {
    renderDialog()
    const confirm = screen.getByRole('button', { name: 'modal.confirm_button_accept' })
    expect(confirm).toBeDisabled()
    fireEvent.click(screen.getByText('Jar 0'))
    await waitFor(() => expect(confirm).not.toBeDisabled())
  })

  it('confirms the selected jar', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onConfirm })
    fireEvent.click(screen.getByText('Jar 0'))
    const confirm = screen.getByRole('button', { name: 'modal.confirm_button_accept' })
    await waitFor(() => expect(confirm).not.toBeDisabled())
    fireEvent.click(confirm)
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(0))
    await waitFor(() => expect(confirm).toBeDisabled())
  })

  it('closes and resets via the reject button', () => {
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    fireEvent.click(screen.getByText('modal.confirm_button_reject'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does nothing when confirm is clicked with no selection', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onConfirm })
    fireEvent.click(screen.getByText('modal.confirm_button_accept'))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
