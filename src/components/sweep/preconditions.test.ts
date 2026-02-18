import { describe, expect, it } from 'vitest'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { buildSweepPreconditionSummary } from './preconditions'

const utxo = (overrides: Partial<Utxo>): Utxo => {
  return {
    utxo: 'txid:0',
    address: 'bc1qexampleaddress000000000000000000000000000',
    path: "m/84'/0'/0'/0/0",
    label: '',
    value: 100_000,
    tries: 0,
    tries_remaining: 3,
    external: false,
    mixdepth: 0,
    confirmations: 6,
    frozen: false,
    locktime: undefined,
    ...overrides,
  } as Utxo
}

describe('buildSweepPreconditionSummary', () => {
  it('returns fulfilled when at least one eligible utxo is available', () => {
    const summary = buildSweepPreconditionSummary([utxo({})])

    expect(summary.isFulfilled).toBe(true)
    expect(summary.numberOfMissingUtxos).toBe(0)
    expect(summary.numberOfMissingConfirmations).toBe(0)
    expect(summary.retryLockedUtxos).toHaveLength(0)
  })

  it('reports missing confirmations when all eligible utxos are too new', () => {
    const summary = buildSweepPreconditionSummary([utxo({ confirmations: 2 })], { minConfirmations: 5 })

    expect(summary.isFulfilled).toBe(false)
    expect(summary.numberOfMissingUtxos).toBe(0)
    expect(summary.numberOfMissingConfirmations).toBe(3)
  })

  it('reports retry-locked utxos when one jar has no retries left', () => {
    const summary = buildSweepPreconditionSummary([
      utxo({ utxo: 'a:0', mixdepth: 0, tries_remaining: 0 }),
      utxo({ utxo: 'b:0', mixdepth: 0, tries_remaining: 0 }),
      utxo({ utxo: 'c:0', mixdepth: 1, tries_remaining: 1 }),
    ])

    expect(summary.isFulfilled).toBe(false)
    expect(summary.retryLockedUtxos.map((it) => it.utxo)).toEqual(['a:0', 'b:0'])
  })

  it('ignores frozen or timelocked utxos when counting eligibility', () => {
    const summary = buildSweepPreconditionSummary([
      utxo({ utxo: 'a:0', frozen: true }),
      utxo({
        utxo: 'b:0',
        locktime: '2999-01-01 00:00:00',
        path: "m/84'/0'/0'/0/0:32503680000",
      }),
    ])

    expect(summary.isFulfilled).toBe(false)
    expect(summary.numberOfMissingUtxos).toBe(1)
    expect(summary.numberOfMissingConfirmations).toBe(0)
  })
})
