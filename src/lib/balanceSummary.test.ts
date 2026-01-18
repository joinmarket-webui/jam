import { describe, it, expect } from 'vitest'
import type { Utxo } from '@/hooks/useUtxos'
import { toBalanceSummary } from './balanceSummary'

const now = Date.UTC(2009, 0, 3)

describe('BalanceSummary', () => {
  it('should populate balance properties calculated from utxo data', () => {
    const balanceSummary = toBalanceSummary(
      [
        {
          value: 1,
          mixdepth: 0,
          frozen: false,
        } as Utxo,
        {
          value: 2,
          mixdepth: 0,
          frozen: false,
          // unfrozen but not yet expired
          locktime: '2999-12-01 00:00:00',
          path: `m/84'/1'/0'/0/2:${now / 1_000 + 1}`,
        } as Utxo,
        {
          value: 3,
          mixdepth: 0,
          confirmations: 0,
          frozen: true,
        } as Utxo,
        {
          value: 4,
          mixdepth: 0,
          // unfrozen and expired
          frozen: false,
          locktime: '2009-01-01 00:00:00',
          path: `m/84'/1'/0'/0/2:${now / 1_000 - 1}`,
        } as Utxo,
      ],
      now,
    )

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.calculatedTotalBalanceInSats).toBe(10)
    expect(balanceSummary!.calculatedAvailableBalanceInSats).toBe(5)
    expect(balanceSummary!.calculatedFrozenOrLockedBalanceInSats).toBe(5)
  })

  it('should populate account balance data', () => {
    const balanceSummary = toBalanceSummary(
      [
        {
          value: 111111111,
          mixdepth: 1,
        } as Utxo,
        {
          value: 222222222,
          mixdepth: 2,
        } as Utxo,
        {
          value: 11111111,
          mixdepth: 2,
          frozen: true,
        } as Utxo,
        {
          value: 333333333,
          mixdepth: 3,
          confirmations: 0,
          frozen: true,
        } as Utxo,
      ],
      now,
    )

    expect(balanceSummary).not.toBeNull()
    expect(balanceSummary!.calculatedTotalBalanceInSats).toBe(677777777)
    expect(balanceSummary!.calculatedAvailableBalanceInSats).toBe(333333333)
    expect(balanceSummary!.calculatedFrozenOrLockedBalanceInSats).toBe(344444444)
  })
})
