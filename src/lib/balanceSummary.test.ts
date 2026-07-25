import { describe, it, expect } from 'vitest'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { toBalanceSummary } from './balanceSummary'

const now = Date.UTC(2009, 0, 3)

describe('BalanceSummary', () => {
  it('should calculate balances from utxo data', () => {
    const balanceSummary = toBalanceSummary(
      [
        {
          value: 1,
          mixdepth: 0,
          confirmations: 1,
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
          value: 5,
          mixdepth: 0,
          confirmations: 0,
          // unfrozen and expired
          frozen: false,
          locktime: '2009-01-01 00:00:00',
          path: `m/84'/1'/0'/0/2:${now / 1_000 - 1}`,
        } as Utxo,
      ],
      now,
    )
    expect(balanceSummary).toEqual({
      calculatedTotalBalanceInSats: 11,
      calculatedAvailableBalanceInSats: 6,
      calculatedConfirmedAvailableBalanceInSats: 1,
      calculatedFrozenOrLockedBalanceInSats: 5,
      calculatedFidelityBondBalanceInSats: 7,
    })
  })

  it('should calculate balances from utxo data (bondless)', () => {
    const balanceSummary = toBalanceSummary(
      [
        {
          value: 111111111,
          mixdepth: 1,
          confirmations: 1,
        } as Utxo,
        {
          value: 222222222,
          mixdepth: 2,
          confirmations: 0,
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
        {
          value: 0,
          mixdepth: 4,
          confirmations: 1,
          frozen: true,
        } as Utxo,
      ],
      now,
    )

    expect(balanceSummary).toEqual({
      calculatedTotalBalanceInSats: 677777777,
      calculatedAvailableBalanceInSats: 333333333,
      calculatedConfirmedAvailableBalanceInSats: 111111111,
      calculatedFrozenOrLockedBalanceInSats: 344444444,
      calculatedFidelityBondBalanceInSats: 0,
    })
  })

  it('should calculate balances from utxo data (bonds only)', () => {
    const balanceSummary = toBalanceSummary(
      [
        {
          value: 1,
          mixdepth: 0,
          confirmations: 1,
          frozen: true,
          // frozen and not yet expired
          locktime: '2999-12-01 00:00:00',
          path: `m/84'/1'/0'/0/2:${now / 1_000 + 1}`,
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
          confirmations: 1,
          // frozen and expired
          frozen: true,
          locktime: '2009-01-01 00:00:00',
          path: `m/84'/1'/0'/0/2:${now / 1_000 - 1}`,
        } as Utxo,
        {
          value: 5,
          mixdepth: 0,
          confirmations: 0,
          // unfrozen and expired
          frozen: false,
          locktime: '2009-01-01 00:00:00',
          path: `m/84'/1'/0'/0/2:${now / 1_000 - 1}`,
        } as Utxo,
      ],
      now,
    )

    expect(balanceSummary).toEqual({
      calculatedTotalBalanceInSats: 11,
      calculatedAvailableBalanceInSats: 5,
      calculatedConfirmedAvailableBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 6,
      calculatedFidelityBondBalanceInSats: 11,
    })
  })
})
