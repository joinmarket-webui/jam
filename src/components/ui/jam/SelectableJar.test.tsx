import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { beforeEach } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import { SelectableJar } from './SelectableJar'

const mocks = vi.hoisted(() => ({
  onClick: vi.fn(),
  onSelect: vi.fn(),
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString, onClick }: { valueString: string; onClick?: () => void }) => (
    <span onClick={onClick}>balance:{valueString}</span>
  ),
}))

const DUMMY_JAR: Jar = {
  balanceSummary: {
    calculatedTotalBalanceInSats: 5,
    calculatedAvailableBalanceInSats: 4,
    calculatedConfirmedAvailableBalanceInSats: 3,
    calculatedAvailableFrozenBalanceInSats: 2,
    calculatedFrozenOrLockedBalanceInSats: 1,
  },
  color: '#666',
  jarIndex: 0,
  name: 'Test jar',
  utxos: [],
}

describe('SelectableJar', () => {
  beforeEach(() => {
    mocks.onClick.mockReset()
    mocks.onSelect.mockReset()
  })

  it('renders correctly', () => {
    render(
      <SelectableJar
        name={DUMMY_JAR.name}
        color={DUMMY_JAR.color}
        totalBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats}
        availableBalance={DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats}
        frozenOrLockedBalance={DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
        totalWalletBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats + 1}
        isSelected={false}
        onSelect={mocks.onSelect}
        onClick={mocks.onClick}
      />,
    )

    expect(screen.getByText(DUMMY_JAR.name)).toBeInTheDocument()
    expect(screen.getByText('balance:' + DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats)).toBeInTheDocument()
    expect(
      screen.getByText('balance:' + DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats),
    ).toBeInTheDocument()
  })

  it('can be selected', async () => {
    const user = userEvent.setup()

    render(
      <SelectableJar
        name={DUMMY_JAR.name}
        color={DUMMY_JAR.color}
        totalBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats}
        availableBalance={DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats}
        frozenOrLockedBalance={DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
        totalWalletBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats + 1}
        isSelected={false}
        onSelect={mocks.onSelect}
        onClick={mocks.onClick}
      />,
    )

    await user.click(screen.getByRole('button'))

    expect(mocks.onClick).toHaveBeenCalled()
    expect(mocks.onSelect).toHaveBeenCalled()
  })

  it('can not be selected if disabled', async () => {
    const user = userEvent.setup()

    render(
      <SelectableJar
        name={DUMMY_JAR.name}
        color={DUMMY_JAR.color}
        totalBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats}
        availableBalance={DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats}
        frozenOrLockedBalance={DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
        totalWalletBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats + 1}
        isSelected={false}
        onSelect={mocks.onSelect}
        onClick={mocks.onClick}
        disabled={true}
      />,
    )

    await user.click(screen.getByRole('button'))

    expect(mocks.onClick).not.toHaveBeenCalled()
    expect(mocks.onSelect).not.toHaveBeenCalled()
  })

  it('does not call onSelect if already selected', async () => {
    const user = userEvent.setup()

    render(
      <SelectableJar
        name={DUMMY_JAR.name}
        color={DUMMY_JAR.color}
        totalBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats}
        availableBalance={DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats}
        frozenOrLockedBalance={DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
        totalWalletBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats + 1}
        isSelected={true}
        onSelect={mocks.onSelect}
        onClick={mocks.onClick}
        disabled={false}
      />,
    )

    await user.click(screen.getByRole('button'))

    expect(mocks.onClick).toHaveBeenCalled()
    expect(mocks.onSelect).not.toHaveBeenCalled()
  })
})
