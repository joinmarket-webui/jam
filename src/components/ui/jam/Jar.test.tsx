import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type Jar as JarType } from '@/context/JamWalletInfoContext'
import type { AmountSats } from '@/types/global'
import { Jar } from './Jar'

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString, onClick }: { valueString: string; onClick?: () => void }) => (
    <span onClick={onClick}>balance:{valueString}</span>
  ),
}))

const DUMMY_JAR: JarType = {
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

describe('Jar', () => {
  it('renders correctly', () => {
    render(
      <Jar
        name={DUMMY_JAR.name}
        color={DUMMY_JAR.color}
        totalBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats}
        availableBalance={DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats}
        frozenOrLockedBalance={DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
        totalWalletBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats + 1}
        isSelected={false}
      />,
    )

    expect(screen.getByText(DUMMY_JAR.name)).toBeInTheDocument()
    expect(screen.getByText('balance:' + DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats)).toBeInTheDocument()
    expect(
      screen.getByText('balance:' + DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats),
    ).toBeInTheDocument()
    expect(
      screen.getByText('balance:' + DUMMY_JAR.balanceSummary.calculatedFrozenOrLockedBalanceInSats).parentNode,
    ).not.toHaveClass('hidden')
  })
  it('does not render zero frozen balance', () => {
    const frozenBalance: AmountSats = 0

    render(
      <Jar
        name={DUMMY_JAR.name}
        color={DUMMY_JAR.color}
        frozenOrLockedBalance={frozenBalance}
        totalBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats}
        availableBalance={DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats}
        totalWalletBalance={DUMMY_JAR.balanceSummary.calculatedTotalBalanceInSats + 1}
        isSelected={false}
      />,
    )

    expect(screen.getByText(DUMMY_JAR.name)).toBeInTheDocument()
    expect(screen.getByText('balance:' + DUMMY_JAR.balanceSummary.calculatedAvailableBalanceInSats)).toBeInTheDocument()
    expect(screen.getByText('balance:' + frozenBalance)).toBeInTheDocument()
    expect(screen.getByText('balance:' + frozenBalance).parentNode).toHaveClass('hidden')
  })
})
